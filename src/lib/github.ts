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

export type RepoImportavel = {
  fullName: string;
  nome: string;
  descricao: string | null;
  url: string;
  homepage: string | null;
  linguagem: string | null;
  topicos: string[];
  ano: number | null;
};

function headersGitHub() {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

/**
 * Confere se `login` pode importar o repositório `fullName` ("dono/nome"):
 * precisa ser o dono ou aparecer entre os contribuidores.
 * Só usa dados públicos; cache curto para não estourar a API.
 */
export async function verificarRepoImportavel(
  login: string,
  fullName: string,
): Promise<{ ok: true; repo: RepoImportavel } | { ok: false; erro: string }> {
  "use cache";
  cacheLife("minutes");

  if (!LOGIN_VALIDO.test(login) || !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(fullName)) {
    return { ok: false, erro: "Repositório inválido. Use o formato dono/repositorio." };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${fullName}`, { headers: headersGitHub() });
    if (res.status === 404) return { ok: false, erro: "Repositório não encontrado (ele precisa ser público)." };
    if (!res.ok) return { ok: false, erro: "O GitHub não respondeu agora. Tente de novo em alguns minutos." };
    const r = await res.json();
    if (r.private) return { ok: false, erro: "Só repositórios públicos podem ser importados." };

    const dono = String(r.owner?.login ?? "");
    let participa = dono.toLowerCase() === login.toLowerCase();

    if (!participa) {
      const c = await fetch(`https://api.github.com/repos/${fullName}/contributors?per_page=100`, {
        headers: headersGitHub(),
      });
      if (c.ok) {
        const lista: Array<{ login?: string }> = await c.json();
        participa = lista.some((x) => x.login?.toLowerCase() === login.toLowerCase());
      }
    }
    if (!participa) {
      return {
        ok: false,
        erro: `Você (@${login}) não aparece como dono nem como contribuidor de ${fullName}.`,
      };
    }

    const homepage = typeof r.homepage === "string" && r.homepage.startsWith("https://") ? r.homepage : null;
    return {
      ok: true,
      repo: {
        fullName: String(r.full_name),
        nome: String(r.name),
        descricao: (r.description as string | null) ?? null,
        url: String(r.html_url),
        homepage,
        linguagem: (r.language as string | null) ?? null,
        topicos: (r.topics as string[] | undefined) ?? [],
        ano: r.created_at ? new Date(r.created_at).getUTCFullYear() : null,
      },
    };
  } catch {
    return { ok: false, erro: "Não foi possível falar com o GitHub agora." };
  }
}
