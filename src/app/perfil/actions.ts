"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Perfil = z.object({
  nome: z.string().trim().min(2, "Nome muito curto.").max(120),
  bio: z.string().trim().max(500, "Bio com no máximo 500 caracteres."),
  linkedin_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[\w-]+\/?$/i.test(v), {
      message: "Use o link do perfil: https://www.linkedin.com/in/seu-usuario",
    }),
  perfil_publico: z.boolean(),
});

export type EstadoPerfil = { erro?: string; ok?: boolean };

export async function atualizarPerfil(_: EstadoPerfil, form: FormData): Promise<EstadoPerfil> {
  const parsed = Perfil.safeParse({
    nome: form.get("nome") ?? "",
    bio: form.get("bio") ?? "",
    linkedin_url: form.get("linkedin_url") ?? "",
    perfil_publico: form.get("perfil_publico") === "on",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return { erro: "Sessão expirada. Entre de novo." };

  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      bio: parsed.data.bio || null,
      linkedin_url: parsed.data.linkedin_url || null,
    })
    .eq("id", uid);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/perfil");
  return { ok: true };
}
