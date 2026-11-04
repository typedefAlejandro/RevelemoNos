"use client";

import { useState, useTransition } from "react";
import { descartarAlteracao } from "../../actions";

export function DescartarAlteracao({ projetoId }: { projetoId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="self-start text-xs underline">
        Descartar a versão nova e manter só a publicada
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      Descartar mesmo?
      <button
        type="button"
        disabled={ocupado}
        onClick={() => startTransition(async () => {
          const r = await descartarAlteracao(projetoId);
          if (r.erro) setErro(r.erro);
        })}
        className="font-medium underline"
      >
        Sim, descartar
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="underline">Cancelar</button>
      {erro && <span className="text-red-700">{erro}</span>}
    </span>
  );
}
