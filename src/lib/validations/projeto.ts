import { z } from "zod";

export const ESCOPOS = ["CCO", "CDA", "ECO", "SIN", "POS"] as const;
export type Escopo = (typeof ESCOPOS)[number];

const linkHttps = z
  .string()
  .trim()
  .max(500, "Link muito longo.")
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), {
    message: "Use um link completo começando com https://",
  });

/** Mesmas regras do banco (constraints), para dar erro amigável antes. */
export const ProjetoSchema = z.object({
  titulo: z.string().trim().min(3, "Título muito curto.").max(120, "Título com no máximo 120 caracteres."),
  resumo: z
    .string()
    .trim()
    .min(10, "Escreva um resumo com pelo menos 10 caracteres.")
    .max(280, "Resumo com no máximo 280 caracteres."),
  descricao_md: z.string().max(20000, "Descrição com no máximo 20 mil caracteres."),
  repo_url: linkHttps,
  demo_url: linkHttps,
  video_url: linkHttps,
  ano: z.number().int().min(1990, "Ano inválido.").max(2100, "Ano inválido.").nullable(),
  escopos: z.array(z.enum(ESCOPOS)).min(1, "Marque pelo menos um curso ou a pós.").max(5),
  tags: z.array(z.string().uuid()).max(10, "No máximo 10 tags."),
});

export type DadosProjeto = z.input<typeof ProjetoSchema>;

export const GITHUB_REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
