"use client";

import { useState, useTransition } from "react";
import type { StatusProjeto } from "@/lib/projetos";
import { excluirProjeto, retirarSubmissao, submeterProjeto } from "../../actions";
import { alertaErro, botaoPrimario, botaoSecundario } from "../../estilos";

export function Acoes({ projetoId, status, autor }: { projetoId: string; status: StatusProjeto; autor: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, startTransition] = useTransition();

  function rodar(fn: () => Promise<{ erro?: string } | void>) {
    setErro(null);
    startTransition(async () => {
      const r = await fn();
      if (r && r.erro) setErro(r.erro);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {(status === "RASCUNHO" || status === "REJEITADO") && (
          <button type="button" disabled={ocupado} onClick={() => rodar(() => submeterProjeto(projetoId))} className={botaoPrimario}>
            {status === "REJEITADO" ? "Reenviar para aprovação" : "Enviar para aprovação"}
          </button>
        )}
        {status === "PENDENTE" && (
          <button type="button" disabled={ocupado} onClick={() => rodar(() => retirarSubmissao(projetoId))} className={botaoSecundario}>
            Voltar para rascunho
          </button>
        )}
        {autor && (status === "RASCUNHO" || status === "REJEITADO") && (
          confirmando ? (
            <span className="flex items-center gap-2 text-sm">
              Excluir de vez?
              <button type="button" disabled={ocupado} onClick={() => rodar(() => excluirProjeto(projetoId))} className="font-medium text-red-700 underline dark:text-red-400">
                Sim, excluir
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className="underline">Cancelar</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmando(true)} className="text-sm text-neutral-500 underline hover:text-red-700">
              Excluir projeto
            </button>
          )
        )}
      </div>
      {status === "RASCUNHO" && (
        <p className="text-xs text-neutral-500">Ao enviar, um moderador do curso revisa antes de o projeto aparecer na vitrine.</p>
      )}
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
    </div>
  );
}
