"use client";

import { useState, useTransition } from "react";
import { CURSOS, type Curso, type TipoUsuario, type Vinculo } from "@/lib/tipos";
import { concluirOnboarding, type DadosOnboarding } from "./actions";

const campo =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

function anoOuNull(v: string) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function FormularioOnboarding({
  tipoInicial,
  vinculosIniciais,
}: {
  tipoInicial: TipoUsuario;
  vinculosIniciais: Vinculo[];
}) {
  const grad = vinculosIniciais.find((v) => v.nivel === "GRADUACAO");
  const pos = vinculosIniciais.find((v) => v.nivel === "POS");

  const [tipo, setTipo] = useState<TipoUsuario>(tipoInicial);
  const [temGrad, setTemGrad] = useState(!!grad || vinculosIniciais.length === 0);
  const [curso, setCurso] = useState<Curso>(grad?.curso ?? "CCO");
  const [statusGrad, setStatusGrad] = useState(grad?.status ?? "ATIVO");
  const [anoGrad, setAnoGrad] = useState(grad?.ano_ingresso?.toString() ?? "");
  const [temPos, setTemPos] = useState(!!pos);
  const [programa, setPrograma] = useState(pos?.programa ?? "");
  const [statusPos, setStatusPos] = useState(pos?.status ?? "ATIVO");
  const [anoPos, setAnoPos] = useState(pos?.ano_ingresso?.toString() ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();

  const professor = tipo === "PROFESSOR";

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const vinculos: DadosOnboarding["vinculos"] = [];
    if (temGrad) {
      vinculos.push({ nivel: "GRADUACAO", curso, status: statusGrad, ano_ingresso: professor ? null : anoOuNull(anoGrad) });
    }
    if (temPos) {
      vinculos.push({ nivel: "POS", programa, status: statusPos, ano_ingresso: professor ? null : anoOuNull(anoPos) });
    }
    setErro(null);
    startTransition(async () => {
      const r = await concluirOnboarding({ tipo, vinculos });
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Você é…</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["ALUNO", "PROFESSOR"] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border px-4 py-3 text-center font-medium ${
                tipo === t
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "ALUNO" ? "Aluno(a)" : "Professor(a)"}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={temGrad} onChange={(e) => setTemGrad(e.target.checked)} />
          {professor ? "Atuo na graduação" : "Graduação"}
        </label>
        {temGrad && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm sm:col-span-3">
              Curso
              <select className={campo} value={curso} onChange={(e) => setCurso(e.target.value as Curso)}>
                {Object.entries(CURSOS).map(([sigla, nome]) => (
                  <option key={sigla} value={sigla}>{sigla} — {nome}</option>
                ))}
              </select>
            </label>
            {!professor && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Situação
                  <select className={campo} value={statusGrad} onChange={(e) => setStatusGrad(e.target.value as "ATIVO" | "EGRESSO")}>
                    <option value="ATIVO">Cursando</option>
                    <option value="EGRESSO">Formado(a)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Ano de ingresso
                  <input className={campo} inputMode="numeric" placeholder="2023" value={anoGrad} onChange={(e) => setAnoGrad(e.target.value)} />
                </label>
              </>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={temPos} onChange={(e) => setTemPos(e.target.checked)} />
          {professor ? "Atuo na pós-graduação" : "Pós-graduação"}
        </label>
        {temPos && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm sm:col-span-3">
              Programa
              <input className={campo} placeholder="Ex.: Mestrado em Ciência e Tecnologia da Computação" value={programa} onChange={(e) => setPrograma(e.target.value)} />
            </label>
            {!professor && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Situação
                  <select className={campo} value={statusPos} onChange={(e) => setStatusPos(e.target.value as "ATIVO" | "EGRESSO")}>
                    <option value="ATIVO">Cursando</option>
                    <option value="EGRESSO">Concluído</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Ano de ingresso
                  <input className={campo} inputMode="numeric" placeholder="2025" value={anoPos} onChange={(e) => setAnoPos(e.target.value)} />
                </label>
              </>
            )}
          </div>
        )}
      </fieldset>

      {erro && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {salvando ? "Salvando…" : "Salvar e continuar"}
      </button>
      <p className="text-xs text-neutral-500">
        Essas informações são conferidas por um admin do DACOMP. Alterar depois
        faz o perfil voltar para &quot;não verificado&quot;.
      </p>
    </form>
  );
}
