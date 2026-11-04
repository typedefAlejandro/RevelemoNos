import Link from "next/link";
import { Suspense } from "react";
import { CardProjeto } from "@/components/card-projeto";
import { CATEGORIA_ROTULO, ESCOPO_ROTULO, type CategoriaTag } from "@/lib/projetos";
import { createClient } from "@/lib/supabase/server";
import { ESCOPOS } from "@/lib/validations/projeto";
import { lerFiltros, POR_PAGINA, urlVitrine, type FiltrosDisponiveis, type ItemVitrine } from "@/lib/vitrine";

const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-sm transition ${
    ativo
      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
  }`;

async function Vitrine({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = lerFiltros(await searchParams);
  const supabase = await createClient();

  const [{ data: itensBrutos }, { data: filtrosBrutos }] = await Promise.all([
    supabase.rpc("vitrine", {
      p_busca: f.q ?? null,
      p_escopo: f.curso ?? null,
      p_tag: f.tag ?? null,
      p_ano: f.ano ?? null,
      p_limite: POR_PAGINA,
      p_offset: (f.pagina - 1) * POR_PAGINA,
    }),
    supabase.rpc("filtros_vitrine"),
  ]);

  const itens = (itensBrutos ?? []) as ItemVitrine[];
  const filtros = (filtrosBrutos ?? { tags: [], anos: [], total: 0 }) as FiltrosDisponiveis;
  const total = itens[0]?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const temFiltro = !!(f.q || f.curso || f.tag || f.ano);
  const categorias: CategoriaTag[] = ["CONTEXTO", "TEMA", "TECNOLOGIA"];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <form action="/" className="flex gap-2">
          {f.curso && <input type="hidden" name="curso" value={f.curso} />}
          {f.tag && <input type="hidden" name="tag" value={f.tag} />}
          {f.ano && <input type="hidden" name="ano" value={f.ano} />}
          <input
            name="q"
            defaultValue={f.q}
            maxLength={200}
            placeholder="Buscar projetos (ex.: jogo, banco de dados, robô…)"
            className="w-full rounded-lg border border-neutral-300 bg-transparent px-4 py-2.5 dark:border-neutral-700"
          />
          <button className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 font-medium text-white dark:bg-white dark:text-neutral-900">Buscar</button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link href={urlVitrine(f, { curso: undefined })} className={chip(!f.curso)}>Todos os cursos</Link>
          {ESCOPOS.map((e) => (
            <Link key={e} href={urlVitrine(f, { curso: f.curso === e ? undefined : e })} className={chip(f.curso === e)}>
              {ESCOPO_ROTULO[e]}
            </Link>
          ))}
        </div>

        {filtros.tags.length > 0 && (
          <details className="group rounded-lg border border-neutral-200 dark:border-neutral-800" open={!!f.tag}>
            <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">
              Filtrar por tag{f.tag && `: ${filtros.tags.find((t) => t.slug === f.tag)?.nome ?? f.tag}`}
            </summary>
            <div className="flex flex-col gap-3 px-4 pb-4">
              {categorias.map((c) => {
                const daCategoria = filtros.tags.filter((t) => t.categoria === c);
                if (daCategoria.length === 0) return null;
                return (
                  <div key={c} className="flex flex-col gap-1.5">
                    <span className="text-xs uppercase tracking-wide text-neutral-500">{CATEGORIA_ROTULO[c]}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {daCategoria.map((t) => (
                        <Link key={t.slug} href={urlVitrine(f, { tag: f.tag === t.slug ? undefined : t.slug })} className={`${chip(f.tag === t.slug)} !px-2.5 !py-0.5 !text-xs`}>
                          {t.nome} <span className="opacity-60">{t.qtd}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {filtros.anos.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-neutral-500">Ano:</span>
            {filtros.anos.map((a) => (
              <Link key={a} href={urlVitrine(f, { ano: f.ano === a ? undefined : a })} className={`${chip(f.ano === a)} !px-2.5 !py-0.5 !text-xs`}>{a}</Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <p className="text-sm text-neutral-500">
          {total === 1 ? "1 projeto" : `${total} projetos`}
          {temFiltro && " encontrados"}
        </p>
        {temFiltro && <Link href="/" className="text-sm underline">Limpar filtros</Link>}
      </div>

      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
          <p className="font-medium">{filtros.total === 0 ? "Os primeiros projetos estão chegando." : "Nenhum projeto com esses filtros."}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {filtros.total === 0 ? "Tem um projeto da faculdade? Entre e cadastre o seu." : "Tente outra busca ou limpe os filtros."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {itens.map((p) => <li key={p.id}><CardProjeto p={p} /></li>)}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {f.pagina > 1 ? <Link href={urlVitrine(f, { pagina: f.pagina - 1 })} className="underline">← Anterior</Link> : <span className="text-neutral-400">← Anterior</span>}
          <span className="text-neutral-500">Página {f.pagina} de {paginas}</span>
          {f.pagina < paginas ? <Link href={urlVitrine(f, { pagina: f.pagina + 1 })} className="underline">Próxima →</Link> : <span className="text-neutral-400">Próxima →</span>}
        </nav>
      )}
    </div>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
      <section className="mb-10 flex flex-col gap-3">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">DACOMP · UNIFEI</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">O que a Computação da UNIFEI anda criando</h1>
        <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          Projetos de alunos e professores de CCO, CDA, ECO, SIN e da pós-graduação — de trabalhos de disciplina a TFGs e pesquisas.
        </p>
      </section>
      <Suspense fallback={<p className="text-neutral-500">Carregando projetos…</p>}>
        <Vitrine searchParams={searchParams as Promise<Record<string, string | string[] | undefined>>} />
      </Suspense>
    </main>
  );
}
