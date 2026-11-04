-- =====================================================================
-- Revelemo-nos · grupos, sugestões de tag e edição de projetos publicados
--
--   1. Tags de grupos/equipes (categoria GRUPO).
--   2. Usuários sugerem tags; moderação aprova, junta com uma existente
--      ou recusa. Aprovada, a tag entra sozinha no projeto que pediu.
--   3. Ao editar um projeto PUBLICADO, o autor escolhe:
--        • manter no ar  → a VERSÃO APROVADA continua pública; a alteração
--                          fica guardada à parte (projeto_alteracoes) até a
--                          moderação aceitar ou recusar;
--        • tirar do ar   → volta para PENDENTE (edição normal, como antes).
--   4. Grupos ganham logo, descrição e site (editados pela moderação).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Grupos
-- ---------------------------------------------------------------------
update public.tags set categoria = 'GRUPO' where slug = 'dev-u';

insert into public.tags (nome, slug, categoria) values
  ('Asimov Jr.', 'asimov-jr', 'GRUPO'),
  ('Beyond', 'beyond', 'GRUPO'),
  ('BlackBee', 'blackbee', 'GRUPO'),
  ('Ex-Machina', 'ex-machina', 'GRUPO'),
  ('Hawksec', 'hawksec', 'GRUPO'),
  ('Uairrior', 'uairrior', 'GRUPO')
on conflict (slug) do update set categoria = excluded.categoria;

