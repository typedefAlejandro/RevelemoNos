import Link from "next/link";
import { Suspense } from "react";
import { exigirModerador } from "@/lib/auth";
import { STATUS_INFO, type StatusProjeto } from "@/lib/projetos";
import { AbasModeracao } from "../abas";

type Linha = {
  id: string;
  decisao: StatusProjeto;
  motivo: string | null;
  created_at: string;
  moderador_id: string | null;
  projetos: { id: string; titulo: string } | null;
};

async function Lista() {
  const { supabase, uid } = await exigirModerador();
  const { data } = await supabase
    .from("moderacoes")
    .select("id, decisao, motivo, created_at, moderador_id, projetos(id, titulo)")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Linha[]>();

  if (!data?.length) return <p className="text-neutral-500">Nenhuma decisão registrada ainda.</p>;

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {data.map((h) => (
        <li key={h.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_INFO[h.decisao].classe}`}>{STATUS_INFO[h.decisao].rotulo}</span>
            {h.projetos && <Link href={`/moderacao/${h.projetos.id}`} className="font-medium hover:underline">{h.projetos.titulo}</Link>}
            <span className="text-neutral-500">
              · {new Date(h.created_at).toLocaleString("pt-BR")} · {h.moderador_id === uid ? "por você" : "por outro moderador"}
            </span>
          </div>
          {h.motivo && <p className="whitespace-pre-line text-neutral-600 dark:text-neutral-400">{h.motivo}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function HistoricoPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Moderação</h1>
      <AbasModeracao ativa="/moderacao/historico" />
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Lista />
      </Suspense>
    </main>
  );
}
