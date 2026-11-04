import type { SupabaseClient } from "@supabase/supabase-js";
import type { Alteracao, Membro, Projeto, Tag } from "@/lib/projetos";
import type { Escopo } from "@/lib/validations/projeto";

export async function listarTags(supabase: SupabaseClient) {
  const { data } = await supabase.from("tags").select("id, nome, slug, categoria, logo_path, descricao, site_url").order("nome");
  return (data ?? []) as Tag[];
}

export async function escoposDoUsuario(supabase: SupabaseClient, uid: string): Promise<Escopo[]> {
  const { data } = await supabase.from("vinculos").select("nivel, curso").eq("user_id", uid);
  const escopos = new Set<Escopo>();
  for (const v of data ?? []) escopos.add(v.nivel === "POS" ? "POS" : (v.curso as Escopo));
  return [...escopos];
}

const LINGUAGEM_PARA_TAG: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  "jupyter notebook": "python",
  "next.js": "nextjs",
  "node.js": "nodejs",
};

/** Sugere tags existentes a partir dos tópicos e da linguagem do repositório. */
export function sugerirTags(tags: Tag[], topicos: string[], linguagem: string | null) {
  const candidatos = new Set(topicos.map((t) => t.toLowerCase()));
  if (linguagem) {
    const l = linguagem.toLowerCase();
    candidatos.add(LINGUAGEM_PARA_TAG[l] ?? l.replace(/[^a-z0-9]+/g, "-"));
  }
  for (const t of [...candidatos]) if (LINGUAGEM_PARA_TAG[t]) candidatos.add(LINGUAGEM_PARA_TAG[t]);
  return tags.filter((t) => candidatos.has(t.slug)).slice(0, 10).map((t) => t.id);
}

export async function carregarProjeto(supabase: SupabaseClient, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, slug, titulo, resumo, descricao_md, repo_url, demo_url, video_url, capa_path, github_repo, escopos, ano, status, motivo_rejeicao, updated_at")
    .eq("id", id)
    .maybeSingle<Projeto>();
  if (!projeto) return null;

  const [{ data: membros }, { data: tagsDoProjeto }, { data: alteracao }] = await Promise.all([
    supabase.rpc("membros_do_projeto", { p_projeto: id }),
    supabase.from("projeto_tags").select("tag_id").eq("projeto_id", id),
    // RLS: só membros e moderação do escopo leem a alteração proposta.
    supabase.from("projeto_alteracoes").select("dados, tags, enviado_em, motivo_recusa").eq("projeto_id", id).maybeSingle<Alteracao>(),
  ]);

  return {
    projeto,
    membros: (membros ?? []) as Membro[],
    tagIds: (tagsDoProjeto ?? []).map((t: { tag_id: string }) => t.tag_id),
    alteracao: alteracao ?? null,
  };
}
