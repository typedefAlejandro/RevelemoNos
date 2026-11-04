"use client";

import { useState, useTransition } from "react";
import type { StatusProjeto } from "@/lib/projetos";
import { alertaErro, botaoPrimario, botaoSecundario, campo } from "../../projetos/estilos";
import { moderar, moderarAlteracao } from "../actions";

export function Decisao({ projetoId, status, revisao = false, bloqueado }: { projetoId: string; status: StatusProjeto; revisao?: boolean; bloqueado: string | null }) {
  const [modo, setModo] = useState<"nada" | "ajustes" | "arquivar">("nada");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  function decidir(decisao: "APROVADO" | "REJEITADO" | "ARQUIVADO") {
    setErro(null);
    startTransition(async () => {
      const r = await moderar(projetoId, decisao, decisao === "APROVADO" ? "" : motivo);
      if (r?.erro) setErro(r.erro);
    });
  }

  function decidirAlteracao(aceitar: boolean) {
    setErro(null);
    startTransition(async () => {
      const r = await moderarAlteracao(projetoId, aceitar, motivo);
      if (r?.erro) setErro(r.erro);
    });
  }

  if (bloqueado) return <p className="text-sm text-neutral-600 dark:text-neutral-400">{bloqueado}</p>;

  if (status === "APROVADO" && revisao) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Os autores propuseram uma nova versão. A atual continua no ar até você decidir.</p>
        {modo === "ajustes" ? (
          <>
            <textarea className={campo} rows={4} maxLength={2000} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O que precisa mudar na versão nova? A versão publicada continua no ar." />
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={ocupado} onClick={() => decidirAlteracao(false)} className={botaoPrimario}>Recusar a versão nova</button>
              <button type="button" onClick={() => setModo("nada")} className="text-sm underline">Cancelar</button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={ocupado} onClick={() => decidirAlteracao(true)} className="rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-60">
              {ocupado ? "Salvando…" : "Aceitar e publicar a versão nova"}
            </button>
            <button type="button" disabled={ocupado} onClick={() => setModo("ajustes")} className={botaoSecundario}>Recusar (pedir ajustes)</button>
          </div>
        )}
        {erro && <p role="alert" className={alertaErro}>{erro}</p>}
      </div>
    );
  }

  if (status === "APROVADO") {
    return (
      <div className="flex flex-col gap-3">
        {modo !== "arquivar" ? (
          <button type="button" onClick={() => setModo("arquivar")} className={`self-start ${botaoSecundario}`}>Despublicar projeto</button>
        ) : (
          <>
            <textarea className={campo} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que o projeto está saindo do ar? Os autores vão ler." />
            <div className="flex gap-3">
              <button type="button" disabled={ocupado} onClick={() => decidir("ARQUIVADO")} className="rounded-lg bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-60">Confirmar despublicação</button>
              <button type="button" onClick={() => setModo("nada")} className="text-sm underline">Cancelar</button>
            </div>
          </>
        )}
        {erro && <p role="alert" className={alertaErro}>{erro}</p>}
      </div>
    );
  }

  if (status !== "PENDENTE") {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Este projeto não está aguardando aprovação.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {modo === "ajustes" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">O que precisa mudar?</span>
            <textarea
              className={campo}
              rows={4}
              maxLength={2000}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Seja específico e gentil: o que falta e como resolver. Os autores vão ler exatamente isto."
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={ocupado} onClick={() => decidir("REJEITADO")} className={botaoPrimario}>Enviar pedido de ajustes</button>
            <button type="button" onClick={() => setModo("nada")} className="text-sm underline">Cancelar</button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={ocupado} onClick={() => decidir("APROVADO")} className="rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800 disabled:opacity-60">
            {ocupado ? "Salvando…" : "Aprovar e publicar"}
          </button>
          <button type="button" disabled={ocupado} onClick={() => setModo("ajustes")} className={botaoSecundario}>Pedir ajustes</button>
        </div>
      )}
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
    </div>
  );
}
