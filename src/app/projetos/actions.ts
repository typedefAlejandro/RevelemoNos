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

/**
 * `manter` só vale para projeto publicado:
 *   true  → a versão publicada continua no ar e esta vira uma alteração
 *           proposta (projeto_alteracoes), revisada pela moderação;
 *   false → edição direta: o projeto sai do ar (PENDENTE) até nova aprovação.
 */
export async function atualizarProjeto(id: string, dados: DadosProjeto, manter = false): Promise<Resultado & { proposta?: boolean }> {
  const parsed = ProjetoSchema.safeParse(dados);
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };
  const supabase = await createClient();

  const { data: atual } = await supabase.from("projetos").select("status").eq("id", id).maybeSingle();
  if (!atual) return { erro: "Projeto não encontrado." };

  if (atual.status === "APROVADO" && manter) {
    const { data: r, error } = await supabase.rpc("propor_alteracao", {
      p_projeto: id,
      p_dados: camposDoProjeto(parsed.data),
      p_tags: parsed.data.tags,
    });
    if (error) return { erro: mensagemDoBanco(error) ?? "Não foi possível enviar a alteração." };
    revalidatePath(`/projetos/${id}/editar`);
    revalidatePath("/moderacao");
    return r === "sem_mudancas" ? { ok: true } : { ok: true, proposta: true };
  }

  // Edição direta. Se havia uma capa proposta, ela entra junto.
  const campos: Record<string, unknown> = camposDoProjeto(parsed.data);
  if (atual.status === "APROVADO") {
    const { data: alt } = await supabase.from("projeto_alteracoes").select("dados").eq("projeto_id", id).maybeSingle();
    const capa = (alt?.dados as { capa_path?: string | null } | undefined)?.capa_path;
    if (capa !== undefined) campos.capa_path = capa;
  }

  const { data, error } = await supabase.from("projetos").update(campos).eq("id", id).select("id");
  if (error) return { erro: mensagemDoBanco(error) ?? "Não foi possível salvar." };
  if (!data?.length) return { erro: "Você não tem permissão para editar este projeto." };

  const { error: errTags } = await supabase.rpc("definir_tags", { p_projeto: id, p_tags: parsed.data.tags });
  if (errTags) return { erro: mensagemDoBanco(errTags) ?? "Projeto salvo, mas as tags não." };

  revalidatePath(`/projetos/${id}/editar`);
  revalidatePath("/projetos");
  revalidatePath("/");
  return { ok: true };
}

export async function descartarAlteracao(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("descartar_alteracao", { p_projeto: id });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível descartar.") ?? undefined };
  revalidatePath(`/projetos/${id}/editar`);
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

export async function definirCapa(id: string, path: string | null, manter = false): Promise<Resultado> {
  const supabase = await createClient();
  if (manter) {
    const { error } = await supabase.rpc("propor_alteracao", { p_projeto: id, p_dados: { capa_path: path } });
    if (error) return { erro: mensagemDoBanco(error) ?? "Não foi possível propor a capa." };
    revalidatePath(`/projetos/${id}/editar`);
    return { ok: true };
  }
  const { data, error } = await supabase.from("projetos").update({ capa_path: path }).eq("id", id).select("id");
  if (error) return { erro: mensagemDoBanco(error) ?? "Não foi possível salvar a capa." };
  if (!data?.length) return { erro: "Sem permissão para alterar a capa." };
  revalidatePath(`/projetos/${id}/editar`);
  revalidatePath("/");
  return { ok: true };
}

const CATEGORIAS = ["GRUPO", "CONTEXTO", "TEMA", "TECNOLOGIA"] as const;

/** Sugere uma tag nova. Se já existir, devolve o id para marcar direto. */
export async function sugerirTag(nome: string, categoria: string, projetoId?: string) {
  const n = nome.trim().replace(/\s+/g, " ");
  if (n.length < 2 || n.length > 40) return { erro: "O nome precisa ter entre 2 e 40 caracteres." };
  if (!CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number])) return { erro: "Categoria inválida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sugerir_tag", {
    p_nome: n,
    p_categoria: categoria,
    p_projeto: projetoId ?? null,
  });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível enviar a sugestão.") ?? undefined };
  if (projetoId) revalidatePath(`/projetos/${projetoId}/editar`);
  return data as { status: "existe" | "enviada" | "ja_sugerida"; tag_id?: string };
}

export async function excluirProjeto(id: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projetos").delete().eq("id", id).select("id");
  if (error) return { erro: "Não foi possível excluir." };
  if (!data?.length) return { erro: "Só o autor exclui, e apenas rascunhos ou projetos recusados." };
  revalidatePath("/projetos");
  redirect("/projetos");
}
