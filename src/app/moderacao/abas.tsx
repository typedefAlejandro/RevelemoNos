import Link from "next/link";

const ABAS = [
  { href: "/moderacao", rotulo: "Fila" },
  { href: "/moderacao/historico", rotulo: "Histórico" },
  { href: "/moderacao/tags", rotulo: "Tags" },
] as const;

export function AbasModeracao({ ativa }: { ativa: (typeof ABAS)[number]["href"] }) {
  return (
    <nav className="mb-8 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
      {ABAS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            ativa === a.href ? "border-neutral-900 dark:border-white" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
