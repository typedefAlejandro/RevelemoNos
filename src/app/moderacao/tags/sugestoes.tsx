"use client";

import { useState, useTransition } from "react";
import { CATEGORIA_ROTULO, ORDEM_CATEGORIAS, type CategoriaTag, type Tag } from "@/lib/projetos";
import { alertaErro, botaoSecundario, campo } from "../../projetos/estilos";
import { decidirSugestao } from "../actions";

export type Sugestao = {
  id: string;
  nome: string;
  categoria: CategoriaTag;
  created_at: string;
  projetos: { titulo: string } | null;
};

function Linha({ s, tags }: { s: Sugestao; tags: Tag[] }) {
  const [nome, setNome] = useState(s.nome);
  const [categoria, setCategoria] = useState<CategoriaTag>(s.categoria);
  const [modo, setModo] = useState<"nada" | "mesclar" | "recusar">("nada");
  const [existente, setExistente] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  function rodar(decisao: "APROVAR" | "MESCLAR" | "RECUSAR") {
    setErro(null);
    startTransition(async () => {
      const r = await decidirSugestao(s.id, decisao, { nome, categoria, tagExistente: existente, motivo });
      if (r.erro) setErro(r.erro);
    });
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input className={`${campo} sm:flex-1`} value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} aria-label="Nome da tag" />
        <select className={`${campo} sm:w-44`} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaTag)} aria-label="Categoria">
          {ORDEM_CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_ROTULO[c]}</option>)}
        </select>
      </div>
      <p className="text-xs text-neutral-500">
        Sugerida em {new Date(s.created_at).toLocaleDateString("pt-BR")}
        {s.projetos && <> para o projeto <strong>{s.projetos.titulo}</strong> (entra nele automaticamente se aprovada)</>}
        . Você pode corrigir o nome e a categoria antes de aprovar.
      </p>

      {modo === "mesclar" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className={campo} value={existente} onChange={(e) => setExistente(e.target.value)}>
            <option value="">Escolha a tag que já existe…</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.nome} ({CATEGORIA_ROTULO[t.categoria]})</option>)}
          </select>
          <button type="button" disabled={ocupado || !existente} onClick={() => rodar("MESCLAR")} className={`shrink-0 ${botaoSecundario}`}>Usar esta</button>
        </div>
      )}
      {modo === "recusar" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={campo} value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional, quem sugeriu vai ver)" />
          <button type="button" disabled={ocupado} onClick={() => rodar("RECUSAR")} className="shrink-0 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Recusar</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={ocupado} onClick={() => rodar("APROVAR")} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
          Aprovar como tag nova
        </button>
        <button type="button" onClick={() => setModo(modo === "mesclar" ? "nada" : "mesclar")} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700">
          Já existe parecida
        </button>
        <button type="button" onClick={() => setModo(modo === "recusar" ? "nada" : "recusar")} className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 underline">
          Recusar
        </button>
      </div>
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
    </li>
  );
}

export function SugestoesPendentes({ sugestoes, tags }: { sugestoes: Sugestao[]; tags: Tag[] }) {
  if (sugestoes.length === 0) return null;
  return (
    <section className="mb-10 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Sugestões aguardando ({sugestoes.length})</h2>
      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-amber-300 dark:divide-neutral-800 dark:border-amber-800">
        {sugestoes.map((s) => <Linha key={s.id} s={s} tags={tags} />)}
      </ul>
    </section>
  );
}
