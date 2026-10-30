import { Suspense } from "react";
import { BotoesLogin } from "./botoes";

const MENSAGENS: Record<string, string> = {
  dominio:
    "Essa conta não é @unifei.edu.br. Entre com o Google da UNIFEI — se tentou pelo GitHub, vincule-o primeiro no seu perfil.",
  falha: "Não deu para concluir o login. Tente de novo.",
};

async function Aviso({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  if (!erro) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
      {MENSAGENS[erro] ?? MENSAGENS.falha}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Entrar</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Para alunos e professores da Computação da UNIFEI.
        </p>
      </div>
      <Suspense>
        <Aviso searchParams={searchParams as Promise<{ erro?: string }>} />
      </Suspense>
      <BotoesLogin />
    </main>
  );
}
