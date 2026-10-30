"use client";

import { useState, useTransition } from "react";
import { PAPEL_ROTULO, type Membro, type PapelMembro } from "@/lib/projetos";
import { adicionarMembro, removerMembro } from "../../actions";
import { alertaErro, botaoSecundario, campo } from "../../estilos";

export function Membros({ projetoId, uid, membros, podeEditar }: { projetoId: string; uid: string; membros: Membro[]; podeEditar: boolean }) {
  const [ident, setIdent] = useState("");
  const [papel, setPapel] = useState<PapelMembro>("AUTOR");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const r = await adicionarMembro(projetoId, ident, papel);
      if (r.erro) setErro(r.erro);
      else setIdent("");
    });
  }

  function remover(userId: string) {
    setErro(null);
    startTransition(async () => {
      const r = await removerMembro(projetoId, userId);
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {membros.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 px-3 py-2">
            {m.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.foto_url} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-sm font-bold dark:bg-neutral-800">{m.nome[0]}</span>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{m.nome}{m.user_id === uid && " (você)"}</p>
              <p className="text-xs text-neutral-500">
                {PAPEL_ROTULO[m.papel]}{m.github_username && ` · @${m.github_username}`}
              </p>
            </div>
            {(podeEditar || m.user_id === uid) && (
              <button type="button" disabled={ocupado} onClick={() => remover(m.user_id)} className="text-xs text-neutral-500 underline hover:text-red-700">
                {m.user_id === uid ? "Sair" : "Remover"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {podeEditar && (
        <form onSubmit={adicionar} className="flex flex-col gap-2 sm:flex-row">
          <input
            className={campo}
            value={ident}
            onChange={(e) => setIdent(e.target.value)}
            placeholder="@usuario-do-github ou email@unifei.edu.br"
          />
          <select className={`${campo} sm:w-44`} value={papel} onChange={(e) => setPapel(e.target.value as PapelMembro)}>
            <option value="AUTOR">Autor(a)</option>
            <option value="ORIENTADOR">Orientador(a)</option>
            <option value="COLABORADOR">Colaborador(a)</option>
          </select>
          <button disabled={ocupado || !ident.trim()} className={`shrink-0 ${botaoSecundario}`}>Adicionar</button>
        </form>
      )}
      <p className="text-xs text-neutral-500">
        A pessoa precisa já ter entrado no Revelemo-nos. Autores e orientadores editam; colaboradores só aparecem no projeto.
      </p>
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
    </div>
  );
}
