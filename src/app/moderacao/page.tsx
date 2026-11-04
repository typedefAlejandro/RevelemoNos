import Link from "next/link";
import { Suspense } from "react";
import { exigirModerador } from "@/lib/auth";
import { ESCOPO_ROTULO, PAPEL_ROTULO, urlCapa, type Membro, type Projeto } from "@/lib/projetos";
import { ESCOPOS, type Escopo } from "@/lib/validations/projeto";
import { alertaOk } from "../projetos/estilos";
import { AbasModeracao } from "./abas";

const FEITO: Record<string, string> = {
  aprovado: "Projeto aprovado e publicado.",
  rejeitado: "Ajustes pedidos. Os autores vão ver o seu motivo.",
  arquivado: "Projeto despublicado.",
};

type Item = Pick<Projeto, "id" | "titulo" | "resumo" | "escopos" | "updated_at" | "capa_path" | "github_repo">;

async function Fila({ searchParams }: { searchParams: Promise<{ escopo?: string; feito?: string }> }) {
  const { supabase, uid, profile } = await exigirModerador();
  const { escopo, feito } = await searchParams;
  const filtro = ESCOPOS.includes(escopo as Escopo) ? (escopo as Escopo) : null;

  // A RLS já entrega só o que este moderador pode ver (escopos dele).
  let query = supabase
    .from("projetos")
    .select("id, titulo, resumo, escopos, updated_at, capa_path, github_repo")
    .eq("status", "PENDENTE")
    .order("updated_at", { ascending: true });
  if (filtro) query = query.contains("escopos", [filtro]);
  const { data } = await query.returns<Item[]>();
  const itens = data ?? [];

  const membros = await Promise.all(
    itens.map(async (p) => {
      const { data: m } = await supabase.rpc("membros_do_projeto", { p_projeto: p.id });
      return (m ?? []) as Membro[];
    }),
  );

  let meusEscopos: string[] = [];
  if (profile.papel === "MODERADOR") {
    const { data: e } = await supabase.from("moderador_escopos").select("escopo").eq("user_id", uid);
    meusEscopos = (e ?? []).map((x: { escopo: string }) => x.escopo);
  }

  return (
    <div className="flex flex-col gap-6">
      {feito && FEITO[feito] && <p className={alertaOk}>{FEITO[feito]}</p>}
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {profile.papel === "SUPERADMIN"
          ? "Você é superadmin: vê os projetos de todos os cursos."
          : `Você modera: ${meusEscopos.map((e) => ESCOPO_ROTULO[e as Escopo]).join(", ") || "nenhum curso"}.`}
      </p>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/moderacao" className={`rounded-full border px-3 py-1 ${!filtro ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`}>Todos</Link>
        {ESCOPOS.map((e) => (
          <Link key={e} href={`/moderacao?escopo=${e}`} className={`rounded-full border px-3 py-1 ${filtro === e ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`}>
            {ESCOPO_ROTULO[e]}
          </Link>
        ))}
      </div>

      {itens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="font-medium">Nenhum projeto aguardando aprovação.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((p, i) => {
            const capa = urlCapa(p.capa_path);
            const souMembro = membros[i].some((m) => m.user_id === uid);
            const naoVerificados = membros[i].filter((m) => !m.verificado).length;
            return (
              <li key={p.id}>
                <Link href={`/moderacao/${p.id}`} className="flex gap-4 rounded-lg border border-neutral-200 p-3 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600">
                  <div className="hidden aspect-[16/9] w-36 shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:block dark:bg-neutral-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {capa && <img src={capa} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{p.titulo}</h2>
                      {p.escopos.map((e) => (
                        <span key={e} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{ESCOPO_ROTULO[e]}</span>
                      ))}
                      {souMembro && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">você é membro</span>}
                      {naoVerificados > 0 && <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-700">{naoVerificados} não verificado(s)</span>}
                    </div>
                    <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{p.resumo}</p>
                    <p className="text-xs text-neutral-500">
                      {membros[i].map((m) => `${m.nome} (${PAPEL_ROTULO[m.papel]})`).join(" · ")}
                      {" · enviado em "}
                      {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function ModeracaoPage({ searchParams }: PageProps<"/moderacao">) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Moderação</h1>
      <AbasModeracao ativa="/moderacao" />
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Fila searchParams={searchParams as Promise<{ escopo?: string; feito?: string }>} />
      </Suspense>
    </main>
  );
}
