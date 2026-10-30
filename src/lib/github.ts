import { cacheLife } from "next/cache";

export type RepoGitHub = {
  nome: string;
  descricao: string | null;
  url: string;
  homepage: string | null;
  linguagem: string | null;
  topicos: string[];
  estrelas: number;
  atualizadoEm: string;
};

const LOGIN_VALIDO = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

/**
 * Repositórios públicos (não-fork) de um usuário do GitHub.
 * Só dados públicos; cache de 1h para não estourar o limite da API
 * (60 req/h sem token; 5000 com GITHUB_TOKEN, um token sem permissões).
 */
export async function reposPublicos(login: string): Promise<RepoGitHub[]> {
  "use cache";
  cacheLife("hours");

  if (!LOGIN_VALIDO.test(login)) return [];

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${login}/repos?type=owner&sort=pushed&per_page=30`,
      { headers },
    );
    if (!res.ok) return [];
    const data: Array<Record<string, unknown>> = await res.json();
    return data
      .filter((r) => !r.fork && !r.archived)
      .slice(0, 9)
      .map((r) => ({
        nome: String(r.name),
        descricao: (r.description as string | null) ?? null,
        url: String(r.html_url),
        homepage: (r.homepage as string | null) || null,
        linguagem: (r.language as string | null) ?? null,
        topicos: (r.topics as string[] | undefined) ?? [],
        estrelas: Number(r.stargazers_count ?? 0),
        atualizadoEm: String(r.pushed_at),
      }));
  } catch {
    return [];
  }
}
