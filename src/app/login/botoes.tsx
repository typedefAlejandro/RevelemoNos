"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function BotoesLogin() {
  const [carregando, setCarregando] = useState<"google" | "github" | null>(null);

  async function entrar(provider: "google" | "github") {
    setCarregando(provider);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // "hd" só filtra a tela do Google; quem barra de verdade é o banco.
        queryParams:
          provider === "google"
            ? { hd: "unifei.edu.br", prompt: "select_account" }
            : undefined,
      },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => entrar("google")}
        disabled={carregando !== null}
        className="rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {carregando === "google" ? "Abrindo o Google…" : "Entrar com Google (@unifei.edu.br)"}
      </button>
      <button
        onClick={() => entrar("github")}
        disabled={carregando !== null}
        className="rounded-lg border border-neutral-300 px-4 py-3 font-medium transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        {carregando === "github" ? "Abrindo o GitHub…" : "Entrar com GitHub (já vinculado)"}
      </button>
      <p className="text-xs text-neutral-500">
        Primeiro acesso? Entre com o Google da UNIFEI. Depois, no seu perfil,
        vincule o GitHub para entrar por ele também e importar seus repositórios.
      </p>
    </div>
  );
}
