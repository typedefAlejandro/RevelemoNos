import Link from "next/link";
import { Suspense } from "react";
import { exigirPerfil } from "@/lib/auth";
import { verificarRepoImportavel } from "@/lib/github";
import { GITHUB_REPO, type DadosProjeto } from "@/lib/validations/projeto";
import { escoposDoUsuario, listarTags, sugerirTags } from "../dados";
import { alertaErro } from "../estilos";
import { FormProjeto } from "../form-projeto";

async function Conteudo({ searchParams }: { searchParams: Promise<{ repo?: string }> }) {
  const { supabase, uid, profile } = await exigirPerfil();
  const { repo } = await searchParams;
  const [tags, escopos] = await Promise.all([listarTags(supabase), escoposDoUsuario(supabase, uid)]);

  const inicial: DadosProjeto = {
    titulo: "", resumo: "", descricao_md: "", repo_url: "", demo_url: "", video_url: "",
    ano: new Date().getFullYear(), escopos, tags: [],
  };

  let githubRepo: string | undefined;
  if (repo) {
    if (!profile.github_username) {
      return <p className={alertaErro}>Vincule seu GitHub no <Link href="/perfil" className="underline">perfil</Link> para importar repositórios.</p>;
    }
    const v = GITHUB_REPO.test(repo)
      ? await verificarRepoImportavel(profile.github_username, repo)
      : { ok: false as const, erro: "Repositório inválido." };
    if (!v.ok) {
      return (
        <div className="flex flex-col gap-4">
          <p className={alertaErro}>{v.erro}</p>
          <Link href="/projetos/importar" className="text-sm underline">Escolher outro repositório</Link>
        </div>
      );
    }
    githubRepo = v.repo.fullName;
    Object.assign(inicial, {
      titulo: v.repo.nome.replace(/[-_]+/g, " ").slice(0, 120),
      resumo: (v.repo.descricao ?? "").slice(0, 280),
      repo_url: v.repo.url,
      demo_url: v.repo.homepage ?? "",
      ano: v.repo.ano,
      tags: sugerirTags(tags, v.repo.topicos, v.repo.linguagem),
    });
  }

  return <FormProjeto modo="criar" githubRepo={githubRepo} inicial={inicial} tags={tags} />;
}

export default function NovoProjetoPage({ searchParams }: PageProps<"/projetos/novo">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/projetos" className="text-sm text-neutral-500 hover:underline">← Meus projetos</Link>
      <h1 className="mb-8 mt-2 text-3xl font-bold tracking-tight">Novo projeto</h1>
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Conteudo searchParams={searchParams as Promise<{ repo?: string }>} />
      </Suspense>
    </main>
  );
}
