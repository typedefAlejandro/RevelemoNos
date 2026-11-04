import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Membro, Projeto, Tag } from "@/lib/projetos";

/**
 * Projeto pelo slug. A RLS decide: visitante só acha APROVADO;
 * membros também acham o próprio rascunho (vira uma prévia).
 * `cache` evita buscar duas vezes (metadata + página).
 */
export const projetoPorSlug = cache(async (slug: string) => {
  await connection();
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, slug, titulo, resumo, descricao_md, repo_url, demo_url, video_url, capa_path, github_repo, escopos, ano, status, motivo_rejeicao, updated_at, aprovado_em")
    .eq("slug", slug)
    .maybeSingle<Projeto & { aprovado_em: string | null }>();
  if (!projeto) return null;

  const [{ data: membros }, { data: tags }] = await Promise.all([
    supabase.rpc("membros_do_projeto", { p_projeto: projeto.id }),
    supabase.from("projeto_tags").select("tags(id, nome, slug, categoria, logo_path)").eq("projeto_id", projeto.id),
  ]);

  return {
    projeto,
    membros: (membros ?? []) as (Membro & { perfil_publico: boolean })[],
    tags: ((tags ?? []) as unknown as { tags: Tag | null }[]).map((t) => t.tags).filter(Boolean) as Tag[],
  };
});
