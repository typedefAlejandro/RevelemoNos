"use client";

import { useRef, useState, useTransition } from "react";
import { formatarMB, prepararImagem } from "@/lib/imagem";
import { urlLogo, type Tag } from "@/lib/projetos";
import { createClient } from "@/lib/supabase/client";
import { alertaErro, botaoSecundario, campo } from "../../projetos/estilos";
import { atualizarGrupo } from "../actions";

export function EditarGrupo({ grupo, onFechar }: { grupo: Tag; onFechar: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [descricao, setDescricao] = useState(grupo.descricao ?? "");
  const [site, setSite] = useState(grupo.site_url ?? "");
  const [logo, setLogo] = useState<string | null>(grupo.logo_path ?? null);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, startTransition] = useTransition();

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setErro(null);
    startTransition(async () => {
      try {
        const img = await prepararImagem(arquivo);
        const caminho = `grupos/${grupo.slug}-${Date.now()}.${img.ext}`;
        const { error } = await createClient().storage.from("logos").upload(caminho, img.blob, { contentType: img.tipo });
        if (error) return setErro("Não foi possível enviar o logo.");
        setLogo(caminho);
        setMsg(img.reduzida ? `Logo otimizado para ${formatarMB(img.blob.size)}. Clique em Salvar.` : "Logo enviado. Clique em Salvar.");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Imagem inválida.");
      }
    });
  }

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const antigo = grupo.logo_path;
      const r = await atualizarGrupo(grupo.id, { descricao, site_url: site, logo_path: logo });
      if (r.erro) return setErro(r.erro);
      if (antigo && antigo !== logo) await createClient().storage.from("logos").remove([antigo]);
      onFechar();
    });
  }

  const url = urlLogo(logo);
  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
      <p className="font-medium">{grupo.nome}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl font-bold text-neutral-400">{grupo.nome[0]}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <input ref={input} type="file" accept="image/*" className="hidden" onChange={escolher} />
          <div className="flex gap-3">
            <button type="button" disabled={ocupado} onClick={() => input.current?.click()} className={`text-sm ${botaoSecundario}`}>
              {logo ? "Trocar logo" : "Enviar logo"}
            </button>
            {logo && <button type="button" onClick={() => setLogo(null)} className="text-sm underline">Remover</button>}
          </div>
          <span className="text-xs text-neutral-500">Quadrado, fundo transparente (PNG) fica melhor.</span>
        </div>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Descrição curta
        <textarea className={campo} rows={3} maxLength={500} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que o grupo faz, em 1–2 frases." />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Site ou Instagram
        <input className={campo} value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://..." />
      </label>
      {msg && <p className="text-sm text-green-700 dark:text-green-400">{msg}</p>}
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
      <div className="flex gap-3">
        <button type="button" disabled={ocupado} onClick={salvar} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">Salvar</button>
        <button type="button" onClick={onFechar} className="text-sm underline">Cancelar</button>
      </div>
    </div>
  );
}
