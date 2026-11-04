-- =====================================================================
-- Revelemo-nos · Fase 4 — vitrine pública
--
--   • Busca em português que ignora acentos ("computacao" acha "computação").
--   • vitrine(): lista SÓ projetos APROVADOS, com filtros e paginação,
--     já trazendo tags e nomes dos membros (nunca e-mail).
--   • filtros_vitrine(): tags e anos que têm projeto publicado.
-- =====================================================================

create extension if not exists unaccent with schema extensions;

-- unaccent não é "immutable"; este invólucro fixa o dicionário e pode
-- ser usado em coluna gerada e índice.
create or replace function public.sem_acento(texto text)
returns text language sql immutable parallel safe strict set search_path = '' as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, texto);
$$;

alter table public.projetos
  add column busca tsvector generated always as (
       setweight(to_tsvector('portuguese', public.sem_acento(coalesce(titulo, ''))), 'A')
    || setweight(to_tsvector('portuguese', public.sem_acento(coalesce(resumo, ''))), 'B')
    || setweight(to_tsvector('portuguese', public.sem_acento(coalesce(descricao_md, ''))), 'C')
  ) stored;

create index projetos_busca_idx on public.projetos using gin (busca);
create index projetos_aprovados_idx on public.projetos (aprovado_em desc) where status = 'APROVADO';

-- ---------------------------------------------------------------------
-- Lista pública
-- ---------------------------------------------------------------------
create or replace function public.vitrine(
  p_busca  text default null,
  p_escopo public.escopo default null,
  p_tag    text default null,
  p_ano    int  default null,
  p_limite int  default 24,
  p_offset int  default 0
)
returns table (
  id uuid, slug text, titulo text, resumo text, capa_path text,
  escopos public.escopo[], ano int, aprovado_em timestamptz,
  tags jsonb, membros jsonb, total bigint
)
language sql stable security definer set search_path = '' as $$
  with consulta as (
    select case
             when nullif(trim(p_busca), '') is null then null
             else websearch_to_tsquery('portuguese', public.sem_acento(left(p_busca, 200)))
           end as q
  )
  select p.id, p.slug, p.titulo, p.resumo, p.capa_path, p.escopos, p.ano, p.aprovado_em,
         coalesce((
           select jsonb_agg(jsonb_build_object('nome', t.nome, 'slug', t.slug, 'categoria', t.categoria)
                            order by t.categoria, t.nome)
             from public.projeto_tags pt join public.tags t on t.id = pt.tag_id
            where pt.projeto_id = p.id), '[]'::jsonb),
         coalesce((
           select jsonb_agg(jsonb_build_object('nome', pr.nome, 'papel', m.papel)
                            order by m.papel, pr.nome)
             from public.projeto_membros m join public.profiles pr on pr.id = m.user_id
            where m.projeto_id = p.id), '[]'::jsonb),
         count(*) over ()
    from public.projetos p, consulta c
   where p.status = 'APROVADO'
     and (c.q is null or p.busca @@ c.q)
     and (p_escopo is null or p_escopo = any (p.escopos))
     and (p_tag is null or exists (
           select 1 from public.projeto_tags pt join public.tags t on t.id = pt.tag_id
            where pt.projeto_id = p.id and t.slug = p_tag))
     and (p_ano is null or p.ano = p_ano)
   order by case when c.q is null then 0 else ts_rank(p.busca, c.q) end desc,
            p.aprovado_em desc nulls last
   limit least(greatest(coalesce(p_limite, 24), 1), 48)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Tags e anos que aparecem em projetos publicados (para os filtros).
create or replace function public.filtros_vitrine()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tags', coalesce((
      select jsonb_agg(x order by x->>'categoria', (x->>'qtd')::int desc, x->>'nome')
        from (
          select jsonb_build_object('nome', t.nome, 'slug', t.slug, 'categoria', t.categoria, 'qtd', count(*)) as x
            from public.projeto_tags pt
            join public.tags t on t.id = pt.tag_id
            join public.projetos p on p.id = pt.projeto_id and p.status = 'APROVADO'
           group by t.id
        ) s), '[]'::jsonb),
    'anos', coalesce((
      select jsonb_agg(ano order by ano desc)
        from (select distinct ano from public.projetos where status = 'APROVADO' and ano is not null) a
      ), '[]'::jsonb),
    'total', (select count(*) from public.projetos where status = 'APROVADO')
  );
$$;

grant execute on function public.sem_acento(text) to anon, authenticated;
grant execute on function public.vitrine(text, public.escopo, text, int, int, int) to anon, authenticated;
grant execute on function public.filtros_vitrine() to anon, authenticated;
