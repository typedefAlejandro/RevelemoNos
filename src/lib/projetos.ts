import type { PostgrestError } from "@supabase/supabase-js";
import type { Escopo } from "@/lib/validations/projeto";

export type StatusProjeto = "RASCUNHO" | "PENDENTE" | "APROVADO" | "REJEITADO" | "ARQUIVADO";
export type PapelMembro = "AUTOR" | "ORIENTADOR" | "COLABORADOR";
export type CategoriaTag = "TEMA" | "CONTEXTO" | "TECNOLOGIA";

export type Projeto = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  descricao_md: string | null;
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  capa_path: string | null;
  github_repo: string | null;
  escopos: Escopo[];
  ano: number | null;
  status: StatusProjeto;
  motivo_rejeicao: string | null;
  updated_at: string;
};

export type Tag = { id: string; nome: string; slug: string; categoria: CategoriaTag };

export type Membro = {
  user_id: string;
  nome: string;
  foto_url: string | null;
  github_username: string | null;
  papel: PapelMembro;
  verificado?: boolean;
};

export const STATUS_INFO: Record<StatusProjeto, { rotulo: string; classe: string }> = {
  RASCUNHO: { rotulo: "Rascunho", classe: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" },
  PENDENTE: { rotulo: "Aguardando aprovação", classe: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  APROVADO: { rotulo: "Publicado", classe: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  REJEITADO: { rotulo: "Precisa de ajustes", classe: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  ARQUIVADO: { rotulo: "Arquivado", classe: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" },
};

export const PAPEL_ROTULO: Record<PapelMembro, string> = {
  AUTOR: "Autor(a)",
  ORIENTADOR: "Orientador(a)",
  COLABORADOR: "Colaborador(a)",
};

export const CATEGORIA_ROTULO: Record<CategoriaTag, string> = {
  CONTEXTO: "Contexto",
  TEMA: "Tema",
  TECNOLOGIA: "Tecnologia",
};

export const ESCOPO_ROTULO: Record<Escopo, string> = {
  CCO: "CCO",
  CDA: "CDA",
  ECO: "ECO",
  SIN: "SIN",
  POS: "Pós",
};

/** URL pública da capa (bucket "capas" é público). */
export function urlCapa(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/capas/${path}`;
}

/** Slug legível + sufixo aleatório (evita colisão sem consultar o banco). */
export function gerarSlug(titulo: string) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const sufixo = Math.random().toString(36).slice(2, 7).padEnd(5, "0");
  return base ? `${base}-${sufixo}` : `projeto-${sufixo}`;
}

/**
 * Mensagem para mostrar ao usuário. As funções do banco levantam
 * mensagens em português (código P0001); o resto vira mensagem genérica.
 */
export function mensagemDoBanco(error: PostgrestError | null, padrao = "Não foi possível salvar.") {
  if (!error) return null;
  if (error.code === "P0001") return error.message;
  if (error.code === "23514") return "Algum campo está fora do formato esperado. Confira os links (https://) e os tamanhos.";
  return padrao;
}
