import Link from "next/link";
import { Suspense } from "react";
import { exigirPerfil } from "@/lib/auth";
import { reposPublicos } from "@/lib/github";
import { CURSOS, type Vinculo } from "@/lib/tipos";
import { FormPerfil } from "./form-perfil";
import { BotaoDesvincularGitHub, BotaoVincularGitHub } from "./github";

function descreverVinculo(v: Vinculo) {
  const situacao = v.status === "EGRESSO" ? " (egresso)" : "";
  if (v.nivel === "GRADUACAO" && v.curso) return `${v.curso} — ${CURSOS[v.curso]}${situacao}`;
  return `Pós — ${v.programa}${situacao}`;
}

async function Repos({ login }: { login: string }) {
  const repos = await reposPublicos(login);
  if (repos.length === 0) {
    return <p className="text-sm text-neutral-500">Nenhum repositório público encontrado.</p>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {repos.map((r) => (
        <li key={r.url} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
            {r.nome}
          </a>
          {r.descricao && <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">{r.descricao}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-neutral-500">
              {[r.linguagem, r.estrelas ? `★ ${r.estrelas}` : null].filter(Boolean).join(" · ")}
            </p>
            <Link href={`/projetos/novo?repo=${encodeURIComponent(`${login}/${r.nome}`)}`} className="text-xs font-medium underline">
              Importar como projeto
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Conteudo() {
  const { supabase, uid, profile } = await exigirPerfil();
  const { data: vinculos } = await supabase
    .from("vinculos")
    .select("id, nivel, curso, programa, status, ano_ingresso")
    .eq("user_id", uid)
    .returns<Vinculo[]>();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex items-center gap-4">
        {profile.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.foto_url} alt="" className="h-16 w-16 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-xl font-bold dark:bg-neutral-800">
            {profile.nome[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{profile.nome}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {profile.tipo === "PROFESSOR" ? "Professor(a)" : "Aluno(a)"}
            {profile.papel !== "USUARIO" && ` · ${profile.papel === "SUPERADMIN" ? "Superadmin" : "Moderador(a)"}`}
            {" · "}
            {profile.verificado ? (
              <span className="text-green-700 dark:text-green-400">verificado</span>
            ) : (
              <span>aguardando verificação</span>
            )}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Vínculos</h2>
          <Link href="/onboarding" className="text-sm underline">Editar</Link>
        </div>
        <ul className="list-inside list-disc text-neutral-700 dark:text-neutral-300">
          {(vinculos ?? []).map((v) => <li key={v.id}>{descreverVinculo(v)}</li>)}
          {(vinculos ?? []).length === 0 && <li>Nenhum vínculo informado.</li>}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">GitHub</h2>
        {profile.github_username ? (
          <>
            <p className="flex flex-wrap items-center gap-3">
              <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                @{profile.github_username}
              </a>
              <BotaoDesvincularGitHub />
            </p>
            <Suspense fallback={<p className="text-sm text-neutral-500">Buscando repositórios…</p>}>
              <Repos login={profile.github_username} />
            </Suspense>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Vincule sua conta para entrar também pelo GitHub e, na próxima fase, importar repositórios como projetos.
            </p>
            <BotaoVincularGitHub />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Dados do perfil</h2>
        <FormPerfil profile={profile} />
      </section>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
