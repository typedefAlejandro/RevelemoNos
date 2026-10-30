import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/tipos";

/**
 * Lê a sessão (JWT verificado via getClaims) e o perfil do usuário.
 * Use dentro de um componente envolto em <Suspense> (lê cookies).
 */
export async function getSessao() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return { supabase, uid: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single<Profile>();

  return { supabase, uid, profile };
}

/** Exige login e onboarding concluído; redireciona se faltar algo. */
export async function exigirPerfil(opts: { permitirSemOnboarding?: boolean } = {}) {
  const sessao = await getSessao();
  if (!sessao.uid || !sessao.profile) redirect("/login");
  if (!sessao.profile.onboarding_completo && !opts.permitirSemOnboarding) {
    redirect("/onboarding");
  }
  return sessao as typeof sessao & { uid: string; profile: Profile };
}
