"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function BotaoVincularGitHub() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function vincular() {
    setCarregando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.linkIdentity({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/perfil` },
    });
    if (error) {
      setErro("Não foi possível iniciar o vínculo. Tente de novo.");
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={vincular}
        disabled={carregando}
        className="self-start rounded-lg border border-neutral-300 px-4 py-2 font-medium hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        {carregando ? "Abrindo o GitHub…" : "Vincular GitHub"}
      </button>
      {erro && <p className="text-sm text-red-700 dark:text-red-300">{erro}</p>}
    </div>
  );
}

export function BotaoDesvincularGitHub() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function desvincular() {
    setCarregando(true);
    setErro(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getUserIdentities();
    const github = data?.identities.find((i) => i.provider === "github");
    if (github) {
      const { error } = await supabase.auth.unlinkIdentity(github);
      if (error) {
        setErro("Não foi possível desvincular.");
        setCarregando(false);
        return;
      }
    }
    await supabase.rpc("sincronizar_github");
    router.refresh();
    setCarregando(false);
  }

  return (
    <>
      <button
        onClick={desvincular}
        disabled={carregando}
        className="text-sm text-neutral-500 underline hover:text-neutral-800 disabled:opacity-60 dark:hover:text-neutral-200"
      >
        {carregando ? "Desvinculando…" : "Desvincular"}
      </button>
      {erro && <span className="text-sm text-red-700 dark:text-red-300">{erro}</span>}
    </>
  );
}
