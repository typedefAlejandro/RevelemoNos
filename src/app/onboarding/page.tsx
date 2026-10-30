import { Suspense } from "react";
import { exigirPerfil } from "@/lib/auth";
import type { Vinculo } from "@/lib/tipos";
import { FormularioOnboarding } from "./formulario";

async function Conteudo() {
  const { supabase, uid, profile } = await exigirPerfil({ permitirSemOnboarding: true });
  const { data: vinculos } = await supabase
    .from("vinculos")
    .select("id, nivel, curso, programa, status, ano_ingresso")
    .eq("user_id", uid)
    .returns<Vinculo[]>();

  return (
    <>
      <p className="text-neutral-600 dark:text-neutral-400">
        Olá, {profile.nome.split(" ")[0]}! Conta pra gente qual é o seu vínculo com a Computação da UNIFEI.
      </p>
      <FormularioOnboarding tipoInicial={profile.tipo} vinculosIniciais={vinculos ?? []} />
    </>
  );
}

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Seu vínculo</h1>
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
