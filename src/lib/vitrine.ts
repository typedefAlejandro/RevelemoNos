import type { CategoriaTag, PapelMembro } from "@/lib/projetos";
import { ESCOPOS, type Escopo } from "@/lib/validations/projeto";

export type ItemVitrine = {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  capa_path: string | null;
  escopos: Escopo[];
  ano: number | null;
  aprovado_em: string | null;
  tags: { nome: string; slug: string; categoria: CategoriaTag }[];
  membros: { nome: string; papel: PapelMembro }[];
  total: number;
};

export type FiltrosDisponiveis = {
  tags: { nome: string; slug: string; categoria: CategoriaTag; qtd: number }[];
  anos: number[];
  total: number;
};

export const POR_PAGINA = 24;

export type Filtros = { q?: string; curso?: Escopo; tag?: string; ano?: number; pagina: number };

/** Lê e valida os filtros da URL (nunca confia no que vem dela). */
export function lerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const um = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const q = um("q")?.trim().slice(0, 200) || undefined;
  const curso = ESCOPOS.includes(um("curso") as Escopo) ? (um("curso") as Escopo) : undefined;
  const tagBruta = um("tag");
  const tag = tagBruta && /^[a-z0-9-]{1,60}$/.test(tagBruta) ? tagBruta : undefined;
  const anoN = Number.parseInt(um("ano") ?? "", 10);
  const ano = anoN >= 1990 && anoN <= 2100 ? anoN : undefined;
  const pag = Number.parseInt(um("pagina") ?? "1", 10);
  return { q, curso, tag, ano, pagina: Number.isFinite(pag) && pag > 0 ? Math.min(pag, 500) : 1 };
}

/** Monta a URL da vitrine trocando alguns filtros (e voltando para a página 1). */
export function urlVitrine(atual: Filtros, mudar: Partial<Filtros>) {
  const f = { ...atual, pagina: 1, ...mudar };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.curso) p.set("curso", f.curso);
  if (f.tag) p.set("tag", f.tag);
  if (f.ano) p.set("ano", String(f.ano));
  if (f.pagina > 1) p.set("pagina", String(f.pagina));
  const s = p.toString();
  return s ? `/?${s}` : "/";
}
