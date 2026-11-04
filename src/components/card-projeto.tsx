import Link from "next/link";
import { ESCOPO_ROTULO, urlCapa } from "@/lib/projetos";
import type { ItemVitrine } from "@/lib/vitrine";

export function CardProjeto({ p }: { p: ItemVitrine }) {
  const capa = urlCapa(p.capa_path);
  const autores = p.membros.filter((m) => m.papel !== "ORIENTADOR").map((m) => m.nome.split(" ")[0]);
  const orientador = p.membros.find((m) => m.papel === "ORIENTADOR");

  return (
    <Link
      href={`/p/${p.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
        {capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capa} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-lg font-semibold text-neutral-400 dark:text-neutral-600">
            {p.titulo}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1">
          {p.escopos.map((e) => (
            <span key={e} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium dark:bg-neutral-800">{ESCOPO_ROTULO[e]}</span>
          ))}
          {p.ano && <span className="rounded px-1.5 py-0.5 text-[11px] text-neutral-500">{p.ano}</span>}
        </div>
        <h3 className="font-semibold leading-snug">{p.titulo}</h3>
        <p className="line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">{p.resumo}</p>
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.tags.slice(0, 4).map((t) => (
              <span key={t.slug} className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{t.nome}</span>
            ))}
            {p.tags.length > 4 && <span className="px-1 text-[11px] text-neutral-500">+{p.tags.length - 4}</span>}
          </div>
        )}
        <p className="mt-auto pt-2 text-xs text-neutral-500">
          {autores.join(", ")}
          {orientador && ` · orient. ${orientador.nome.split(" ")[0]}`}
        </p>
      </div>
    </Link>
  );
}
