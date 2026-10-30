"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/tipos";
import { atualizarPerfil, type EstadoPerfil } from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export function FormPerfil({ profile }: { profile: Profile }) {
  const [estado, acao, salvando] = useActionState<EstadoPerfil, FormData>(atualizarPerfil, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input name="nome" defaultValue={profile.nome} className={campo} required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bio
        <textarea name="bio" defaultValue={profile.bio ?? ""} rows={3} maxLength={500} className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        LinkedIn
        <input name="linkedin_url" defaultValue={profile.linkedin_url ?? ""} placeholder="https://www.linkedin.com/in/seu-usuario" className={campo} />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="perfil_publico" defaultChecked={profile.perfil_publico} className="mt-1" />
        <span>
          Perfil público — nome, foto, bio, links e cursos aparecem para qualquer visitante.
          Seu e-mail nunca é exibido.
        </span>
      </label>
      {estado.erro && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-700 dark:text-green-300">Perfil salvo.</p>}
      <button
        disabled={salvando}
        className="self-start rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
