"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mensagemDoBanco } from "@/lib/projetos";
import { ESCOPOS, type Escopo } from "@/lib/validations/projeto";

type Papel = "USUARIO" | "MODERADOR" | "SUPERADMIN";

export async function definirPapel(userId: string, papel: Papel, escopos: Escopo[]) {
  if (!["USUARIO", "MODERADOR", "SUPERADMIN"].includes(papel)) return { erro: "Papel inválido." };
  if (escopos.some((e) => !ESCOPOS.includes(e))) return { erro: "Curso inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_definir_papel", { p_user: userId, p_papel: papel, p_escopos: escopos });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível salvar.") ?? undefined };
  revalidatePath("/admin");
  return { ok: true };
}

export async function verificar(userId: string, verificado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_verificar", { p_user: userId, p_verificado: verificado });
  if (error) return { erro: mensagemDoBanco(error, "Não foi possível salvar.") ?? undefined };
  revalidatePath("/admin");
  return { ok: true };
}
