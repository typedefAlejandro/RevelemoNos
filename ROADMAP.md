# Roadmap — Revelemo-nos

Cada fase termina **em produção**. Marque os itens conforme forem entregues.

## Fase 0 — Esqueleto no ar
- [x] Projeto Next.js 16 + TypeScript + Tailwind
- [x] Clientes do Supabase (navegador, servidor, proxy de sessão)
- [x] Página "em breve"
- [x] `.env.example`, README e este roadmap
- [x] Repositório no GitHub (`typedefAlejandro/RevelemoNos`; migrar para org do DACOMP depois)
- [x] shadcn/ui inicializado
- [x] Projeto criado no Supabase e chaves no `.env.local`
- [x] Deploy na Vercel com as variáveis de ambiente

## Fase 1 — Login e perfil
- [x] Migração `fase1_auth_perfil` (tipos, `profiles`, `vinculos`, `moderador_escopos`) com RLS — testada
- [x] Bloqueio de domínio `@unifei.edu.br` no banco (criar conta e trocar e-mail)
- [x] Telas: login (Google / GitHub), onboarding, perfil, sair
- [x] Vincular/desvincular GitHub; `github_username` só vem da identidade verificada
- [x] Repositórios públicos do GitHub no perfil
- [x] OAuth Google (Google Cloud) + GitHub (OAuth App) configurados no Supabase
- [x] "Manual linking" ligado no Supabase Auth
- [x] Migração aplicada (`npx supabase db push --linked`)
- [x] Han promovido a superadmin (`supabase/sql/promover-superadmin.sql`)
- [ ] Página pública do perfil (`/perfil/[id]`)
- [x] Deploy na Vercel (https://revelemo-nos.vercel.app) com URLs atualizadas no Supabase, Google e GitHub
- [x] Google Auth Platform como **Interno** (organização UNIFEI): só contas @unifei.edu.br, sem lista de teste
- [ ] Adicionar outro membro do DACOMP como proprietário no Google Cloud e no Supabase

## Fase 2 — Projetos
- [ ] CRUD de rascunho, membros, tags, capa, preview de Markdown
- [ ] Importar repositório do GitHub como rascunho (só repos do próprio usuário ou em que é contribuidor)
- [ ] "Enviar para aprovação"

## Fase 3 — Moderação  ← primeiro teste com usuários reais
- [ ] Fila por escopo, aprovar/rejeitar com motivo, histórico
- [ ] Painel de superadmin (papéis, escopos, verificação)

## Fase 4 — Vitrine pública
- [ ] Listagem com filtros e busca, página do projeto, Open Graph

## Fase 5 — Feira
- [ ] Modo apresentação, QR code por projeto, destaques

## v2
- [ ] Demos executáveis no navegador, notificações, comentários
