"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verificarRepoImportavel } from "@/lib/github";
import { gerarSlug, mensagemDoBanco, type PapelMembro } from "@/lib/projetos";
import { GITHUB_REPO, ProjetoSchema, type DadosProjeto } from "@/lib/validations/projeto";

type Resultado = { erro?: string; ok?: boolean };

function camposDoProjeto(d: ReturnType<typeof ProjetoSchema.parse>) {
  return {
    titulo: d.titulo,
    resumo: d.resumo,
    descricao_md: d.descricao_md || null,
    repo_url: d.repo_url || null,
    demo_url: d.demo_url || null,
    video_url: d.video_url || null,
    ano: d.ano,
    escopos: d.escopos,
  };
}

export async function criarProjeto(dados: DadosProjeto, githubRepo?: string): Promise<Resultado> {
  const parsed = ProjetoSchema.safeParse(dados);
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return { erro: "Sessão expirada. Entre de novo." };

  // Importação do GitHub: confere de novo no servidor (não confia no navegador).
  let repo: string | null = null;
  if (githubRepo) {
    if (!GITHUB_REPO.test(githubRepo)) return { erro: "Repositório inválido." };
    const { data: perfil } = await supabase.from("profiles").select("github_username").eq("id", uid).single();
    if (!perfil?.github_username) return { erro: "Vincule seu GitHub no perfil para importar repositórios." };
    const v = await verificarRepoImportavel(perfil.github_username, githubRepo);
    if (!v.ok) return { erro: v.erro };
    repo = v.repo.fullName;
  }

  const { data: id, error } = await supabase.rpc("criar_projeto", {
    p_dados: { ...camposDoProjeto(parsed.data), slug: gerarSlug(parsed.data.titulo), github_repo: repo },
    p_tags: parsed.data.tags,
  });
  if (error || !id) return { erro: mensagemDoBanco(error) ?? "Não foi possível criar o projeto." };

  revalidatePath("/projetos");
  redirect(`/projetos/${id}/editar?criado=1`);
}

export async function atualizarProjeto(id: string, dados: DadosProjeto): Promise<Resultado> {
  const parsed = ProjetoSchema.safeParse(dados);
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projetos")
    .update(camposDoProjeto(parsed.data))
    .eq("id", id)
    .select("id");
  if (error) return { erro: mensagemDoBanco(error) ?? "Não foi possível salvar." };
  if (!data?.length) return { erro: "Você não tem permissão para editar este projeto." };

  const { error: errTags } = await supabase.rpc("definir_tags", { p_projeto: id, p_tags: parsed.data.tags });
  if (errTags) return { erro: mensagemDoBanco(errTags) ?? "Projeto salvo, mas as tags não." };

  revalidatePath(`/projetos/${id}/editar`);
  revalidatePath("/projetos");
  return { ok: true };
}

async function chamar(rpc: string, args: Record<string, unknown>, id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(rpc, args);
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível concluir.") ?? undefined };
  revalidatePath(`/projetos/${id}/editar`);
  revalidatePath("/projetos");
  return { ok: true };
}

export async function submeterProjeto(id: string) {
  return chamar("submeter_projeto", { p_projeto: id }, id);
}

export async function retirarSubmissao(id: string) {
  return chamar("retirar_submissao", { p_projeto: id }, id);
}

export async function adicionarMembro(id: string, identificador: string, papel: PapelMembro) {
  const ident = identificador.trim();
  if (ident.length < 2 || ident.length > 120) return { erro: "Informe o @ do GitHub ou o e-mail @unifei.edu.br." };
  if (!["AUTOR", "ORIENTADOR", "COLABORADOR"].includes(papel)) return { erro: "Papel inválido." };
  return chamar("adicionar_membro", { p_projeto: id, p_identificador: ident, p_papel: papel }, id);
}

export async function removerMembro(id: string, userId: string) {
  return chamar("remover_membro", { p_projeto: id, p_user: userId }, id);
}

export async function definirCapa(id: string, path: string | null): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").update({ capa_path: path }).eq("id", id).select("id");
  if (error) return { erro: mensagemDoBanco(error) ?? "Não foi possível salvar a capa." };
  if (!data?.length) return { erro: "Sem permissão para alterar a capa." };
  revalidatePath(`/projetos/${id}/editar`);
  return { ok: true };
}

export async function excluirProjeto(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").delete().eq("id", id).select("id");
  if (error) return { erro: "Não foi possível excluir." };
  if (!data?.length) return { erro: "Só o autor exclui, e apenas rascunhos ou projetos recusados." };
  revalidatePath("/projetos");
  redirect("/projetos");
}
