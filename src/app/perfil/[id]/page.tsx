import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CURSOS, type Profile, type Vinculo } from "@/lib/tipos";
import { ESCOPO_ROTULO, PAPEL_ROTULO, urlCapa, type PapelMembro, type Projeto } from "@/lib/projetos";

type Linha = { papel: PapelMembro; projetos: Pick<Projeto, "id" | "slug" | "titulo" | "resumo" | "capa_path" | "escopos" | "status"> | null };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  // RLS: só aparece se o perfil for público (ou se for o próprio).
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nome, tipo, bio, foto_url, linkedin_url, github_username, perfil_publico, verificado")
    .eq("id", id)
    .maybeSingle<Profile>();
  if (!perfil) notFound();

  const [{ data: vinculos }, { data: linhas }] = await Promise.all([
    supabase.from("vinculos").select("id, nivel, curso, programa, status, ano_ingresso").eq("user_id", id).returns<Vinculo[]>(),
    supabase
      .from("projeto_membros")
      .select("papel, projetos!inner(id, slug, titulo, resumo, capa_path, escopos, status)")
      .eq("user_id", id)
      .eq("projetos.status", "APROVADO")
      .returns<Linha[]>(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      {!perfil.perfil_publico && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Só você vê esta página: seu perfil não está público. Ative em <Link href="/perfil" className="underline">Meu perfil</Link>.
        </p>
      )}
      <header className="flex items-center gap-5">
        {perfil.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={perfil.foto_url} alt="" className="h-20 w-20 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-200 text-2xl font-bold dark:bg-neutral-800">{perfil.nome[0]}</div>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{perfil.nome}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {perfil.tipo === "PROFESSOR" ? "Professor(a)" : "Aluno(a)"}
            {(vinculos ?? []).length > 0 && " · "}
            {(vinculos ?? []).map((v) => (v.nivel === "GRADUACAO" && v.curso ? CURSOS[v.curso] : `Pós: ${v.programa}`) + (v.status === "EGRESSO" ? " (egresso)" : "")).join(" · ")}
          </p>
          <div className="flex gap-3 text-sm">
            {perfil.github_username && <a href={`https://github.com/${perfil.github_username}`} target="_blank" rel="noopener noreferrer" className="underline">GitHub</a>}
            {perfil.linkedin_url && <a href={perfil.linkedin_url} target="_blank" rel="noopener noreferrer nofollow" className="underline">LinkedIn</a>}
          </div>
        </div>
      </header>

      {perfil.bio && <p className="whitespace-pre-line text-neutral-700 dark:text-neutral-300">{perfil.bio}</p>}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Projetos publicados</h2>
        {(linhas ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum projeto publicado ainda.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {linhas!.filter((l) => l.projetos).map(({ papel, projetos: p }) => {
              const capa = urlCapa(p!.capa_path);
              return (
                <li key={p!.id}>
                  <Link href={`/p/${p!.slug}`} className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 transition hover:shadow-md dark:border-neutral-800">
                    <div className="aspect-[16/9] bg-neutral-100 dark:bg-neutral-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {capa && <img src={capa} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex flex-col gap-1 p-4">
                      <h3 className="font-semibold">{p!.titulo}</h3>
                      <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{p!.resumo}</p>
                      <p className="text-xs text-neutral-500">{PAPEL_ROTULO[papel]} · {p!.escopos.map((e) => ESCOPO_ROTULO[e]).join(", ")}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function PerfilPublicoPage({ params }: PageProps<"/perfil/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Conteudo params={params} />
      </Suspense>
    </main>
  );
}
