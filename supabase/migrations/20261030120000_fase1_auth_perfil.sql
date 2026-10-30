-- =====================================================================
-- Revelemo-nos · Fase 1 — login, perfil e vínculos
--
-- Regra de ouro: quem pode ler/escrever o quê é decidido AQUI (RLS),
-- nunca só no front.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.tipo_usuario   as enum ('ALUNO', 'PROFESSOR');
create type public.papel_sistema  as enum ('USUARIO', 'MODERADOR', 'SUPERADMIN');
create type public.nivel          as enum ('GRADUACAO', 'POS');
create type public.curso          as enum ('CCO', 'CDA', 'ECO', 'SIN');
create type public.escopo         as enum ('CCO', 'CDA', 'ECO', 'SIN', 'POS');
create type public.status_vinculo as enum ('ATIVO', 'EGRESSO');

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users on delete cascade,
  nome                text not null check (char_length(nome) between 2 and 120),
  tipo                public.tipo_usuario  not null default 'ALUNO',
  papel               public.papel_sistema not null default 'USUARIO',
  onboarding_completo boolean not null default false,
  bio                 text check (char_length(bio) <= 500),
  foto_url            text,
  linkedin_url        text check (linkedin_url ~ '^https://'),
  -- Preenchido SÓ a partir da identidade GitHub vinculada (função
  -- sincronizar_github). O usuário não digita: assim ninguém se passa
  -- pelo GitHub de outra pessoa.
  github_username     text unique,
  perfil_publico      boolean not null default false,  -- LGPD: opt-in
  verificado          boolean not null default false,  -- conferido por admin
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.vinculos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles on delete cascade,
  nivel        public.nivel not null,
  curso        public.curso,
  programa     text check (char_length(programa) <= 120),
  status       public.status_vinculo not null default 'ATIVO',
  ano_ingresso int check (ano_ingresso between 1960 and 2100),
  check (
       (nivel = 'GRADUACAO' and curso is not null and programa is null)
    or (nivel = 'POS' and curso is null and programa is not null)
  )
);
create index vinculos_user_id_idx on public.vinculos (user_id);
create unique index um_graduacao_ativa on public.vinculos (user_id)
  where nivel = 'GRADUACAO' and status = 'ATIVO';

create table public.moderador_escopos (
  user_id uuid references public.profiles on delete cascade,
  escopo  public.escopo,
  primary key (user_id, escopo)
);

-- ---------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and papel = 'SUPERADMIN'
  );
$$;

-- ---------------------------------------------------------------------
-- Login só com e-mail @unifei.edu.br
-- (o parâmetro "hd" do Google é só dica de tela; o bloqueio real é este)
-- ---------------------------------------------------------------------
create or replace function public.bloquear_dominio_externo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null
     or lower(split_part(new.email, '@', 2)) <> 'unifei.edu.br' then
    raise exception 'Somente e-mails @unifei.edu.br podem entrar.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger antes_de_criar_usuario
  before insert on auth.users
  for each row execute function public.bloquear_dominio_externo();

-- Também impede trocar o e-mail da conta para outro domínio depois.
create trigger antes_de_trocar_email
  before update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.bloquear_dominio_externo();

-- Cria o perfil assim que a conta nasce.
create or replace function public.criar_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, foto_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger depois_de_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_profile();

-- ---------------------------------------------------------------------
-- Guarda de colunas sensíveis em profiles
-- Usuário comum não muda papel, não se auto-verifica, não marca o
-- onboarding como feito e não escreve github_username.
-- Funções security definer (rodam como dono) e o superadmin passam.
-- ---------------------------------------------------------------------
create or replace function public.guardar_profile()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();

  if current_user <> 'authenticated' or public.is_superadmin() then
    return new;
  end if;

  if new.papel is distinct from old.papel then
    raise exception 'Somente superadmin altera papel.';
  end if;
  if new.verificado and not old.verificado then
    raise exception 'Somente superadmin verifica perfis.';
  end if;
  if new.onboarding_completo is distinct from old.onboarding_completo then
    raise exception 'Use concluir_onboarding().';
  end if;
  if new.github_username is distinct from old.github_username then
    raise exception 'Use sincronizar_github() / desvincular pelo app.';
  end if;
  -- Mudou quem diz ser? Volta para não verificado.
  if new.tipo is distinct from old.tipo then
    new.verificado := false;
  end if;
  return new;
end;
$$;

create trigger guardar_profile
  before update on public.profiles
  for each row execute function public.guardar_profile();

