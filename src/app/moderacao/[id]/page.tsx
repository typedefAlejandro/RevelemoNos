import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatus } from "@/components/badge-status";
import { Markdown } from "@/components/markdown";
import { exigirModerador } from "@/lib/auth";
import { CATEGORIA_ROTULO, ESCOPO_ROTULO, PAPEL_ROTULO, STATUS_INFO, urlCapa, type StatusProjeto, type Tag } from "@/lib/projetos";
import { carregarProjeto, listarTags } from "../../projetos/dados";
import { AbasModeracao } from "../abas";
import { Decisao } from "./decisao";

type Registro = { id: string; decisao: StatusProjeto; motivo: string | null; created_at: string };

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, uid, profile } = await exigirModerador();
  const { id } = await params;
  const [carregado, tags] = await Promise.all([carregarProjeto(supabase, id), listarTags(supabase)]);
  if (!carregado) notFound();
  const { projeto: p, membros, tagIds } = carregado;

  const { data: historico } = await supabase
    .from("moderacoes")
    .select("id, decisao, motivo, created_at")
    .eq("projeto_id", id)
    .order("created_at", { ascending: false })
    .returns<Registro[]>();

  const souMembro = membros.some((m) => m.user_id === uid);
  const bloqueado = souMembro && profile.papel !== "SUPERADMIN"
    ? "Você é membro deste projeto, então outro moderador precisa decidir."
    : null;
  const capa = urlCapa(p.capa_path);
  const tagsDoProjeto = tags.filter((t: Tag) => tagIds.includes(t.id));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{p.titulo}</h2>
          <BadgeStatus status={p.status} />
        </div>
        <p className="text-neutral-700 dark:text-neutral-300">{p.resumo}</p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {p.escopos.map((e) => <span key={e} className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{ESCOPO_ROTULO[e]}</span>)}
          {p.ano && <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{p.ano}</span>}
        </div>
      </div>

      <section className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="mb-3 font-semibold">Decisão</h3>
        <Decisao projetoId={p.id} status={p.status} bloqueado={bloqueado} />
      </section>

      {capa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={capa} alt="Capa do projeto" className="aspect-[16/9] w-full rounded-lg object-cover" />
      )}

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Membros</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {membros.map((m) => (
            <li key={m.user_id}>
              {m.nome} — {PAPEL_ROTULO[m.papel]}
              {m.github_username && <> · <a className="underline" href={`https://github.com/${m.github_username}`} target="_blank" rel="noopener noreferrer">@{m.github_username}</a></>}
              {!m.verificado && <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-700">vínculo não verificado</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h3 className="font-semibold">Links</h3>
        {[["Repositório", p.repo_url], ["Demo", p.demo_url], ["Vídeo", p.video_url]].map(([rotulo, url]) =>
          url ? <p key={rotulo}>{rotulo}: <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="break-all underline">{url}</a></p> : null,
        )}
        {p.github_repo && <p className="text-neutral-500">Importado do GitHub ({p.github_repo}); o app conferiu que quem importou é dono ou contribuidor.</p>}
        {!p.repo_url && !p.demo_url && !p.video_url && <p className="text-neutral-500">Nenhum link informado.</p>}
      </section>

      {tagsDoProjeto.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {tagsDoProjeto.map((t) => (
              <span key={t.id} title={CATEGORIA_ROTULO[t.categoria]} className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs dark:border-neutral-700">{t.nome}</span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Descrição</h3>
        {p.descricao_md ? <Markdown texto={p.descricao_md} /> : <p className="text-sm text-neutral-500">Sem descrição.</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Histórico de decisões</h3>
        {(historico ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">Primeira análise deste projeto.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {historico!.map((h) => (
              <li key={h.id} className="rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
                <span className="font-medium">{STATUS_INFO[h.decisao].rotulo}</span>
                <span className="text-neutral-500"> · {new Date(h.created_at).toLocaleString("pt-BR")}</span>
                {h.motivo && <p className="mt-1 whitespace-pre-line text-neutral-700 dark:text-neutral-300">{h.motivo}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ModerarProjetoPage({ params }: PageProps<"/moderacao/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Moderação</h1>
      <AbasModeracao ativa="/moderacao" />
      <Link href="/moderacao" className="text-sm text-neutral-500 hover:underline">← Voltar para a fila</Link>
      <div className="mt-4">
        <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </main>
  );
}
