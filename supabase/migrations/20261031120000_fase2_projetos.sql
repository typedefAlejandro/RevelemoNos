-- =====================================================================
-- Revelemo-nos · Fase 2 — projetos, membros, tags e capas
--
-- Quem pode o quê:
--   • Qualquer visitante vê projetos APROVADOS.
--   • Membros veem os próprios projetos em qualquer status.
--   • AUTOR e ORIENTADOR editam; COLABORADOR só vê.
--   • Status muda SÓ por função (submeter/retirar agora; moderar na Fase 3).
--   • Editar um projeto APROVADO devolve ele para PENDENTE.
-- =====================================================================

create type public.status_projeto as enum ('RASCUNHO', 'PENDENTE', 'APROVADO', 'REJEITADO', 'ARQUIVADO');
create type public.papel_membro   as enum ('AUTOR', 'ORIENTADOR', 'COLABORADOR');
create type public.categoria_tag  as enum ('TEMA', 'CONTEXTO', 'TECNOLOGIA');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.projetos (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  titulo          text not null check (char_length(titulo) between 3 and 120),
  resumo          text not null check (char_length(resumo) between 10 and 280),
  descricao_md    text check (char_length(descricao_md) <= 20000),
  repo_url        text check (repo_url  ~ '^https://' and char_length(repo_url)  <= 500),
  demo_url        text check (demo_url  ~ '^https://' and char_length(demo_url)  <= 500),
  video_url       text check (video_url ~ '^https://' and char_length(video_url) <= 500),
  capa_path       text check (capa_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  github_repo     text check (github_repo ~ '^[A-Za-z0-9-]{1,39}/[A-Za-z0-9._-]{1,100}$'),
  escopos         public.escopo[] not null check (cardinality(escopos) between 1 and 5),
  ano             int check (ano between 1990 and 2100),
  status          public.status_projeto not null default 'RASCUNHO',
  motivo_rejeicao text,
  created_by      uuid not null references public.profiles on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  aprovado_em     timestamptz,
  aprovado_por    uuid references public.profiles on delete set null
);
create index projetos_status_idx on public.projetos (status);
-- O mesmo repositório não pode estar aprovado duas vezes.
create unique index projetos_github_repo_aprovado
  on public.projetos (lower(github_repo))
  where github_repo is not null and status = 'APROVADO';

create table public.projeto_membros (
  projeto_id uuid not null references public.projetos on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  papel      public.papel_membro not null,
  created_at timestamptz not null default now(),
  primary key (projeto_id, user_id)
);
create index projeto_membros_user_idx on public.projeto_membros (user_id);

create table public.tags (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null check (char_length(nome) between 1 and 40),
  slug      text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  categoria public.categoria_tag not null
);

create table public.projeto_tags (
  projeto_id uuid not null references public.projetos on delete cascade,
  tag_id     uuid not null references public.tags on delete cascade,
  primary key (projeto_id, tag_id)
);
create index projeto_tags_tag_idx on public.projeto_tags (tag_id);

-- ---------------------------------------------------------------------
-- Funções auxiliares (usadas nas políticas — security definer evita
-- recursão de RLS; todas só respondem sobre o usuário atual)
-- ---------------------------------------------------------------------
create or replace function public.e_moderador()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and papel in ('MODERADOR', 'SUPERADMIN'));
$$;

create or replace function public.pode_moderar(p_escopos public.escopo[])
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_superadmin()
      or exists (
        select 1
          from public.moderador_escopos me
          join public.profiles p on p.id = me.user_id
         where me.user_id = auth.uid()
           and p.papel = 'MODERADOR'
           and me.escopo = any (p_escopos)
      );
$$;

create or replace function public.papel_no_projeto(p_projeto uuid)
returns public.papel_membro language sql stable security definer set search_path = '' as $$
  select papel from public.projeto_membros
   where projeto_id = p_projeto and user_id = auth.uid();
$$;

create or replace function public.pode_editar_projeto(p_projeto uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.papel_no_projeto(p_projeto) in ('AUTOR', 'ORIENTADOR'), false);
$$;