-- Mexeu nos vínculos? Perfil volta para não verificado.
create or replace function public.desverificar_ao_mudar_vinculo()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  alvo uuid := coalesce(new.user_id, old.user_id);
begin
  if not public.is_superadmin() then
    update public.profiles set verificado = false
    where id = alvo and verificado;
  end if;
  return null;
end;
$$;

create trigger desverificar_ao_mudar_vinculo
  after insert or update or delete on public.vinculos
  for each row execute function public.desverificar_ao_mudar_vinculo();

-- ---------------------------------------------------------------------
-- Onboarding: grava tipo + vínculos de uma vez (atômico)
-- p_vinculos: [{"nivel":"GRADUACAO","curso":"CCO","ano_ingresso":2022},
--              {"nivel":"POS","programa":"Mestrado em Ciência e Tecnologia da Computação"}]
-- ---------------------------------------------------------------------
create or replace function public.concluir_onboarding(
  p_tipo     public.tipo_usuario,
  p_vinculos jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  v   jsonb;
begin
  if uid is null then
    raise exception 'Não autenticado.';
  end if;
  if jsonb_typeof(p_vinculos) <> 'array' or jsonb_array_length(p_vinculos) > 5 then
    raise exception 'Vínculos inválidos.';
  end if;
  if p_tipo = 'ALUNO' and jsonb_array_length(p_vinculos) = 0 then
    raise exception 'Aluno precisa de pelo menos um vínculo.';
  end if;

  delete from public.vinculos where user_id = uid;

  for v in select * from jsonb_array_elements(p_vinculos) loop
    insert into public.vinculos (user_id, nivel, curso, programa, status, ano_ingresso)
    values (
      uid,
      (v ->> 'nivel')::public.nivel,
      (v ->> 'curso')::public.curso,
      nullif(trim(v ->> 'programa'), ''),
      coalesce((v ->> 'status')::public.status_vinculo, 'ATIVO'),
      (v ->> 'ano_ingresso')::int
    );
  end loop;

  update public.profiles
     set tipo = p_tipo,
         onboarding_completo = true,
         verificado = false
   where id = uid;
end;
$$;

-- ---------------------------------------------------------------------
-- GitHub vinculado → github_username verificado
-- Lê a identidade GitHub que o Supabase Auth guardou para ESTE usuário.
-- ---------------------------------------------------------------------
create or replace function public.sincronizar_github()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  login text;
begin
  if uid is null then
    raise exception 'Não autenticado.';
  end if;

  select i.identity_data ->> 'user_name'
    into login
    from auth.identities i
   where i.user_id = uid and i.provider = 'github'
   limit 1;

  update public.profiles set github_username = login where id = uid;
  return login;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.vinculos          enable row level security;
alter table public.moderador_escopos enable row level security;

-- profiles
create policy "perfil público, o próprio ou superadmin"
  on public.profiles for select
  using (perfil_publico or id = auth.uid() or public.is_superadmin());

create policy "edita o próprio perfil (colunas guardadas por trigger)"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_superadmin())
  with check (id = auth.uid() or public.is_superadmin());
-- Sem policy de INSERT/DELETE: perfil nasce pelo trigger e morre com a conta.

-- vinculos
create policy "vínculos de perfil público, os próprios ou superadmin"
  on public.vinculos for select
  using (
    user_id = auth.uid()
    or public.is_superadmin()
    or exists (select 1 from public.profiles p
               where p.id = vinculos.user_id and p.perfil_publico)
  );

create policy "gerencia os próprios vínculos"
  on public.vinculos for all to authenticated
  using (user_id = auth.uid() or public.is_superadmin())
  with check (user_id = auth.uid() or public.is_superadmin());

-- moderador_escopos
create policy "vê os próprios escopos ou superadmin"
  on public.moderador_escopos for select to authenticated
  using (user_id = auth.uid() or public.is_superadmin());

create policy "só superadmin gerencia escopos"
  on public.moderador_escopos for all to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ---------------------------------------------------------------------
-- Permissões de execução das funções
-- ---------------------------------------------------------------------
revoke execute on function public.concluir_onboarding(public.tipo_usuario, jsonb) from public, anon;
revoke execute on function public.sincronizar_github() from public, anon;
grant  execute on function public.concluir_onboarding(public.tipo_usuario, jsonb) to authenticated;
grant  execute on function public.sincronizar_github() to authenticated;

-- Funções de trigger não devem ser chamadas pela API.
revoke execute on function public.bloquear_dominio_externo()      from public, anon, authenticated;
revoke execute on function public.criar_profile()                 from public, anon, authenticated;
revoke execute on function public.desverificar_ao_mudar_vinculo() from public, anon, authenticated;
