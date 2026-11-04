"use client";

import { useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import { CATEGORIA_ROTULO, ESCOPO_ROTULO, ORDEM_CATEGORIAS, type CategoriaTag, type Tag } from "@/lib/projetos";
import { ESCOPOS, type DadosProjeto, type Escopo } from "@/lib/validations/projeto";
import { atualizarProjeto, criarProjeto, sugerirTag } from "./actions";
import { alertaErro, alertaOk, botaoPrimario, campo } from "./estilos";

type Props = {
  modo: "criar" | "editar";
  projetoId?: string;
  githubRepo?: string;
  inicial: DadosProjeto;
  tags: Tag[];
  aprovado?: boolean;
  sugestoes?: { id: string; nome: string; status: "PENDENTE" | "APROVADA" | "RECUSADA"; motivo: string | null }[];
};

export function FormProjeto({ modo, projetoId, githubRepo, inicial, tags, aprovado, sugestoes = [] }: Props) {
  const [d, setD] = useState<DadosProjeto>(inicial);
  const [anoTexto, setAnoTexto] = useState(inicial.ano?.toString() ?? "");
  const [aba, setAba] = useState<"escrever" | "ver">("escrever");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<false | "salvo" | "proposta">(false);
  const [salvando, startTransition] = useTransition();
  const [manter, setManter] = useState(true);
  const [sugerindo, setSugerindo] = useState(false);
  const [novaTag, setNovaTag] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<CategoriaTag>("TEMA");
  const [msgSugestao, setMsgSugestao] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviandoSugestao, startSugestao] = useTransition();

  function enviarSugestao() {
    setMsgSugestao(null);
    startSugestao(async () => {
      const r = await sugerirTag(novaTag, novaCategoria, projetoId);
      if ("erro" in r && r.erro) return setMsgSugestao({ tipo: "erro", texto: r.erro });
      if ("status" in r && r.status === "existe" && r.tag_id) {
        if (!d.tags.includes(r.tag_id) && d.tags.length < 10) set("tags", [...d.tags, r.tag_id]);
        setMsgSugestao({ tipo: "ok", texto: "Essa tag já existe e foi marcada para você." });
      } else if ("status" in r && r.status === "ja_sugerida") {
        setMsgSugestao({ tipo: "ok", texto: "Você já sugeriu essa tag. Ela está aguardando a moderação." });
      } else {
        setMsgSugestao({
          tipo: "ok",
          texto: projetoId
            ? "Sugestão enviada! Quando a moderação aprovar, a tag entra sozinha neste projeto."
            : "Sugestão enviada! Quando for aprovada, ela aparece na lista para você marcar.",
        });
      }
      setNovaTag("");
    });
  }

  function set<K extends keyof DadosProjeto>(k: K, v: DadosProjeto[K]) {
    setD((atual) => ({ ...atual, [k]: v }));
    setOk(false);
  }

  function alternar<T>(lista: T[], item: T) {
    return lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item];
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const n = Number.parseInt(anoTexto, 10);
    const dados = { ...d, ano: Number.isFinite(n) ? n : null };
    startTransition(async () => {
      const r =
        modo === "criar"
          ? await criarProjeto(dados, githubRepo)
          : await atualizarProjeto(projetoId!, dados, aprovado ? manter : false);
      if (r?.erro) setErro(r.erro);
      else if (r?.ok) setOk("proposta" in r && r.proposta ? "proposta" : "salvo");
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      {githubRepo && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Importando de <span className="font-mono">{githubRepo}</span>. Revise e complete os campos.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Título *</span>
        <input className={campo} value={d.titulo} maxLength={120} onChange={(e) => set("titulo", e.target.value)} required />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="flex justify-between font-medium">
          Resumo * <span className="font-normal text-neutral-500">{d.resumo.length}/280</span>
        </span>
        <textarea
          className={campo}
          rows={2}
          maxLength={280}
          value={d.resumo}
          onChange={(e) => set("resumo", e.target.value)}
          placeholder="Uma ou duas frases: o que é e para quem serve."
          required
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium">Descrição (Markdown)</span>
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-900">
            {(["escrever", "ver"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAba(a)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${aba === a ? "bg-white shadow-sm dark:bg-neutral-700" : "text-neutral-500"}`}
              >
                {a === "escrever" ? "Escrever" : "Visualizar"}
              </button>
            ))}
          </div>
        </div>
        {aba === "escrever" ? (
          <textarea
            className={`${campo} font-mono text-sm`}
            rows={12}
            value={d.descricao_md}
            onChange={(e) => set("descricao_md", e.target.value)}
            placeholder={"## Sobre\nO que o projeto faz, como foi feito, o que aprenderam...\n\n## Como rodar\n```\nnpm install\n```"}
          />
        ) : (
          <div className="min-h-48 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            {d.descricao_md.trim() ? <Markdown texto={d.descricao_md} /> : <p className="text-neutral-500">Nada para mostrar ainda.</p>}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Repositório</span>
          <input className={campo} value={d.repo_url} onChange={(e) => set("repo_url", e.target.value)} placeholder="https://github.com/..." />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Demo / site</span>
          <input className={campo} value={d.demo_url} onChange={(e) => set("demo_url", e.target.value)} placeholder="https://..." />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Vídeo</span>
          <input className={campo} value={d.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://youtube.com/..." />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Ano</span>
          <input className={campo} inputMode="numeric" value={anoTexto} onChange={(e) => { setAnoTexto(e.target.value); setOk(false); }} placeholder="2025" />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-medium">Cursos / nível *</legend>
        <div className="flex flex-wrap gap-2">
          {ESCOPOS.map((e: Escopo) => (
            <label key={e} className={`cursor-pointer rounded-full border px-3 py-1 ${d.escopos.includes(e) ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`}>
              <input type="checkbox" className="sr-only" checked={d.escopos.includes(e)} onChange={() => set("escopos", alternar(d.escopos, e))} />
              {ESCOPO_ROTULO[e]}
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">Define quem modera o projeto e em quais filtros ele aparece.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-3 text-sm">
        <legend className="mb-1 font-medium">Tags <span className="font-normal text-neutral-500">({d.tags.length}/10)</span></legend>
        {ORDEM_CATEGORIAS.map((cat) => (
          <div key={cat} className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wide text-neutral-500">{CATEGORIA_ROTULO[cat]}</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.filter((t) => t.categoria === cat).map((t) => {
                const marcada = d.tags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => (marcada || d.tags.length < 10) && set("tags", alternar(d.tags, t.id))}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${marcada ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"}`}
                  >
                    {t.nome}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {sugestoes.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs">
            {sugestoes.map((s) => (
              <li key={s.id} className="text-neutral-600 dark:text-neutral-400">
                Sugestão <strong>{s.nome}</strong>:{" "}
                {s.status === "PENDENTE" ? "aguardando moderação" : s.status === "APROVADA" ? "aprovada" : `recusada${s.motivo ? ` — ${s.motivo}` : ""}`}
              </li>
            ))}
          </ul>
        )}
        {sugerindo ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
            <span className="text-xs font-medium">Sugerir uma tag nova (passa pela moderação)</span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className={campo} value={novaTag} maxLength={40} onChange={(e) => setNovaTag(e.target.value)} placeholder="Ex.: Visão Computacional" />
              <select className={`${campo} sm:w-44`} value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value as CategoriaTag)}>
                {ORDEM_CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_ROTULO[c]}</option>)}
              </select>
              <button type="button" disabled={enviandoSugestao || novaTag.trim().length < 2} onClick={enviarSugestao} className="shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-60 dark:border-neutral-700">
                {enviandoSugestao ? "Enviando…" : "Sugerir"}
              </button>
            </div>
            {msgSugestao && <p className={`text-xs ${msgSugestao.tipo === "erro" ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>{msgSugestao.texto}</p>}
          </div>
        ) : (
          <button type="button" onClick={() => setSugerindo(true)} className="self-start text-xs underline">
            Não achou a tag? Sugira uma nova
          </button>
        )}
      </fieldset>

      {aprovado && (
        <fieldset className="flex flex-col gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <legend className="sr-only">Como publicar as alterações</legend>
          <p className="font-medium">Este projeto está publicado. Ao salvar:</p>
          <label className="flex items-start gap-2">
            <input type="radio" name="publicacao" className="mt-1" checked={manter} onChange={() => setManter(true)} />
            <span><strong>Manter a versão atual no ar</strong> — o público continua vendo a versão publicada; a nova só aparece depois que a moderação aprovar. Bom para melhorias e ajustes.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="publicacao" className="mt-1" checked={!manter} onChange={() => setManter(false)} />
            <span><strong>Tirar do ar até aprovar</strong> — o projeto sai da vitrine agora e só volta com a nova versão aprovada. Use quando estiver corrigindo algo que não pode ficar público.</span>
          </label>
        </fieldset>
      )}
      {erro && <p role="alert" className={alertaErro}>{erro}</p>}
      {ok === "salvo" && <p className={alertaOk}>Alterações salvas.</p>}
      {ok === "proposta" && <p className={alertaOk}>Alteração enviada para a moderação. A versão atual continua no ar até ser aprovada.</p>}

      <button type="submit" disabled={salvando} className={`self-start ${botaoPrimario}`}>
        {salvando ? "Salvando…" : modo === "criar" ? "Criar rascunho" : "Salvar alterações"}
      </button>
    </form>
  );
}
