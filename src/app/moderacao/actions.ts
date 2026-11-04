"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mensagemDoBanco } from "@/lib/projetos";

type Decisao = "APROVADO" | "REJEITADO" | "ARQUIVADO";

export async function moderar(id: string, decisao: Decisao, motivo: string) {
  if (!["APROVADO", "REJEITADO", "ARQUIVADO"].includes(decisao)) return { erro: "Decisão inválida." };
  if (motivo.length > 2000) return { erro: "Motivo com no máximo 2000 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderar_projeto", {
    p_projeto: id,
    p_decisao: decisao,
    p_motivo: motivo.trim() || null,
  });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível registrar a decisão.") ?? undefined };
  revalidatePath("/moderacao");
  redirect(`/moderacao?feito=${decisao.toLowerCase()}`);
}

const NovaTag = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(40, "Nome com no máximo 40 caracteres."),
  categoria: z.enum(["TEMA", "CONTEXTO", "TECNOLOGIA"]),
});

function slugTag(nome: string) {
  return nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, "p").replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function criarTag(nome: string, categoria: string) {
  const parsed = NovaTag.safeParse({ nome, categoria });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };
  const slug = slugTag(parsed.data.nome);
  if (!slug) return { erro: "Nome inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("tags").insert({ nome: parsed.data.nome, slug, categoria: parsed.data.categoria });
  if (error) return { erro: error.code === "23505" ? "Já existe uma tag com esse nome." : "Sem permissão ou dados inválidos." };
  revalidatePath("/moderacao/tags");
  return { ok: true };
}

export async function excluirTag(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erro: "Não foi possível excluir a tag." };
  revalidatePath("/moderacao/tags");
  return { ok: true };
}
