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

export async function moderarAlteracao(id: string, aceitar: boolean, motivo: string) {
  if (motivo.length > 2000) return { erro: "Motivo com no máximo 2000 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderar_alteracao", {
    p_projeto: id,
    p_aceitar: aceitar,
    p_motivo: motivo.trim() || null,
  });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível registrar a decisão.") ?? undefined };
  revalidatePath("/moderacao");
  revalidatePath("/");
  redirect(`/moderacao?feito=${aceitar ? "alteracao-aceita" : "alteracao-recusada"}`);
}

const NovaTag = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(40, "Nome com no máximo 40 caracteres."),
  categoria: z.enum(["GRUPO", "TEMA", "CONTEXTO", "TECNOLOGIA"]),
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

type DecisaoSugestao = "APROVAR" | "MESCLAR" | "RECUSAR";

export async function decidirSugestao(
  id: string,
  decisao: DecisaoSugestao,
  opcoes: { nome?: string; categoria?: string; tagExistente?: string; motivo?: string } = {},
) {
  if (!["APROVAR", "MESCLAR", "RECUSAR"].includes(decisao)) return { erro: "Decisão inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decidir_sugestao_tag", {
    p_sugestao: id,
    p_decisao: decisao,
    p_nome: opcoes.nome?.trim() || null,
    p_categoria: opcoes.categoria || null,
    p_tag_existente: opcoes.tagExistente || null,
    p_motivo: opcoes.motivo?.trim().slice(0, 500) || null,
  });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível decidir.") ?? undefined };
  revalidatePath("/moderacao/tags");
  revalidatePath("/moderacao");
  return { ok: true };
}

const Grupo = z.object({
  descricao: z.string().trim().max(500, "Descrição com no máximo 500 caracteres."),
  site_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), { message: "Use um link começando com https://" }),
  logo_path: z.string().regex(/^grupos\/[A-Za-z0-9._-]{1,120}$/).nullable(),
});

export async function atualizarGrupo(id: string, dados: { descricao: string; site_url: string; logo_path: string | null }) {
  const parsed = Grupo.safeParse(dados);
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .update({
      descricao: parsed.data.descricao || null,
      site_url: parsed.data.site_url || null,
      logo_path: parsed.data.logo_path,
    })
    .eq("id", id)
    .eq("categoria", "GRUPO")
    .select("slug");
  if (error || !data?.length) return { erro: "Não foi possível salvar o grupo." };
  revalidatePath("/moderacao/tags");
  revalidatePath(`/g/${data[0].slug}`);
  revalidatePath("/");
  return { ok: true };
}
