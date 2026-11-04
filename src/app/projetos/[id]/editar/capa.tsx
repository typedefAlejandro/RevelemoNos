"use client";

import { useRef, useState, useTransition } from "react";
import { formatarMB, prepararImagem } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";
import { urlCapa } from "@/lib/projetos";
import { definirCapa } from "../../actions";
import { alertaErro, botaoSecundario } from "../../estilos";

export function Capa({ projetoId, uid, path, podeEditar, aprovado = false }: { projetoId: string; uid: string; path: string | null; podeEditar: boolean; aprovado?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [atual, setAtual] = useState(path);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [manter, setManter] = useState(true);
  const [enviando, startTransition] = useTransition();
  const url = urlCapa(atual);

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    setAviso(null);

    startTransition(async () => {
      let img;
      try {
        img = await prepararImagem(arquivo);
      } catch (e) {
        return setErro(e instanceof Error ? e.message : "Imagem inválida.");
      }
      const supabase = createClient();
      // A pasta é o id do usuário: a regra do Storage só deixa escrever nela.
      const novo = `${uid}/${projetoId}-${Date.now()}.${img.ext}`;
      const { error } = await supabase.storage.from("capas").upload(novo, img.blob, { contentType: img.tipo });
      if (error) return setErro("Não foi possível enviar a imagem.");
      const r = await definirCapa(projetoId, novo, aprovado && manter);
      if (r.erro) {
        await supabase.storage.from("capas").remove([novo]);
        return setErro(r.erro);
      }
      // Com "manter no ar", a capa antiga continua publicada: não apague.
      if (!(aprovado && manter) && atual?.startsWith(`${uid}/`)) await supabase.storage.from("capas").remove([atual]);
      setAtual(novo);
      if (img.reduzida) {
        setAviso(`A imagem foi otimizada de ${formatarMB(img.tamanhoOriginal)} para ${formatarMB(img.blob.size)}. Confira se a qualidade ficou boa.`);
      }
    });
  }

  function remover() {
    setErro(null);
    startTransition(async () => {
      const r = await definirCapa(projetoId, null, aprovado && manter);
      if (r.erro) return setErro(r.erro);
      if (!(aprovado && manter) && atual?.startsWith(`${uid}/`)) await createClient().storage.from("capas").remove([atual]);
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
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={escolher} />
          <button type="button" disabled={enviando} onClick={() => input.current?.click()} className={botaoSecundario}>
            {enviando ? "Enviando…" : url ? "Trocar capa" : "Enviar capa"}
          </button>
          {url && (
            <button type="button" disabled={enviando} onClick={remover} className="text-sm text-neutral-500 underline">
              Remover
            </button>
          )}
          {aprovado && (
            <select value={manter ? "manter" : "tirar"} onChange={(e) => setManter(e.target.value === "manter")} className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700">
              <option value="manter">Propor nova capa (atual segue no ar)</option>
              <option value="tirar">Trocar e tirar do ar até aprovar</option>
            </select>
          )}
          <span className="text-xs text-neutral-500">
            PNG, JPG ou WEBP até 25 MB. Ideal: 1600×900 (16:9). Acima de 2 MB, o site reduz a imagem sozinho — e a qualidade pode cair um pouco.
          </span>
        </div>
      )}
      {aviso && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{aviso}</p>}
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
    </div>
  );
}
