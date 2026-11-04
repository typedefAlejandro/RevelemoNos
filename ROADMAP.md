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
- [x] Página pública do perfil (`/perfil/[id]`) — feita na Fase 4
- [x] Deploy na Vercel (https://revelemo-nos.vercel.app) com URLs atualizadas no Supabase, Google e GitHub
- [x] Google Auth Platform como **Interno** (organização UNIFEI): só contas @unifei.edu.br, sem lista de teste
- [ ] Adicionar outro membro do DACOMP como proprietário no Google Cloud e no Supabase

## Fase 2 — Projetos
- [x] Migração `fase2_projetos` (projetos, membros, tags, capas no Storage) com RLS — testada
- [x] Meus projetos, novo, editar (rascunho), excluir
- [x] Membros por @GitHub ou e-mail; orientador precisa ser professor; sempre sobra um autor
- [x] Tags (contexto, tema, tecnologia) com 49 tags iniciais
- [x] Capa (PNG/JPG/WEBP até 2 MB) e descrição em Markdown com pré-visualização
- [x] Importar repositório do GitHub (só dono ou contribuidor; conferido no servidor)
- [x] Enviar para aprovação / voltar para rascunho; editar projeto publicado volta para a fila
- [ ] Migração aplicada (`npx supabase db push --linked`) e testada em produção

## Fase 3 — Moderação  ← primeiro teste com usuários reais
- [x] Migração `fase3_moderacao` (histórico `moderacoes`, `moderar_projeto`, RPCs de admin) — testada
- [x] `/moderacao`: fila por curso, aprovar / pedir ajustes (motivo obrigatório), despublicar
- [x] Moderador não decide sobre projeto em que é membro (só o superadmin)
- [x] `/moderacao/historico` e `/moderacao/tags` (criar/excluir tags)
- [x] `/admin`: nomear moderadores por curso, verificar vínculos
- [ ] Migração aplicada (`npx supabase db push --linked`)
- [ ] Nomear pelo menos um moderador por curso

## Fase 4 — Vitrine pública
- [x] Migração `fase4_vitrine` (busca em português sem acento, `vitrine()`, `filtros_vitrine()`) — testada
- [x] Home = vitrine: busca, filtros por curso, tag e ano, paginação
- [x] Página pública do projeto `/p/[slug]` com vídeo do YouTube embutido e Open Graph (prévia para membros)
- [x] Perfil público `/perfil/[id]` com os projetos publicados
- [x] Migração aplicada e em produção

## Fase 5 — Feira (EUREKA, escolas, outras universidades)
- [ ] Modo apresentação `/feira`: tela cheia, passa os projetos sozinho, filtro por curso/tag
- [ ] QR code por projeto (na página do projeto e no modo feira) e cartaz para imprimir
- [ ] Destaques curados pela moderação (projetos em evidência na home)

## Fase 6 — Confiança e manutenção
- [ ] Página de privacidade e termos de uso (LGPD: o que coletamos, para quê, como excluir)
- [ ] Excluir a própria conta pelo app
- [ ] Notificações por e-mail: projeto aprovado / ajustes pedidos / adicionado como membro
- [ ] Segundo proprietário do DACOMP no Google Cloud, Supabase, Vercel e GitHub
- [ ] Mover o repositório para a organização do DACOMP no GitHub
- [ ] Tipos do banco gerados (`npx supabase gen types`) no lugar dos tipos escritos à mão
- [ ] Testes automáticos das regras do banco (RLS) rodando a cada PR
- [ ] `sitemap.xml` e `robots.txt` para os projetos aparecerem no Google

## Expansão: outros campi e instituições
Hoje o Revelemo-nos atende só os cursos de **Itajubá** (CCO, CDA, ECO, SIN e pós). Não pedimos campus no cadastro enquanto houver uma opção só: quando outro campus entrar, todos os cadastros atuais viram UNIFEI/Itajubá com um único comando.

Fazer quando a expansão estiver decidida (ex.: o DACOMP/CA de Itabira ou Pouso Alegre topou), numa migração planejada:
- [ ] Tabela de **instituições** (nome, domínio de e-mail aceito); o bloqueio de `@unifei.edu.br` passa a consultar essa lista
- [ ] Tabela de **campi** (Itajubá, Itabira, Pouso Alegre…) com ativo/inativo para liberar um de cada vez
- [ ] **Cursos** viram tabela ligada ao campus (hoje são uma lista fixa `CCO/CDA/ECO/SIN` no banco e no código)
- [ ] Vínculos e escopos de moderação apontam para o curso; moderador modera "curso X do campus Y"
- [ ] Cadastros e projetos existentes migrados para UNIFEI/Itajubá
- [ ] Campus no cadastro e filtro de campus na vitrine (só aparecem com mais de um campus ativo)
- [ ] Outras instituições: Google Auth Platform precisa virar "Externo" (hoje é "Interno" da UNIFEI); o bloqueio por domínio no banco continua garantindo quem entra

## v2 — ideias
- [ ] Demos executáveis no navegador (StackBlitz/WebContainers, Pyodide, v86)
- [ ] Comentários e "curtir" nos projetos
- [ ] Coleções (ex.: "Projetos da EUREKA 2026", "TFGs de 2025")
- [ ] Página por curso e por professor orientador
