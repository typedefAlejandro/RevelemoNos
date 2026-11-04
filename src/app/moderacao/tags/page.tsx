import { Suspense } from "react";
import { exigirModerador } from "@/lib/auth";
import { listarTags } from "../../projetos/dados";
import { AbasModeracao } from "../abas";
import { GerenciarTags } from "./gerenciar";

async function Conteudo() {
  const { supabase } = await exigirModerador();
  const [tags, { data: usosBrutos }] = await Promise.all([
    listarTags(supabase),
    supabase.from("projeto_tags").select("tag_id"),
  ]);
  const usos: Record<string, number> = {};
  for (const u of usosBrutos ?? []) usos[u.tag_id] = (usos[u.tag_id] ?? 0) + 1;
  return <GerenciarTags tags={tags} usos={usos} />;
}

export default function TagsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Moderação</h1>
      <AbasModeracao ativa="/moderacao/tags" />
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        O número ao lado de cada tag é quantos projetos (que você consegue ver) a usam. Prefira juntar variações
        (&quot;React&quot; e &quot;ReactJS&quot;) numa tag só.
      </p>
      <Suspense fallback={<p className="text-neutral-500">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}
