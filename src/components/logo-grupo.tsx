import { urlLogo } from "@/lib/projetos";

export function LogoGrupo({ nome, path, tamanho = "h-12 w-12" }: { nome: string; path?: string | null; tamanho?: string }) {
  const url = urlLogo(path);
  return (
    <span className={`flex ${tamanho} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="font-bold text-neutral-400">{nome[0]}</span>
      )}
    </span>
  );
}
