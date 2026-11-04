import { ESCOPO_ROTULO, urlCapa, type Conteudo } from "@/lib/projetos";

type Versao = Conteudo & { tags: string[] };

const CAMPOS: { chave: keyof Versao; rotulo: string }[] = [
  { chave: "titulo", rotulo: "Título" },
  { chave: "resumo", rotulo: "Resumo" },
  { chave: "repo_url", rotulo: "Repositório" },
  { chave: "demo_url", rotulo: "Demo" },
  { chave: "video_url", rotulo: "Vídeo" },
  { chave: "ano", rotulo: "Ano" },
  { chave: "escopos", rotulo: "Cursos" },
  { chave: "tags", rotulo: "Tags" },
  { chave: "capa_path", rotulo: "Capa" },
  { chave: "descricao_md", rotulo: "Descrição" },
];

function normalizar(chave: keyof Versao, v: unknown) {
  if (v === undefined || v === "") return null;
  if (Array.isArray(v)) return [...v].sort();
  return v ?? null;
}

function texto(chave: keyof Versao, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (chave === "escopos") return (v as string[]).map((e) => ESCOPO_ROTULO[e as keyof typeof ESCOPO_ROTULO] ?? e).join(", ");
  if (Array.isArray(v)) return v.join(", ") || "—";
  return String(v);
}

/** Versão publicada × versão proposta, só os campos que mudaram. */
export function Diferencas({ publicada, proposta }: { publicada: Versao; proposta: Versao }) {
  const mudou = CAMPOS.filter(
    ({ chave }) => JSON.stringify(normalizar(chave, publicada[chave])) !== JSON.stringify(normalizar(chave, proposta[chave])),
  );
  if (mudou.length === 0) return <p className="text-sm text-neutral-500">Nenhuma diferença de conteúdo.</p>;

  return (
    <ul className="flex flex-col gap-4">
      {mudou.map(({ chave, rotulo }) => (
        <li key={String(chave)} className="flex flex-col gap-2 text-sm">
          <span className="font-medium">{rotulo}</span>
          {chave === "capa_path" ? (
            <div className="grid grid-cols-2 gap-3">
              {[publicada.capa_path, proposta.capa_path].map((c, i) => (
                <figure key={i} className="flex flex-col gap-1">
                  <figcaption className="text-xs text-neutral-500">{i === 0 ? "Publicada" : "Proposta"}</figcaption>
                  {c ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urlCapa(c)!} alt="" className="aspect-[16/9] w-full rounded-md object-cover" />
                  ) : (
                    <span className="text-neutral-500">sem capa</span>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {[publicada, proposta].map((v, i) => (
                <div key={i} className={`rounded-md p-2 ${i === 0 ? "bg-red-50 dark:bg-red-950/50" : "bg-green-50 dark:bg-green-950/50"}`}>
                  <span className="text-xs text-neutral-500">{i === 0 ? "Publicada" : "Proposta"}</span>
                  <p className={`whitespace-pre-wrap break-words ${chave === "descricao_md" ? "max-h-64 overflow-y-auto font-mono text-xs" : ""}`}>
                    {texto(chave, v[chave])}
                  </p>
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
