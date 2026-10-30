import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/**
 * Renderiza Markdown escrito por usuários com segurança:
 * sem HTML cru (não usamos rehype-raw) e com sanitização do resultado.
 */
export function Markdown({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3 leading-relaxed text-neutral-800 dark:text-neutral-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: (p) => <h2 className="mt-4 text-2xl font-bold" {...p} />,
          h2: (p) => <h3 className="mt-4 text-xl font-semibold" {...p} />,
          h3: (p) => <h4 className="mt-3 text-lg font-semibold" {...p} />,
          ul: (p) => <ul className="list-inside list-disc" {...p} />,
          ol: (p) => <ol className="list-inside list-decimal" {...p} />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline">
              {children}
            </a>
          ),
          code: (p) => <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-sm dark:bg-neutral-800" {...p} />,
          pre: (p) => <pre className="overflow-x-auto rounded-lg bg-neutral-100 p-3 text-sm dark:bg-neutral-900" {...p} />,
          blockquote: (p) => <blockquote className="border-l-4 border-neutral-300 pl-3 italic dark:border-neutral-700" {...p} />,
          table: (p) => <div className="overflow-x-auto"><table className="text-sm" {...p} /></div>,
          th: (p) => <th className="border px-2 py-1 text-left dark:border-neutral-700" {...p} />,
          td: (p) => <td className="border px-2 py-1 dark:border-neutral-700" {...p} />,
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} className="max-w-full rounded-lg" loading="lazy" />,
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}
