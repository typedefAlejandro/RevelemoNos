import { Suspense } from "react";
import { exigirSuperadmin } from "@/lib/auth";
import { campo } from "../projetos/estilos";
import { LinhaUsuario, type Usuario } from "./linha-usuario";

async function Lista({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase, uid } = await exigirSuperadmin();
  const { q } = await searchParams;
  const busca = (q ?? "").slice(0, 80);
  const { data, error } = await supabase.rpc("admin_listar_usuarios", { p_busca: busca || null });
  if (error) return <p className="text-red-700">Não foi possível carregar os usuários.</p>;
  const usuarios = (data ?? []) as Usuario[];

  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2">
        <input name="q" defaultValue={busca} className={campo} placeholder="Buscar por nome, e-mail ou @github" />
        <button className="shrink-0 rounded-lg border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700">Buscar</button>
      </form>
      <p className="text-sm text-neutral-500">
        {usuarios.length} usuário(s). Os não verificados aparecem primeiro. Verificar = conferir que o vínculo declarado (curso, professor) é real.
      </p>
      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {usuarios.map((u) => <LinhaUsuario key={u.id} u={u} euMesmo={u.id === uid} />)}
      </ul>
    </div>
  );
}

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Administração</h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">
        Nomeie moderadores por curso e verifique vínculos. E-mails aparecem só aqui, para o superadmin.
      </p>
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Lista searchParams={searchParams as Promise<{ q?: string }>} />
      </Suspense>
    </main>
  );
}
