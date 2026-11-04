-- Nova categoria de tag: grupos e equipes (empresas júnior, equipes de
-- competição, projetos de extensão). Fica num arquivo separado porque um
-- valor novo de enum só pode ser usado depois que esta migração termina.
alter type public.categoria_tag add value if not exists 'GRUPO' before 'CONTEXTO';
