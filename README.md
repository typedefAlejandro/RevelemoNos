# Revelemo-nos

Vitrine dos projetos de alunos e professores da Computação da UNIFEI — **CCO**, **CDA**, **ECO**, **SIN** e pós-graduação. Uma iniciativa do **DACOMP**.

Alunos e professores entram com o e-mail `@unifei.edu.br`, cadastram seus projetos, um moderador aprova, e o projeto aparece na vitrine pública (com filtros por curso, nível e tags). A ideia é a gente se conhecer, ser visto e levar isso para feiras como a EUREKA, outras universidades e escolas.

## Stack

| Camada | Tecnologia |
|---|---|
| Front + back | Next.js 16 (App Router) + TypeScript |
| Estilo | Tailwind CSS 4 (+ shadcn/ui) |
| Banco, login, arquivos | Supabase (Postgres + Auth com Google + Storage) |
| Validação | Zod |
| Deploy | Vercel |

## Rodando localmente

Precisa de **Node.js 20.9+** (recomendado 22 LTS).

```bash
npm install
cp .env.example .env.local   # no Windows: copy .env.example .env.local
# preencha .env.local com a URL e a publishable key do seu projeto Supabase
npm run dev
```

Abra http://localhost:3000.

> A página inicial funciona mesmo sem o Supabase configurado.

## Estrutura

```
src/
  app/                 rotas (App Router)
  lib/supabase/        clientes do Supabase (navegador, servidor, proxy)
  proxy.ts             renova a sessão a cada requisição (antigo "middleware")
supabase/migrations/   SQL versionado do banco (a partir da Fase 1)
```

## Segurança — o básico para quem for contribuir

- **Quem pode ver/alterar o quê é decidido no banco (RLS do Supabase)**, não no front. Esconder um botão não protege nada.
- Variáveis `NEXT_PUBLIC_*` vão para o navegador. A chave secreta do Supabase nunca leva esse prefixo e nunca entra no repositório.
- Mudanças no banco só por arquivo de migração em `supabase/migrations/`.

## Roadmap

Veja [ROADMAP.md](./ROADMAP.md).

## Contribuindo

1. Faça um fork e crie uma branch (`feat/minha-ideia`).
2. `npm run lint` e `npm run build` precisam passar.
3. Abra um PR — a Vercel gera um preview automático para revisão.

## Configurando login e banco (Fase 1)

### 1. Supabase
1. Crie o projeto em https://supabase.com (região **South America (São Paulo)**).
2. Em **Project Settings → API Keys**, copie a URL e a *publishable key* para o `.env.local`.
3. Aplique as migrações:
   ```bash
   npx supabase login
   npx supabase init            # só na primeira vez (cria supabase/config.toml)
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```
4. Em **Authentication → URL Configuration**:
   - *Site URL*: a URL de produção (ex.: `https://revelemo-nos.vercel.app`)
   - *Redirect URLs*: `http://localhost:3000/**`, `https://revelemo-nos.vercel.app/**` e `https://*-SEU-TIME.vercel.app/**` (previews)
5. Em **Authentication → Sign In / Providers**, ligue **Allow manual linking** (necessário para vincular o GitHub).

### 2. Google (login principal)
1. https://console.cloud.google.com → crie um projeto → **APIs e serviços → Tela de permissão OAuth** (tipo *Externo*, escopos `email`, `profile`, `openid`).
2. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
   - *URI de redirecionamento autorizado*: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
3. Cole *Client ID* e *Client Secret* em **Supabase → Authentication → Providers → Google**.

### 3. GitHub (opcional, vinculado ao perfil)
1. https://github.com/settings/developers → **New OAuth App** (depois, mova para a org do DACOMP).
   - *Homepage URL*: a URL do site
   - *Authorization callback URL*: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
2. Cole *Client ID* e *Client Secret* em **Supabase → Providers → GitHub**.

### 4. Seu usuário superadmin
Entre no site com o Google, faça o onboarding e rode `supabase/sql/promover-superadmin.sql` no SQL Editor (trocando o e-mail).

### Como o login funciona
- **Primeiro acesso é sempre com o Google `@unifei.edu.br`** — é isso que prova o vínculo com a UNIFEI. Um trigger no banco recusa qualquer outro domínio, mesmo que alguém burle a tela.
- No perfil, a pessoa **vincula o GitHub**. A partir daí pode entrar por ele também, e o `github_username` vem da identidade verificada (ninguém digita o GitHub de outra pessoa).
- Tentar entrar pelo GitHub sem ter vinculado cria uma conta com o e-mail do GitHub — que o banco recusa (a não ser que o e-mail principal do GitHub seja `@unifei.edu.br`).
