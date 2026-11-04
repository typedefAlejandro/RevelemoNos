import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { CardProjeto } from "@/components/card-projeto";
import { LogoGrupo } from "@/components/logo-grupo";
import { urlLogo, type Tag } from "@/lib/projetos";
import { createClient } from "@/lib/supabase/server";
import type { ItemVitrine } from "@/lib/vitrine";

const grupoPorSlug = cache(async (slug: string) => {
  await connection();
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data: grupo } = await supabase
    .from("tags")
    .select("id, nome, slug, categoria, logo_path, descricao, site_url")
    .eq("slug", slug)
    .eq("categoria", "GRUPO")
    .maybeSingle<Tag>();
  if (!grupo) return null;
  const { data: projetos } = await supabase.rpc("vitrine", { p_tag: slug, p_limite: 48 });
  return { grupo, projetos: (projetos ?? []) as ItemVitrine[] };
});

export async function generateMetadata({ params }: PageProps<"/g/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const dados = await grupoPorSlug(slug);
  if (!dados) return { title: "Grupo não encontrado — Revelemo-nos" };
  const logo = urlLogo(dados.grupo.logo_path);
  return {
    title: `${dados.grupo.nome} — Revelemo-nos`,
    description: dados.grupo.descricao ?? `Projetos de ${dados.grupo.nome} na Computação da UNIFEI.`,
    openGraph: { images: logo ? [{ url: logo }] : undefined },
  };
}

async function Conteudo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await grupoPorSlug(slug);
  if (!dados) notFound();
  const { grupo, projetos } = dados;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <LogoGrupo nome={grupo.nome} path={grupo.logo_path} tamanho="h-24 w-24" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">Grupo / equipe</p>
          <h1 className="text-4xl font-bold tracking-tight">{grupo.nome}</h1>
          {grupo.descricao && <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">{grupo.descricao}</p>}
          {grupo.site_url && (
            <a href={grupo.site_url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm underline">
              {grupo.site_url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")} ↗
            </a>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {projetos.length === 0 ? "Projetos" : `${projetos[0].total} projeto${projetos[0].total === 1 ? "" : "s"}`}
        </h2>
        {projetos.length === 0 ? (
          <p className="text-neutral-500">
            Nenhum projeto publicado ainda. Membros do {grupo.nome}: cadastrem seus projetos e marquem a tag &quot;{grupo.nome}&quot;.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map((p) => <li key={p.id}><CardProjeto p={p} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function GrupoPage({ params }: PageProps<"/g/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">← Todos os projetos</Link>
      <div className="mt-6">
        <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </main>
  );
}
