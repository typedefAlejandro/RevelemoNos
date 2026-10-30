import Link from "next/link";
import { Suspense } from "react";
import { BadgeStatus } from "@/components/badge-status";
import { exigirPerfil } from "@/lib/auth";
import { PAPEL_ROTULO, urlCapa, type PapelMembro, type Projeto } from "@/lib/projetos";
import { botaoPrimario, botaoSecundario } from "./estilos";

type Linha = { papel: PapelMembro; projetos: Pick<Projeto, "id" | "titulo" | "resumo" | "status" | "capa_path" | "updated_at"> | null };

async function Lista() {
  const { supabase, uid } = await exigirPerfil();
  const { data } = await supabase
    .from("projeto_membros")
    .select("papel, projetos(id, titulo, resumo, status, capa_path, updated_at)")
    .eq("user_id", uid)
    .returns<Linha[]>();

  const itens = (data ?? [])
    .filter((l) => l.projetos)
    .sort((a, b) => b.projetos!.updated_at.localeCompare(a.projetos!.updated_at));

  if (itens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="font-medium">Você ainda não tem projetos.</p>
        <p className="mt-1 text-sm text-neutral-500">Crie do zero ou importe um repositório do seu GitHub.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {itens.map(({ papel, projetos: p }) => {
        const capa = urlCapa(p!.capa_path);
        return (
          <li key={p!.id}>
            <Link href={`/projetos/${p!.id}/editar`} className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600">
              <div className="aspect-[16/9] bg-neutral-100 dark:bg-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {capa && <img src={capa} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{p!.titulo}</h2>
                  <BadgeStatus status={p!.status} />
                </div>
                <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{p!.resumo}</p>
                <p className="mt-auto text-xs text-neutral-500">{PAPEL_ROTULO[papel]}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function MeusProjetosPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Meus projetos</h1>
        <div className="flex gap-2">
          <Link href="/projetos/importar" className={botaoSecundario}>Importar do GitHub</Link>
          <Link href="/projetos/novo" className={botaoPrimario}>Novo projeto</Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Lista />
      </Suspense>
    </main>
  );
}
