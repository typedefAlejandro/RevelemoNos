-- =====================================================================
-- Revelemo-nos · Fase 3 — moderação e administração
--
--   • Moderador aprova / pede ajustes nos projetos PENDENTES dos seus
--     escopos (cursos). Superadmin modera tudo.
--   • Moderador não decide sobre projeto em que é membro (conflito de
--     interesse) — só o superadmin pode.
--   • Toda decisão fica registrada em `moderacoes` (quem, quando, motivo).
--   • Superadmin nomeia moderadores, define escopos e verifica vínculos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Histórico de decisões
-- ---------------------------------------------------------------------
create table public.moderacoes (
  id           uuid primary key default gen_random_uuid(),
  projeto_id   uuid not null references public.projetos on delete cascade,
  moderador_id uuid references public.profiles on delete set null,
  decisao      public.status_projeto not null check (decisao in ('APROVADO', 'REJEITADO', 'ARQUIVADO')),
  motivo       text check (char_length(motivo) <= 2000),
  created_at   timestamptz not null default now()
);
create index moderacoes_projeto_idx on public.moderacoes (projeto_id, created_at desc);
create index moderacoes_data_idx on public.moderacoes (created_at desc);

alter table public.moderacoes enable row level security;

-- Membros veem o histórico do próprio projeto (é onde leem o motivo);
-- moderação vê o do seu escopo.
create policy "histórico para membros e moderação"
  on public.moderacoes for select to authenticated
  using (
       public.papel_no_projeto(projeto_id) is not null
    or public.is_superadmin()
    or exists (select 1 from public.projetos p
                where p.id = moderacoes.projeto_id and public.pode_moderar(p.escopos))
  );
-- Sem escrita direta: só moderar_projeto().