create or replace function public.pode_ver_projeto(p_projeto uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projetos pr
     where pr.id = p_projeto
       and (   pr.status = 'APROVADO'
            or public.papel_no_projeto(pr.id) is not null
            or public.is_superadmin()
            or (pr.status <> 'RASCUNHO' and public.pode_moderar(pr.escopos)))
  );
$$;

-- ---------------------------------------------------------------------
-- Guarda de projetos (roda como o usuário; funções security definer passam)
-- ---------------------------------------------------------------------
create or replace function public.guardar_projeto()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();

  if current_user <> 'authenticated' or public.is_superadmin() then
    return new;
  end if;

  if new.status          is distinct from old.status
  or new.motivo_rejeicao is distinct from old.motivo_rejeicao
  or new.aprovado_em     is distinct from old.aprovado_em
  or new.aprovado_por    is distinct from old.aprovado_por
  or new.created_by      is distinct from old.created_by
  or new.slug            is distinct from old.slug
  or new.github_repo     is distinct from old.github_repo then
    raise exception 'Esses campos só mudam pelo fluxo de aprovação.';
  end if;

  if new.capa_path is distinct from old.capa_path
     and new.capa_path is not null
     and split_part(new.capa_path, '/', 1) <> auth.uid()::text then
    raise exception 'A capa precisa ser um arquivo enviado por você.';
  end if;

  if old.status = 'ARQUIVADO' then
    raise exception 'Projeto arquivado não pode ser editado.';
  end if;

  -- Mudou conteúdo de um projeto aprovado? Volta para a fila.
  if old.status = 'APROVADO' and (
       new.titulo, new.resumo, new.descricao_md, new.repo_url, new.demo_url,
       new.video_url, new.capa_path, new.escopos, new.ano
     ) is distinct from (
       old.titulo, old.resumo, old.descricao_md, old.repo_url, old.demo_url,
       old.video_url, old.capa_path, old.escopos, old.ano
     ) then
    new.status := 'PENDENTE';
    new.aprovado_em := null;
    new.aprovado_por := null;
  end if;

  return new;
end;
$$;

create trigger guardar_projeto
  before update on public.projetos
  for each row execute function public.guardar_projeto();

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

