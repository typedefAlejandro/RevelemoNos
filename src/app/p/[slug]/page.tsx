import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatus } from "@/components/badge-status";
import { Markdown } from "@/components/markdown";
import { CATEGORIA_ROTULO, ESCOPO_ROTULO, PAPEL_ROTULO, urlCapa } from "@/lib/projetos";
import { projetoPorSlug } from "./dados";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dados = await projetoPorSlug(slug);
  if (!dados) return { title: "Projeto não encontrado — Revelemo-nos" };
  const { projeto: p } = dados;
  const capa = urlCapa(p.capa_path);
  return {
    title: `${p.titulo} — Revelemo-nos`,
    description: p.resumo,
    robots: p.status === "APROVADO" ? undefined : { index: false },
    openGraph: {
      title: p.titulo,
      description: p.resumo,
      type: "article",
      images: capa ? [{ url: capa }] : undefined,
    },
  };
}

function videoEmbed(url: string | null) {
  if (!url) return null;
  const m = url.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

async function Conteudo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await projetoPorSlug(slug);
  if (!dados) notFound();
  const { projeto: p, membros, tags } = dados;
  const capa = urlCapa(p.capa_path);
  const embed = videoEmbed(p.video_url);

  return (
    <article className="flex flex-col gap-8">
      {p.status !== "APROVADO" && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <BadgeStatus status={p.status} />
          Prévia: só os membros do projeto (e a moderação) veem esta página até ela ser aprovada.
          <Link href={`/projetos/${p.id}/editar`} className="ml-auto font-medium underline">Editar</Link>
        </div>
      )}

      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {p.escopos.map((e) => (
            <Link key={e} href={`/?curso=${e}`} className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700">{ESCOPO_ROTULO[e]}</Link>
          ))}
          {p.ano && <Link href={`/?ano=${p.ano}`} className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:underline">{p.ano}</Link>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{p.titulo}</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">{p.resumo}</p>
        <div className="flex flex-wrap gap-2">
          {p.demo_url && <a href={p.demo_url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">Abrir demo ↗</a>}
          {p.repo_url && <a href={p.repo_url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">Código ↗</a>}
          {p.video_url && !embed && <a href={p.video_url} target="_blank" rel="noopener noreferrer nofollow" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700">Vídeo ↗</a>}
        </div>
      </header>

      {capa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={capa} alt={`Capa de ${p.titulo}`} className="aspect-[16/9] w-full rounded-xl object-cover" />
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_16rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {embed && (
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe src={embed} title={`Vídeo de ${p.titulo}`} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            </div>
          )}
          {p.descricao_md ? <Markdown texto={p.descricao_md} /> : <p className="text-neutral-500">Os autores ainda não escreveram uma descrição.</p>}
        </div>

        <aside className="flex flex-col gap-6 text-sm">
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Quem fez</h2>
            <ul className="flex flex-col gap-3">
              {membros.map((m) => {
                const conteudo = (
                  <>
                    {m.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.foto_url} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 font-bold dark:bg-neutral-800">{m.nome[0]}</span>
                    )}
                    <span className="flex flex-col">
                      <span className="font-medium">{m.nome}</span>
                      <span className="text-xs text-neutral-500">{PAPEL_ROTULO[m.papel]}</span>
                    </span>
                  </>
                );
                return (
                  <li key={m.user_id}>
                    {m.perfil_publico ? (
                      <Link href={`/perfil/${m.user_id}`} className="flex items-center gap-3 hover:underline">{conteudo}</Link>
                    ) : (
                      <span className="flex items-center gap-3">{conteudo}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {tags.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Tags</h2>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link key={t.slug} href={`/?tag=${t.slug}`} title={CATEGORIA_ROTULO[t.categoria]} className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
                    {t.nome}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {p.aprovado_em && (
            <p className="text-xs text-neutral-500">Publicado em {new Date(p.aprovado_em).toLocaleDateString("pt-BR")}</p>
          )}
        </aside>
      </div>
    </article>
  );
}

export default function ProjetoPublicoPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">← Todos os projetos</Link>
      <div className="mt-4">
        <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </main>
  );
}
