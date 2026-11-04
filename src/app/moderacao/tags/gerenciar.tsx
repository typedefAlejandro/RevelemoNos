"use client";

import { useState, useTransition } from "react";
import { CATEGORIA_ROTULO, ORDEM_CATEGORIAS as ORDEM, type CategoriaTag, type Tag } from "@/lib/projetos";
import { alertaErro, botaoSecundario, campo } from "../../projetos/estilos";
import { criarTag, excluirTag } from "../actions";
import { EditarGrupo } from "./grupo";

export function GerenciarTags({ tags, usos }: { tags: Tag[]; usos: Record<string, number> }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<CategoriaTag>("TEMA");
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const r = await criarTag(nome, categoria);
      if (r.erro) setErro(r.erro);
      else setNome("");
    });
  }

  function excluir(id: string) {
    setErro(null);
    startTransition(async () => {
      const r = await excluirTag(id);
      if (r.erro) setErro(r.erro);
      setConfirmar(null);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={criar} className="flex flex-col gap-2 sm:flex-row">
        <input className={campo} value={nome} maxLength={40} onChange={(e) => setNome(e.target.value)} placeholder="Nome da nova tag (ex.: Visão Computacional)" />
        <select className={`${campo} sm:w-44`} value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaTag)}>
          {ORDEM.map((c) => <option key={c} value={c}>{CATEGORIA_ROTULO[c]}</option>)}
        </select>
        <button disabled={ocupado || !nome.trim()} className={`shrink-0 ${botaoSecundario}`}>Criar tag</button>
      </form>
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}

      {ORDEM.map((c) => (
        <section key={c} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{CATEGORIA_ROTULO[c]}</h2>
          <ul className="flex flex-wrap gap-2">
            {tags.filter((t) => t.categoria === c).map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-full border border-neutral-300 py-0.5 pl-3 pr-1 text-sm dark:border-neutral-700">
                {t.nome}
                <span className="text-xs text-neutral-500">{usos[t.id] ?? 0}</span>
                {t.categoria === "GRUPO" && (
                  <button type="button" onClick={() => setEditando(editando === t.id ? null : t.id)} className="text-xs underline">
                    {t.logo_path ? "editar" : "logo"}
                  </button>
                )}
                {confirmar === t.id ? (
                  <button type="button" disabled={ocupado} onClick={() => excluir(t.id)} className="rounded-full bg-red-700 px-2 text-xs text-white">
                    excluir{usos[t.id] ? ` de ${usos[t.id]} projeto(s)` : ""}?
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmar(t.id)} aria-label={`Excluir ${t.nome}`} className="rounded-full px-1.5 text-neutral-400 hover:text-red-700">×</button>
                )}
              </li>
            ))}
          </ul>
          {c === "GRUPO" && editando && (() => {
            const g = tags.find((t) => t.id === editando);
            return g ? <EditarGrupo key={g.id} grupo={g} onFechar={() => setEditando(null)} /> : null;
          })()}
        </section>
      ))}
    </div>
  );
}
