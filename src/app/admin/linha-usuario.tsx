"use client";

import { useState, useTransition } from "react";
import { ESCOPO_ROTULO } from "@/lib/projetos";
import { ESCOPOS, type Escopo } from "@/lib/validations/projeto";
import { campo } from "../projetos/estilos";
import { definirPapel, verificar } from "./actions";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: "ALUNO" | "PROFESSOR";
  papel: "USUARIO" | "MODERADOR" | "SUPERADMIN";
  verificado: boolean;
  onboarding_completo: boolean;
  github_username: string | null;
  vinculos: string | null;
  escopos: Escopo[];
};

export function LinhaUsuario({ u, euMesmo }: { u: Usuario; euMesmo: boolean }) {
  const [papel, setPapel] = useState(u.papel);
  const [escopos, setEscopos] = useState<Escopo[]>(u.escopos);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [ocupado, startTransition] = useTransition();
  const mudouPapel = papel !== u.papel || escopos.join() !== u.escopos.join();

  function salvarPapel() {
    setMsg(null);
    startTransition(async () => {
      const r = await definirPapel(u.id, papel, papel === "MODERADOR" ? escopos : []);
      setMsg(r.erro ? { tipo: "erro", texto: r.erro } : { tipo: "ok", texto: "Salvo." });
    });
  }

  function alternarVerificado() {
    setMsg(null);
    startTransition(async () => {
      const r = await verificar(u.id, !u.verificado);
      if (r.erro) setMsg({ tipo: "erro", texto: r.erro });
    });
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {u.nome} {euMesmo && <span className="text-xs text-neutral-500">(você)</span>}
        </p>
        <p className="truncate text-sm text-neutral-500">{u.email}{u.github_username && ` · @${u.github_username}`}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {u.tipo === "PROFESSOR" ? "Professor(a)" : "Aluno(a)"} · {u.onboarding_completo ? (u.vinculos || "sem vínculo") : "cadastro incompleto"}
        </p>
      </div>

      <div className="flex flex-col gap-2 lg:w-80">
        <button
          type="button"
          disabled={ocupado}
          onClick={alternarVerificado}
          className={`self-start rounded-full px-3 py-1 text-xs font-medium ${u.verificado ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}
          title="Clique para alternar"
        >
          {u.verificado ? "✓ Vínculo verificado" : "Marcar vínculo como verificado"}
        </button>

        {!euMesmo && (
          <div className="flex flex-col gap-2">
            <select className={`${campo} text-sm`} value={papel} onChange={(e) => setPapel(e.target.value as Usuario["papel"])}>
              <option value="USUARIO">Usuário</option>
              <option value="MODERADOR">Moderador(a)</option>
              <option value="SUPERADMIN">Superadmin</option>
            </select>
            {papel === "MODERADOR" && (
              <div className="flex flex-wrap gap-1.5">
                {ESCOPOS.map((e) => (
                  <label key={e} className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs ${escopos.includes(e) ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`}>
                    <input type="checkbox" className="sr-only" checked={escopos.includes(e)} onChange={() => setEscopos(escopos.includes(e) ? escopos.filter((x) => x !== e) : [...escopos, e])} />
                    {ESCOPO_ROTULO[e]}
                  </label>
                ))}
              </div>
            )}
            {mudouPapel && (
              <button type="button" disabled={ocupado} onClick={salvarPapel} className="self-start rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
                Salvar papel
              </button>
            )}
          </div>
        )}
        {msg && <p className={`text-xs ${msg.tipo === "erro" ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>{msg.texto}</p>}
      </div>
    </li>
  );
}
