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
import { DescartarAlteracao } from "./descartar";
import { Membros } from "./membros";

async function Conteudo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  const { supabase, uid } = await exigirPerfil();
  const [{ id }, { criado }] = await Promise.all([params, searchParams]);

  const [carregado, tags] = await Promise.all([carregarProjeto(supabase, id), listarTags(supabase)]);
  if (!carregado) notFound();
  const { projeto, membros, tagIds, alteracao } = carregado;
  // Se há uma versão proposta, é ela que o autor continua editando.
  const conteudo = alteracao?.dados ?? projeto;

  const meuPapel = membros.find((m) => m.user_id === uid)?.papel;
  const { data: sugestoes } = await supabase
    .from("sugestoes_tag")
    .select("id, nome, status, motivo")
    .eq("projeto_id", id)
    .order("created_at", { ascending: false });
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
        {alteracao && (
          <div className={`flex flex-col gap-2 rounded-lg px-4 py-3 text-sm ${alteracao.motivo_recusa ? "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>
            {alteracao.motivo_recusa ? (
              <>
                <p className="font-medium">A moderação recusou a sua alteração. A versão publicada continua no ar.</p>
                <p className="whitespace-pre-line">{alteracao.motivo_recusa}</p>
                <p>Corrija abaixo e salve de novo para reenviar.</p>
              </>
            ) : (
              <p>
                Você enviou uma nova versão em {new Date(alteracao.enviado_em).toLocaleString("pt-BR")}. Ela aguarda a moderação;
                enquanto isso, o público vê a versão publicada. Os campos abaixo mostram a versão nova.
              </p>
            )}
            {meuPapel && meuPapel !== "COLABORADOR" && <DescartarAlteracao projetoId={projeto.id} />}
          </div>
        )}
        {projeto.status === "PENDENTE" && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Um moderador vai revisar o projeto. Você ainda pode editar enquanto isso.</p>
        )}
      </div>

      {meuPapel && <section><Acoes projetoId={projeto.id} status={projeto.status} autor={meuPapel === "AUTOR"} /></section>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Capa</h2>
        <Capa projetoId={projeto.id} uid={uid} path={conteudo.capa_path} podeEditar={podeEditar} aprovado={projeto.status === "APROVADO"} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Informações</h2>
        {podeEditar ? (
          <FormProjeto
            modo="editar"
            projetoId={projeto.id}
            aprovado={projeto.status === "APROVADO"}
            tags={tags}
            sugestoes={sugestoes ?? []}
            inicial={{
              titulo: conteudo.titulo,
              resumo: conteudo.resumo,
              descricao_md: conteudo.descricao_md ?? "",
              repo_url: conteudo.repo_url ?? "",
              demo_url: conteudo.demo_url ?? "",
              video_url: conteudo.video_url ?? "",
              ano: conteudo.ano,
              escopos: conteudo.escopos,
              tags: alteracao?.tags ?? tagIds,
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
