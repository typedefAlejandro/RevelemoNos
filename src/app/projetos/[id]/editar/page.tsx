import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatus } from "@/components/badge-status";
import { Markdown } from "@/components/markdown";
import { exigirPerfil } from "@/lib/auth";
import { listarTags, carregarProjeto } from "../../dados";
import { alertaOk } from "../../estilos";
import { FormProjeto } from "../../form-projeto";
import { Acoes } from "./acoes";
import { Capa } from "./capa";
import { Membros } from "./membros";

async function Conteudo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { supabase, uid } = await exigirPerfil();
  const [{ id }, { criado }] = await Promise.all([params, searchParams]);

  const [carregado, tags] = await Promise.all([carregarProjeto(supabase, id), listarTags(supabase)]);
  if (!carregado) notFound();
  const { projeto, membros, tagIds } = carregado;

  const meuPapel = membros.find((m) => m.user_id === uid)?.papel;
  const podeEditar = (meuPapel === "AUTOR" || meuPapel === "ORIENTADOR") && projeto.status !== "ARQUIVADO";

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{projeto.titulo}</h1>
          <BadgeStatus status={projeto.status} />
        </div>
        <Link href={`/p/${projeto.slug}`} className="self-start text-sm underline">
          {projeto.status === "APROVADO" ? "Ver página pública ↗" : "Ver prévia da página ↗"}
        </Link>
        {projeto.github_repo && (
          <p className="text-sm text-neutral-500">
            Importado de <a href={`https://github.com/${projeto.github_repo}`} target="_blank" rel="noopener noreferrer" className="font-mono underline">{projeto.github_repo}</a>
          </p>
        )}
        {criado && <p className={alertaOk}>Rascunho criado! Adicione uma capa e os membros, e envie para aprovação quando estiver pronto.</p>}
        {(projeto.status === "REJEITADO" || projeto.status === "ARQUIVADO") && projeto.motivo_rejeicao && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">{projeto.status === "ARQUIVADO" ? "Motivo da despublicação:" : "O que o moderador pediu:"}</p>
            <p className="mt-1 whitespace-pre-line">{projeto.motivo_rejeicao}</p>
          </div>
        )}
        {projeto.status === "PENDENTE" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Um moderador vai revisar o projeto. Você ainda pode editar enquanto isso.</p>
        )}
      </div>

      {meuPapel && <section><Acoes projetoId={projeto.id} status={projeto.status} autor={meuPapel === "AUTOR"} /></section>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Capa</h2>
        <Capa projetoId={projeto.id} uid={uid} path={projeto.capa_path} podeEditar={podeEditar} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Informações</h2>
        {podeEditar ? (
          <FormProjeto
            modo="editar"
            projetoId={projeto.id}
            aprovado={projeto.status === "APROVADO"}
            tags={tags}
            inicial={{
              titulo: projeto.titulo,
              resumo: projeto.resumo,
              descricao_md: projeto.descricao_md ?? "",
              repo_url: projeto.repo_url ?? "",
              demo_url: projeto.demo_url ?? "",
              video_url: projeto.video_url ?? "",
              ano: projeto.ano,
              escopos: projeto.escopos,
              tags: tagIds,
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-neutral-700 dark:text-neutral-300">{projeto.resumo}</p>
            {projeto.descricao_md && <Markdown texto={projeto.descricao_md} />}
            <p className="text-xs text-neutral-500">Só autores e orientadores editam este projeto.</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Membros</h2>
        <Membros projetoId={projeto.id} uid={uid} membros={membros} podeEditar={podeEditar} />
      </section>
    </div>
  );
}

export default function EditarProjetoPage({ params, searchParams }: PageProps<"/projetos/[id]/editar">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/projetos" className="text-sm text-neutral-500 hover:underline">← Meus projetos</Link>
      <div className="mt-2">
        <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
          <Conteudo params={params} searchParams={searchParams as Promise<{ criado?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}
