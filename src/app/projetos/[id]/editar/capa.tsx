"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { urlCapa } from "@/lib/projetos";
import { definirCapa } from "../../actions";
import { alertaErro, botaoSecundario } from "../../estilos";

const TIPOS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX = 2 * 1024 * 1024;

export function Capa({ projetoId, uid, path, podeEditar }: { projetoId: string; uid: string; path: string | null; podeEditar: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [atual, setAtual] = useState(path);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const url = urlCapa(atual);

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    const ext = TIPOS[arquivo.type];
    if (!ext) return setErro("Use uma imagem PNG, JPG ou WEBP.");
    if (arquivo.size > MAX) return setErro("A imagem precisa ter no máximo 2 MB.");

    startTransition(async () => {
      const supabase = createClient();
      // A pasta é o id do usuário: a regra do Storage só deixa escrever nela.
      const novo = `${uid}/${projetoId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("capas").upload(novo, arquivo, { contentType: arquivo.type });
      if (error) return setErro("Não foi possível enviar a imagem.");
      const r = await definirCapa(projetoId, novo);
      if (r.erro) {
        await supabase.storage.from("capas").remove([novo]);
        return setErro(r.erro);
      }
      if (atual?.startsWith(`${uid}/`)) await supabase.storage.from("capas").remove([atual]);
      setAtual(novo);
    });
  }

  function remover() {
    setErro(null);
    startTransition(async () => {
      const r = await definirCapa(projetoId, null);
      if (r.erro) return setErro(r.erro);
      if (atual?.startsWith(`${uid}/`)) await createClient().storage.from("capas").remove([atual]);
      setAtual(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Capa do projeto" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-neutral-500">Sem capa (16:9 recomendado)</span>
        )}
      </div>
      {podeEditar && (
        <div className="flex flex-wrap items-center gap-3">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={escolher} />
          <button type="button" disabled={enviando} onClick={() => input.current?.click()} className={botaoSecundario}>
            {enviando ? "Enviando…" : url ? "Trocar capa" : "Enviar capa"}
          </button>
          {url && (
            <button type="button" disabled={enviando} onClick={remover} className="text-sm text-neutral-500 underline">
              Remover
            </button>
          )}
          <span className="text-xs text-neutral-500">PNG, JPG ou WEBP até 2 MB.</span>
        </div>
      )}
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
    </div>
  );
}