-- Cria o projeto (sempre RASCUNHO) e coloca quem criou como AUTOR.
-- p_dados: {slug, titulo, resumo, descricao_md, repo_url, demo_url, video_url,
--           escopos: ["CCO",...], ano, github_repo}
create or replace function public.criar_projeto(p_dados jsonb, p_tags uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  novo uuid;
begin
  if uid is null then raise exception 'Não autenticado.'; end if;
  if not exists (select 1 from public.profiles where id = uid and onboarding_completo) then
    raise exception 'Conclua seu cadastro antes de criar projetos.';
  end if;
  if (select count(*) from public.projetos where created_by = uid and status = 'RASCUNHO') >= 20 then
    raise exception 'Você já tem 20 rascunhos. Envie ou exclua alguns antes.';
  end if;

  insert into public.projetos (
    slug, titulo, resumo, descricao_md, repo_url, demo_url, video_url,
    escopos, ano, github_repo, created_by
  ) values (
    p_dados ->> 'slug',
    trim(p_dados ->> 'titulo'),
    trim(p_dados ->> 'resumo'),
    nullif(p_dados ->> 'descricao_md', ''),
    nullif(p_dados ->> 'repo_url', ''),
    nullif(p_dados ->> 'demo_url', ''),
    nullif(p_dados ->> 'video_url', ''),
    array(select jsonb_array_elements_text(p_dados -> 'escopos'))::public.escopo[],
    (p_dados ->> 'ano')::int,
    nullif(p_dados ->> 'github_repo', ''),
    uid
  ) returning id into novo;

  insert into public.projeto_membros (projeto_id, user_id, papel) values (novo, uid, 'AUTOR');

  insert into public.projeto_tags (projeto_id, tag_id)
  select novo, t.id from public.tags t
   where t.id = any (coalesce(p_tags, '{}'))
   limit 10;

  return novo;
end;
$$;

-- Substitui as tags do projeto (máx. 10).
create or replace function public.definir_tags(p_projeto uuid, p_tags uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  antes uuid[];
  depois uuid[];
begin
  if not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão para editar este projeto.';
  end if;
  if (select status from public.projetos where id = p_projeto) = 'ARQUIVADO' then
    raise exception 'Projeto arquivado não pode ser editado.';
  end if;
  if cardinality(coalesce(p_tags, '{}')) > 10 then
    raise exception 'No máximo 10 tags.';
  end if;

  select coalesce(array_agg(tag_id order by tag_id), '{}') into antes
    from public.projeto_tags where projeto_id = p_projeto;

  delete from public.projeto_tags
   where projeto_id = p_projeto and not (tag_id = any (coalesce(p_tags, '{}')));
  insert into public.projeto_tags (projeto_id, tag_id)
  select p_projeto, t.id from public.tags t where t.id = any (coalesce(p_tags, '{}'))
  on conflict do nothing;

  select coalesce(array_agg(tag_id order by tag_id), '{}') into depois
    from public.projeto_tags where projeto_id = p_projeto;

  if antes is distinct from depois and not public.is_superadmin() then
    update public.projetos
       set status = 'PENDENTE', aprovado_em = null, aprovado_por = null
     where id = p_projeto and status = 'APROVADO';
  end if;
end;
$$;

-- RASCUNHO/REJEITADO → PENDENTE.
create or replace function public.submeter_projeto(p_projeto uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  atual public.status_projeto;
begin
  if not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão para enviar este projeto.';
  end if;
  select status into atual from public.projetos where id = p_projeto for update;
  if atual not in ('RASCUNHO', 'REJEITADO') then
    raise exception 'Só rascunhos ou projetos recusados podem ser enviados.';
  end if;
  if (select count(*) from public.projetos pr
        join public.projeto_membros m on m.projeto_id = pr.id
       where m.user_id = auth.uid() and pr.status = 'PENDENTE') >= 5 then
    raise exception 'Você já tem 5 projetos aguardando aprovação.';
  end if;

  update public.projetos
     set status = 'PENDENTE', motivo_rejeicao = null
   where id = p_projeto;
end;
$$;

-- PENDENTE → RASCUNHO (desistir do envio para continuar editando).
create or replace function public.retirar_submissao(p_projeto uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão.';
  end if;
  update public.projetos set status = 'RASCUNHO'
   where id = p_projeto and status = 'PENDENTE';
  if not found then
    raise exception 'O projeto não está aguardando aprovação.';
  end if;
end;
$$;

-- Adiciona membro por @github (vinculado) ou e-mail @unifei.edu.br.
create or replace function public.adicionar_membro(
  p_projeto uuid, p_identificador text, p_papel public.papel_membro
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ident text := lower(trim(p_identificador));
  alvo uuid;
  alvo_tipo public.tipo_usuario;
begin
  if not public.pode_editar_projeto(p_projeto) then
    raise exception 'Sem permissão para gerenciar membros.';
  end if;
  if (select count(*) from public.projeto_membros where projeto_id = p_projeto) >= 15 then
    raise exception 'No máximo 15 membros por projeto.';
  end if;

  if position('@' in ident) > 1 then
    select u.id into alvo from auth.users u where lower(u.email) = ident;
  else
    select p.id into alvo from public.profiles p
     where lower(p.github_username) = ltrim(ident, '@');
  end if;

  if alvo is null then
    raise exception 'Pessoa não encontrada. Ela precisa ter entrado no Revelemo-nos (e vinculado o GitHub, se for buscar pelo @).';
  end if;

  select tipo into alvo_tipo from public.profiles where id = alvo;
  if p_papel = 'ORIENTADOR' and alvo_tipo <> 'PROFESSOR' then
    raise exception 'Orientador precisa ser um professor.';
  end if;

  insert into public.projeto_membros (projeto_id, user_id, papel)
  values (p_projeto, alvo, p_papel)
  on conflict (projeto_id, user_id) do update set papel = excluded.papel;
end;
$$;

-- Remove membro (ou a própria pessoa sai). Sempre sobra pelo menos um AUTOR.
create or replace function public.remover_membro(p_projeto uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (public.pode_editar_projeto(p_projeto) or p_user = auth.uid()) then
    raise exception 'Sem permissão para remover membros.';
  end if;
  if (select papel from public.projeto_membros where projeto_id = p_projeto and user_id = p_user) = 'AUTOR'
     and (select count(*) from public.projeto_membros where projeto_id = p_projeto and papel = 'AUTOR') <= 1 then
    raise exception 'O projeto precisa ter pelo menos um autor.';
  end if;
  delete from public.projeto_membros where projeto_id = p_projeto and user_id = p_user;
end;
$$;

-- Membros com nome/foto, mesmo de quem não tem perfil público
-- (só o necessário para o card do projeto; nunca e-mail).
create or replace function public.membros_do_projeto(p_projeto uuid)
returns table (
  user_id uuid, nome text, foto_url text, github_username text,
  papel public.papel_membro, perfil_publico boolean
)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.nome, p.foto_url, p.github_username, m.papel, p.perfil_publico
    from public.projeto_membros m
    join public.profiles p on p.id = m.user_id
   where m.projeto_id = p_projeto
     and public.pode_ver_projeto(p_projeto)
   order by m.papel, p.nome;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.projetos        enable row level security;
alter table public.projeto_membros enable row level security;
alter table public.tags            enable row level security;
alter table public.projeto_tags    enable row level security;

create policy "aprovados para todos; demais para membros e moderação"
  on public.projetos for select
  using (
       status = 'APROVADO'
    or public.papel_no_projeto(id) is not null
    or public.is_superadmin()
    or (status <> 'RASCUNHO' and public.pode_moderar(escopos))
  );

create policy "autor e orientador editam (colunas guardadas por trigger)"
  on public.projetos for update to authenticated
  using (public.pode_editar_projeto(id))
  with check (public.pode_editar_projeto(id));

create policy "autor exclui rascunho ou recusado"
  on public.projetos for delete to authenticated
  using (public.papel_no_projeto(id) = 'AUTOR' and status in ('RASCUNHO', 'REJEITADO'));
-- Sem INSERT direto: use criar_projeto().

create policy "membros visíveis junto com o projeto"
  on public.projeto_membros for select
  using (public.pode_ver_projeto(projeto_id));
-- Escrita só por adicionar_membro()/remover_membro().

create policy "tags são públicas"
  on public.tags for select using (true);
create policy "moderação gerencia tags"
  on public.tags for all to authenticated
  using (public.e_moderador()) with check (public.e_moderador());

create policy "tags do projeto visíveis junto com o projeto"
  on public.projeto_tags for select
  using (public.pode_ver_projeto(projeto_id));
-- Escrita só por definir_tags()/criar_projeto().

-- ---------------------------------------------------------------------
-- Permissões das RPCs
-- ---------------------------------------------------------------------
revoke execute on function public.criar_projeto(jsonb, uuid[])                        from public, anon;
revoke execute on function public.definir_tags(uuid, uuid[])                          from public, anon;
revoke execute on function public.submeter_projeto(uuid)                              from public, anon;
revoke execute on function public.retirar_submissao(uuid)                             from public, anon;
revoke execute on function public.adicionar_membro(uuid, text, public.papel_membro)   from public, anon;
revoke execute on function public.remover_membro(uuid, uuid)                          from public, anon;
grant  execute on function public.criar_projeto(jsonb, uuid[])                        to authenticated;
grant  execute on function public.definir_tags(uuid, uuid[])                          to authenticated;
grant  execute on function public.submeter_projeto(uuid)                              to authenticated;
grant  execute on function public.retirar_submissao(uuid)                             to authenticated;
grant  execute on function public.adicionar_membro(uuid, text, public.papel_membro)   to authenticated;
grant  execute on function public.remover_membro(uuid, uuid)                          to authenticated;
revoke execute on function public.guardar_projeto() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: capas dos projetos
-- Leitura pública; cada pessoa só escreve na pasta com o próprio id.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capas', 'capas', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "capas: envia na própria pasta"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "capas: altera na própria pasta"
  on storage.objects for update to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "capas: apaga da própria pasta"
  on storage.objects for delete to authenticated
  using (bucket_id = 'capas' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Tags iniciais (moderadores criam novas pelo app na Fase 3)
-- ---------------------------------------------------------------------
insert into public.tags (nome, slug, categoria) values
  -- Contexto: por que/onde o projeto nasceu
  ('TFG', 'tfg', 'CONTEXTO'),
  ('Disciplina', 'disciplina', 'CONTEXTO'),
  ('Iniciação Científica', 'iniciacao-cientifica', 'CONTEXTO'),
  ('Extensão', 'extensao', 'CONTEXTO'),
  ('Dev-U', 'dev-u', 'CONTEXTO'),
  ('Hackathon', 'hackathon', 'CONTEXTO'),
  ('Mestrado', 'mestrado', 'CONTEXTO'),
  ('Doutorado', 'doutorado', 'CONTEXTO'),
  ('Estágio', 'estagio', 'CONTEXTO'),
  ('Projeto pessoal', 'projeto-pessoal', 'CONTEXTO'),
  -- Tema
  ('Estrutura de Dados', 'estrutura-de-dados', 'TEMA'),
  ('Algoritmos', 'algoritmos', 'TEMA'),
  ('Inteligência Artificial', 'inteligencia-artificial', 'TEMA'),
  ('Ciência de Dados', 'ciencia-de-dados', 'TEMA'),
  ('Banco de Dados', 'banco-de-dados', 'TEMA'),
  ('Desenvolvimento Web', 'desenvolvimento-web', 'TEMA'),
  ('Mobile', 'mobile', 'TEMA'),
  ('Jogos', 'jogos', 'TEMA'),
  ('Sistemas Embarcados', 'sistemas-embarcados', 'TEMA'),
  ('Robótica', 'robotica', 'TEMA'),
  ('Redes', 'redes', 'TEMA'),
  ('Segurança', 'seguranca', 'TEMA'),
  ('Computação Gráfica', 'computacao-grafica', 'TEMA'),
  ('Compiladores', 'compiladores', 'TEMA'),
  ('Sistemas Operacionais', 'sistemas-operacionais', 'TEMA'),
  ('Engenharia de Software', 'engenharia-de-software', 'TEMA'),
  ('Educação', 'educacao', 'TEMA'),
  -- Tecnologia
  ('Python', 'python', 'TECNOLOGIA'),
  ('JavaScript', 'javascript', 'TECNOLOGIA'),
  ('TypeScript', 'typescript', 'TECNOLOGIA'),
  ('Java', 'java', 'TECNOLOGIA'),
  ('C', 'c', 'TECNOLOGIA'),
  ('C++', 'cpp', 'TECNOLOGIA'),
  ('C#', 'csharp', 'TECNOLOGIA'),
  ('Go', 'go', 'TECNOLOGIA'),
  ('Rust', 'rust', 'TECNOLOGIA'),
  ('Kotlin', 'kotlin', 'TECNOLOGIA'),
  ('Ruby', 'ruby', 'TECNOLOGIA'),
  ('PHP', 'php', 'TECNOLOGIA'),
  ('R', 'r', 'TECNOLOGIA'),
  ('SQL', 'sql', 'TECNOLOGIA'),
  ('React', 'react', 'TECNOLOGIA'),
  ('Next.js', 'nextjs', 'TECNOLOGIA'),
  ('Node.js', 'nodejs', 'TECNOLOGIA'),
  ('Flutter', 'flutter', 'TECNOLOGIA'),
  ('Unity', 'unity', 'TECNOLOGIA'),
  ('Arduino', 'arduino', 'TECNOLOGIA'),
  ('PyTorch', 'pytorch', 'TECNOLOGIA'),
  ('TensorFlow', 'tensorflow', 'TECNOLOGIA')
on conflict (slug) do nothing;