-- ---------------------------------------------------------------------
-- Decidir sobre um projeto
--   APROVADO / REJEITADO: projeto precisa estar PENDENTE
--   ARQUIVADO: tira do ar um projeto APROVADO
-- ---------------------------------------------------------------------
create or replace function public.moderar_projeto(
  p_projeto uuid, p_decisao public.status_projeto, p_motivo text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  pr     public.projetos%rowtype;
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

  if p_decisao in ('APROVADO', 'REJEITADO') and pr.status <> 'PENDENTE' then
    raise exception 'Só projetos aguardando aprovação podem ser aprovados ou recusados.';
  end if;
  if p_decisao = 'ARQUIVADO' and pr.status <> 'APROVADO' then
    raise exception 'Só projetos publicados podem ser despublicados.';
  end if;
  if p_decisao not in ('APROVADO', 'REJEITADO', 'ARQUIVADO') then
    raise exception 'Decisão inválida.';
  end if;
  if p_decisao in ('REJEITADO', 'ARQUIVADO') and coalesce(char_length(motivo), 0) < 10 then
    raise exception 'Explique o motivo (pelo menos 10 caracteres) — é o que os autores vão ler.';
  end if;

  if p_decisao = 'APROVADO' and pr.github_repo is not null and exists (
       select 1 from public.projetos o
        where o.id <> pr.id and o.status = 'APROVADO'
          and lower(o.github_repo) = lower(pr.github_repo)) then
    raise exception 'Este repositório já está publicado em outro projeto.';
  end if;

  update public.projetos
     set status          = p_decisao,
         motivo_rejeicao = case when p_decisao = 'APROVADO' then null else motivo end,
         aprovado_em     = case when p_decisao = 'APROVADO' then now() else null end,
         aprovado_por    = case when p_decisao = 'APROVADO' then auth.uid() else null end
   where id = p_projeto;

  insert into public.moderacoes (projeto_id, moderador_id, decisao, motivo)
  values (p_projeto, auth.uid(), p_decisao, motivo);
end;
$$;

-- ---------------------------------------------------------------------
-- membros_do_projeto passa a informar se o perfil é verificado
-- (a fila mostra o selo "não verificado")
-- ---------------------------------------------------------------------
drop function public.membros_do_projeto(uuid);
create function public.membros_do_projeto(p_projeto uuid)
returns table (
  user_id uuid, nome text, foto_url text, github_username text,
  papel public.papel_membro, perfil_publico boolean, verificado boolean
)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.nome, p.foto_url, p.github_username, m.papel, p.perfil_publico, p.verificado
    from public.projeto_membros m
    join public.profiles p on p.id = m.user_id
   where m.projeto_id = p_projeto
     and public.pode_ver_projeto(p_projeto)
   order by m.papel, p.nome;
$$;

-- ---------------------------------------------------------------------
-- Administração (só superadmin)
-- ---------------------------------------------------------------------
create or replace function public.admin_listar_usuarios(p_busca text default null)
returns table (
  id uuid, nome text, email text, tipo public.tipo_usuario, papel public.papel_sistema,
  verificado boolean, onboarding_completo boolean, github_username text,
  vinculos text, escopos public.escopo[], created_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_superadmin() then
    raise exception 'Só superadmin.';
  end if;
  return query
  select p.id, p.nome, u.email::text, p.tipo, p.papel, p.verificado, p.onboarding_completo,
         p.github_username,
         (select string_agg(
                   case when v.nivel = 'GRADUACAO' then v.curso::text else 'Pós: ' || v.programa end
                   || case when v.status = 'EGRESSO' then ' (egresso)' else '' end,
                   ', ')
            from public.vinculos v where v.user_id = p.id),
         coalesce((select array_agg(me.escopo order by me.escopo)
                     from public.moderador_escopos me where me.user_id = p.id), '{}'),
         p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
   where p_busca is null or p_busca = ''
      or p.nome ilike '%' || p_busca || '%'
      or u.email ilike '%' || p_busca || '%'
      or p.github_username ilike '%' || p_busca || '%'
   order by p.verificado, p.created_at desc
   limit 200;
end;
$$;

create or replace function public.admin_definir_papel(
  p_user uuid, p_papel public.papel_sistema, p_escopos public.escopo[] default '{}'
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_superadmin() then raise exception 'Só superadmin.'; end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio papel (evita ficar sem acesso).';
  end if;
  if p_papel = 'MODERADOR' and cardinality(coalesce(p_escopos, '{}')) = 0 then
    raise exception 'Moderador precisa de pelo menos um curso para moderar.';
  end if;

  update public.profiles set papel = p_papel where id = p_user;
  if not found then raise exception 'Usuário não encontrado.'; end if;

  delete from public.moderador_escopos where user_id = p_user;
  if p_papel = 'MODERADOR' then
    insert into public.moderador_escopos (user_id, escopo)
    select p_user, e from unnest(p_escopos) as e
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.admin_verificar(p_user uuid, p_verificado boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_superadmin() then raise exception 'Só superadmin.'; end if;
  update public.profiles set verificado = p_verificado where id = p_user;
  if not found then raise exception 'Usuário não encontrado.'; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------
revoke execute on function public.moderar_projeto(uuid, public.status_projeto, text)          from public, anon;
revoke execute on function public.admin_listar_usuarios(text)                                  from public, anon;
revoke execute on function public.admin_definir_papel(uuid, public.papel_sistema, public.escopo[]) from public, anon;
revoke execute on function public.admin_verificar(uuid, boolean)                               from public, anon;
grant  execute on function public.moderar_projeto(uuid, public.status_projeto, text)          to authenticated;
grant  execute on function public.admin_listar_usuarios(text)                                  to authenticated;
grant  execute on function public.admin_definir_papel(uuid, public.papel_sistema, public.escopo[]) to authenticated;
grant  execute on function public.admin_verificar(uuid, boolean)                               to authenticated;
grant  execute on function public.membros_do_projeto(uuid) to anon, authenticated;