-- ---------------------------------------------------------------------
-- 2. Sugestões de tag
-- ---------------------------------------------------------------------
create or replace function public.slug_tag(nome text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select trim(both '-' from regexp_replace(
           lower(replace(replace(public.sem_acento(coalesce(nome, '')), '+', 'p'), '#', 'sharp')),
           '[^a-z0-9]+', '-', 'g'));
$$;

create type public.status_sugestao as enum ('PENDENTE', 'APROVADA', 'RECUSADA');

create table public.sugestoes_tag (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null check (char_length(nome) between 2 and 40),
  categoria    public.categoria_tag not null,
  projeto_id   uuid references public.projetos on delete set null,
  sugerido_por uuid not null references public.profiles on delete cascade,
  status       public.status_sugestao not null default 'PENDENTE',
  motivo       text check (char_length(motivo) <= 500),
  tag_id       uuid references public.tags on delete set null,
  decidido_por uuid references public.profiles on delete set null,
  created_at   timestamptz not null default now(),
  decidido_em  timestamptz
);
create index sugestoes_tag_pendentes_idx on public.sugestoes_tag (created_at) where status = 'PENDENTE';
create index sugestoes_tag_projeto_idx on public.sugestoes_tag (projeto_id);

alter table public.sugestoes_tag enable row level security;

create policy "quem sugeriu e a moderação veem"
  on public.sugestoes_tag for select to authenticated
  using (sugerido_por = auth.uid() or public.e_moderador());
-- Escrita só por sugerir_tag() / decidir_sugestao_tag().

-- Retorna {"status": "existe" | "enviada" | "ja_sugerida", "tag_id"?, "id"?}
create or replace function public.sugerir_tag(
  p_nome text, p_categoria public.categoria_tag, p_projeto uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  v_nome  text := regexp_replace(trim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_slug  text := public.slug_tag(v_nome);
  v_achou uuid;
  novo  uuid;
begin
  if uid is null then raise exception 'Não autenticado.'; end if;
  if not exists (select 1 from public.profiles where id = uid and onboarding_completo) then
    raise exception 'Conclua seu cadastro antes.';
  end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 40 or v_slug = '' then
    raise exception 'O nome da tag precisa ter entre 2 e 40 caracteres.';
  end if;
  if p_projeto is not null and not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão para editar este projeto.';
  end if;

  select t.id into v_achou from public.tags t where t.slug = v_slug;
  if v_achou is not null then
    return jsonb_build_object('status', 'existe', 'tag_id', v_achou);
  end if;

  if exists (select 1 from public.sugestoes_tag s
              where s.sugerido_por = uid and s.status = 'PENDENTE'
                and public.slug_tag(s.nome) = v_slug
                and s.projeto_id is not distinct from p_projeto) then
    return jsonb_build_object('status', 'ja_sugerida');
  end if;

  if (select count(*) from public.sugestoes_tag x where x.sugerido_por = uid and x.status = 'PENDENTE') >= 10 then
    raise exception 'Você já tem 10 sugestões aguardando a moderação.';
  end if;

  insert into public.sugestoes_tag (nome, categoria, projeto_id, sugerido_por)
  values (v_nome, p_categoria, p_projeto, uid)
  returning id into novo;

  return jsonb_build_object('status', 'enviada', 'id', novo);
end;
$$;

-- p_decisao: 'APROVAR' (cria a tag, com nome/categoria ajustáveis),
--            'MESCLAR' (usa uma tag que já existe), 'RECUSAR' (com motivo).
-- Aprovar/mesclar resolve todas as sugestões pendentes com o mesmo nome
-- e coloca a tag nos projetos que pediram (respeitando o limite de 10).
create or replace function public.decidir_sugestao_tag(
  p_sugestao uuid,
  p_decisao text,
  p_nome text default null,
  p_categoria public.categoria_tag default null,
  p_tag_existente uuid default null,
  p_motivo text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s      public.sugestoes_tag%rowtype;
  final  uuid;
  v_nome text;
  v_slug text;
  alvo   record;
begin
  if not public.e_moderador() then raise exception 'Só a moderação decide sugestões.'; end if;

  select * into s from public.sugestoes_tag where id = p_sugestao for update;
  if not found then raise exception 'Sugestão não encontrada.'; end if;
  if s.status <> 'PENDENTE' then raise exception 'Esta sugestão já foi decidida.'; end if;

  if p_decisao = 'RECUSAR' then
    update public.sugestoes_tag
       set status = 'RECUSADA', motivo = nullif(trim(p_motivo), ''),
           decidido_por = auth.uid(), decidido_em = now()
     where id = p_sugestao;
    return;
  end if;

  if p_decisao = 'MESCLAR' then
    select t.id into final from public.tags t where t.id = p_tag_existente;
    if final is null then raise exception 'Escolha a tag existente.'; end if;
  elsif p_decisao = 'APROVAR' then
    v_nome := regexp_replace(trim(coalesce(nullif(p_nome, ''), s.nome)), '\s+', ' ', 'g');
    v_slug := public.slug_tag(v_nome);
    if char_length(v_nome) < 1 or char_length(v_nome) > 40 or v_slug = '' then
      raise exception 'Nome de tag inválido.';
    end if;
    select t.id into final from public.tags t where t.slug = v_slug;
    if final is null then
      insert into public.tags (nome, slug, categoria)
      values (v_nome, v_slug, coalesce(p_categoria, s.categoria))
      returning id into final;
    end if;
  else
    raise exception 'Decisão inválida.';
  end if;

  for alvo in
    update public.sugestoes_tag x
       set status = 'APROVADA', tag_id = final, decidido_por = auth.uid(), decidido_em = now()
     where x.status = 'PENDENTE'
       and (x.id = p_sugestao or public.slug_tag(x.nome) = public.slug_tag(s.nome))
    returning x.projeto_id
  loop
    if alvo.projeto_id is not null
       and (select count(*) from public.projeto_tags where projeto_id = alvo.projeto_id) < 10 then
      insert into public.projeto_tags (projeto_id, tag_id)
      values (alvo.projeto_id, final)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

revoke execute on function public.sugerir_tag(text, public.categoria_tag, uuid) from public, anon;
revoke execute on function public.decidir_sugestao_tag(uuid, text, text, public.categoria_tag, uuid, text) from public, anon;
grant  execute on function public.sugerir_tag(text, public.categoria_tag, uuid) to authenticated;
grant  execute on function public.decidir_sugestao_tag(uuid, text, text, public.categoria_tag, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Alterações propostas em projetos publicados
--    Tabela separada: o público nunca lê o que ainda não foi revisado.
-- ---------------------------------------------------------------------
create table public.projeto_alteracoes (
  projeto_id    uuid primary key references public.projetos on delete cascade,
  dados         jsonb not null,  -- titulo, resumo, descricao_md, repo_url, demo_url, video_url, capa_path, escopos, ano
  tags          uuid[] not null default '{}',
  enviado_por   uuid references public.profiles on delete set null,
  enviado_em    timestamptz not null default now(),
  motivo_recusa text check (char_length(motivo_recusa) <= 2000),
  recusado_em   timestamptz,
  recusado_por  uuid references public.profiles on delete set null
);
create index projeto_alteracoes_fila_idx on public.projeto_alteracoes (enviado_em) where motivo_recusa is null;

alter table public.projeto_alteracoes enable row level security;

create policy "alteração visível para membros e moderação do escopo"
  on public.projeto_alteracoes for select to authenticated
  using (
       public.papel_no_projeto(projeto_id) is not null
    or public.is_superadmin()
    or exists (select 1 from public.projetos p
                where p.id = projeto_alteracoes.projeto_id and public.pode_moderar(p.escopos))
  );
-- Escrita só pelas funções abaixo.

-- Conteúdo atual (publicado) no mesmo formato de `dados`.
create or replace function public.conteudo_projeto(p_projeto uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'titulo', p.titulo, 'resumo', p.resumo, 'descricao_md', p.descricao_md,
    'repo_url', p.repo_url, 'demo_url', p.demo_url, 'video_url', p.video_url,
    'capa_path', p.capa_path, 'escopos', to_jsonb(p.escopos), 'ano', p.ano)
  from public.projetos p where p.id = p_projeto;
$$;
revoke execute on function public.conteudo_projeto(uuid) from public, anon, authenticated;

-- Aplica `dados` às colunas do projeto (usado no teste e na aceitação).
create or replace function public.aplicar_conteudo(p_projeto uuid, d jsonb)
returns void language sql security definer set search_path = '' as $$
  update public.projetos set
    titulo       = trim(d ->> 'titulo'),
    resumo       = trim(d ->> 'resumo'),
    descricao_md = nullif(d ->> 'descricao_md', ''),
    repo_url     = nullif(d ->> 'repo_url', ''),
    demo_url     = nullif(d ->> 'demo_url', ''),
    video_url    = nullif(d ->> 'video_url', ''),
    capa_path    = nullif(d ->> 'capa_path', ''),
    escopos      = array(select jsonb_array_elements_text(d -> 'escopos'))::public.escopo[],
    ano          = (d ->> 'ano')::int
  where id = p_projeto;
$$;
revoke execute on function public.aplicar_conteudo(uuid, jsonb) from public, anon, authenticated;

-- Autor propõe a nova versão de um projeto publicado (mantendo a atual no ar).
-- p_dados sem 'capa_path' mantém a capa já proposta (ou a publicada).
-- Retorna 'enviada' ou 'sem_mudancas'.
create or replace function public.propor_alteracao(p_projeto uuid, p_dados jsonb, p_tags uuid[] default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid       uuid := auth.uid();
  pr        public.projetos%rowtype;
  atual     public.projeto_alteracoes%rowtype;
  base      jsonb;
  novo      jsonb;
  tags_vivo uuid[];
  tags_novo uuid[];
  capa      text;
begin
  if not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão para editar este projeto.';
  end if;
  select * into pr from public.projetos where id = p_projeto for update;
  if pr.status <> 'APROVADO' then
    raise exception 'Só projetos publicados recebem alteração com revisão.';
  end if;

  select * into atual from public.projeto_alteracoes where projeto_id = p_projeto;
  base := coalesce(atual.dados, public.conteudo_projeto(p_projeto));
  novo := base || (coalesce(p_dados, '{}'::jsonb)
                   - array['slug', 'status', 'github_repo', 'created_by']);
  -- Normaliza ("" vira null) para comparar com a versão publicada.
  novo := jsonb_build_object(
    'titulo',       to_jsonb(trim(novo ->> 'titulo')),
    'resumo',       to_jsonb(trim(novo ->> 'resumo')),
    'descricao_md', to_jsonb(nullif(novo ->> 'descricao_md', '')),
    'repo_url',     to_jsonb(nullif(trim(novo ->> 'repo_url'), '')),
    'demo_url',     to_jsonb(nullif(trim(novo ->> 'demo_url'), '')),
    'video_url',    to_jsonb(nullif(trim(novo ->> 'video_url'), '')),
    'capa_path',    to_jsonb(nullif(novo ->> 'capa_path', '')),
    'escopos',      coalesce(novo -> 'escopos', '[]'::jsonb),
    'ano',          to_jsonb((novo ->> 'ano')::int));

  capa := nullif(novo ->> 'capa_path', '');
  if capa is distinct from pr.capa_path
     and capa is distinct from (atual.dados ->> 'capa_path')
     and capa is not null and split_part(capa, '/', 1) <> uid::text then
    raise exception 'A capa precisa ser um arquivo enviado por você.';
  end if;

  select coalesce(array_agg(tag_id order by tag_id), '{}') into tags_vivo
    from public.projeto_tags where projeto_id = p_projeto;
  if p_tags is null then
    tags_novo := coalesce(atual.tags, tags_vivo);
  else
    select coalesce(array_agg(t.id order by t.id), '{}') into tags_novo
      from public.tags t where t.id = any (p_tags);
  end if;
  if cardinality(tags_novo) > 10 then raise exception 'No máximo 10 tags.'; end if;

  -- Testa a nova versão contra as regras da tabela e desfaz em seguida.
  begin
    perform public.aplicar_conteudo(p_projeto, novo);
    raise exception using errcode = 'P0099';
  exception when sqlstate 'P0099' then null;
  end;

  if novo = public.conteudo_projeto(p_projeto) and tags_novo = tags_vivo then
    delete from public.projeto_alteracoes where projeto_id = p_projeto;
    return 'sem_mudancas';
  end if;

  insert into public.projeto_alteracoes (projeto_id, dados, tags, enviado_por, enviado_em)
  values (p_projeto, novo, tags_novo, uid, now())
  on conflict (projeto_id) do update
    set dados = excluded.dados, tags = excluded.tags, enviado_por = excluded.enviado_por,
        enviado_em = now(), motivo_recusa = null, recusado_em = null, recusado_por = null;
  return 'enviada';
end;
$$;

create or replace function public.descartar_alteracao(p_projeto uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão.';
  end if;
  delete from public.projeto_alteracoes where projeto_id = p_projeto;
end;
$$;

-- Moderação decide sobre a alteração. A versão publicada só muda se aceitar.
create or replace function public.moderar_alteracao(p_projeto uuid, p_aceitar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  pr     public.projetos%rowtype;
  alt    public.projeto_alteracoes%rowtype;
  motivo text := nullif(trim(p_motivo), '');
begin
  if auth.uid() is null then raise exception 'Não autenticado.'; end if;
  select * into pr from public.projetos where id = p_projeto for update;
  if not found then raise exception 'Projeto não encontrado.'; end if;
  if not public.pode_moderar(pr.escopos) then
    raise exception 'Você não modera os cursos deste projeto.';
  end if;
  if public.papel_no_projeto(p_projeto) is not null and not public.is_superadmin() then
    raise exception 'Você é membro deste projeto. Peça para outro moderador decidir.';
  end if;

  select * into alt from public.projeto_alteracoes where projeto_id = p_projeto for update;
  if not found or alt.motivo_recusa is not null or pr.status <> 'APROVADO' then
    raise exception 'Não há alteração aguardando decisão neste projeto.';
  end if;

  if p_aceitar then
    perform public.aplicar_conteudo(p_projeto, alt.dados);
    delete from public.projeto_tags where projeto_id = p_projeto and not (tag_id = any (alt.tags));
    insert into public.projeto_tags (projeto_id, tag_id)
    select p_projeto, t.id from public.tags t where t.id = any (alt.tags)
    on conflict do nothing;
    update public.projetos set aprovado_por = auth.uid() where id = p_projeto;
    delete from public.projeto_alteracoes where projeto_id = p_projeto;
    insert into public.moderacoes (projeto_id, moderador_id, decisao, motivo)
    values (p_projeto, auth.uid(), 'APROVADO', coalesce('Alteração aceita. ' || motivo, 'Alteração aceita.'));
  else
    if coalesce(char_length(motivo), 0) < 10 then
      raise exception 'Explique o motivo (pelo menos 10 caracteres) — é o que os autores vão ler.';
    end if;
    update public.projeto_alteracoes
       set motivo_recusa = motivo, recusado_em = now(), recusado_por = auth.uid()
     where projeto_id = p_projeto;
    insert into public.moderacoes (projeto_id, moderador_id, decisao, motivo)
    values (p_projeto, auth.uid(), 'REJEITADO', 'Alteração recusada (a versão publicada continua no ar): ' || motivo);
  end if;
end;
$$;

-- Se o projeto deixa de estar publicado (autor tirou do ar, moderação
-- despublicou), a alteração pendente perde o sentido.
create or replace function public.limpar_alteracao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'APROVADO' and new.status <> 'APROVADO' then
    delete from public.projeto_alteracoes where projeto_id = new.id;
  end if;
  return null;
end;
$$;
-- (sem "of status": o status costuma mudar dentro do trigger de guarda,
-- não na lista do UPDATE, e aí "update of status" não dispararia)
create trigger limpar_alteracao
  after update on public.projetos
  for each row
  when (old.status = 'APROVADO' and new.status <> 'APROVADO')
  execute function public.limpar_alteracao();
revoke execute on function public.limpar_alteracao() from public, anon, authenticated;

revoke execute on function public.propor_alteracao(uuid, jsonb, uuid[])       from public, anon;
revoke execute on function public.descartar_alteracao(uuid)                    from public, anon;
revoke execute on function public.moderar_alteracao(uuid, boolean, text)      from public, anon;
grant  execute on function public.propor_alteracao(uuid, jsonb, uuid[])       to authenticated;
grant  execute on function public.descartar_alteracao(uuid)                    to authenticated;
grant  execute on function public.moderar_alteracao(uuid, boolean, text)      to authenticated;

-- ---------------------------------------------------------------------
-- 4. Grupos: logo, descrição e site (só a moderação edita)
-- ---------------------------------------------------------------------
alter table public.tags
  add column logo_path text check (logo_path ~ '^grupos/[A-Za-z0-9._-]{1,120}$'),
  add column descricao text check (char_length(descricao) <= 500),
  add column site_url  text check (site_url ~ '^https://' and char_length(site_url) <= 300);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "logos: moderação envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.e_moderador());
create policy "logos: moderação altera"
  on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.e_moderador())
  with check (bucket_id = 'logos' and public.e_moderador());
create policy "logos: moderação apaga"
  on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.e_moderador());
