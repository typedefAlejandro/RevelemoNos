import Link from "next/link";
import { Suspense } from "react";
import { getSessao } from "@/lib/auth";

async function MenuUsuario() {
  const { profile } = await getSessao();
  if (!profile) {
    return (
      <Link href="/login" className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
        Entrar
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-4 text-sm">
      {(profile.papel === "MODERADOR" || profile.papel === "SUPERADMIN") && (
        <Link href="/moderacao" className="hover:underline">Moderação</Link>
      )}
      {profile.papel === "SUPERADMIN" && <Link href="/admin" className="hover:underline">Admin</Link>}
      <Link href="/projetos" className="hover:underline">Meus projetos</Link>
      <Link href="/perfil" className="font-medium hover:underline">{profile.nome.split(" ")[0]}</Link>
      <form action="/auth/sair" method="post">
        <button className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">Sair</button>
      </form>
    </div>
  );
}

export function Cabecalho() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-bold tracking-tight">Revelemo-nos</Link>
        <Suspense fallback={<span className="h-8" />}>
          <MenuUsuario />
        </Suspense>
      </div>
    </header>
  );
}
