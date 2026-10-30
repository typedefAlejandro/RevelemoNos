import Link from "next/link";
import { Suspense } from "react";
import { exigirPerfil } from "@/lib/auth";
import { reposPublicos } from "@/lib/github";
import { botaoSecundario, campo } from "../estilos";

async function Conteudo() {
  const { profile } = await exigirPerfil();
  if (!profile.github_username) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
        <p className="font-medium">Vincule seu GitHub primeiro.</p>
        <p className="mt-1 text-sm text-neutral-500">
          Vá ao seu <Link href="/perfil" className="underline">perfil</Link> e clique em &quot;Vincular GitHub&quot;.
        </p>
      </div>
    );
  }

  const repos = await reposPublicos(profile.github_username);

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Seus repositórios</h2>
        {repos.length === 0 && <p className="text-sm text-neutral-500">Nenhum repositório público encontrado.</p>}
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {repos.map((r) => (
            <li key={r.url} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.nome}</p>
                {r.descricao && <p className="truncate text-sm text-neutral-500">{r.descricao}</p>}
              </div>
              <Link
                href={`/projetos/novo?repo=${encodeURIComponent(`${profile.github_username}/${r.nome}`)}`}
                className={`shrink-0 text-sm ${botaoSecundario}`}
              >
                Importar
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Repositório de outra conta ou organização</h2>
        <p className="text-sm text-neutral-500">
          Vale para repositórios públicos em que você aparece como contribuidor (ex.: um projeto em grupo na conta de um colega).
        </p>
        <form action="/projetos/novo" className="flex flex-col gap-2 sm:flex-row">
          <input name="repo" className={campo} placeholder="dono/repositorio" pattern="[A-Za-z0-9-]+/[A-Za-z0-9._-]+" required />
          <button className={`shrink-0 ${botaoSecundario}`}>Continuar</button>
        </form>
      </section>
    </div>
  );
}

export default function ImportarPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Link href="/projetos" className="text-sm text-neutral-500 hover:underline">← Meus projetos</Link>
      <h1 className="mb-8 mt-2 text-3xl font-bold tracking-tight">Importar do GitHub</h1>
      <Suspense fallback={<p className="text-neutral-500">Buscando seus repositórios…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
