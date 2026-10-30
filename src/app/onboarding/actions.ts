"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ano = z.number().int().min(1960).max(2100).nullable();

const Vinculo = z.discriminatedUnion("nivel", [
  z.object({
    nivel: z.literal("GRADUACAO"),
    curso: z.enum(["CCO", "CDA", "ECO", "SIN"]),
    status: z.enum(["ATIVO", "EGRESSO"]),
    ano_ingresso: ano,
  }),
  z.object({
    nivel: z.literal("POS"),
    programa: z.string().trim().min(3, "Informe o programa de pós.").max(120),
    status: z.enum(["ATIVO", "EGRESSO"]),
    ano_ingresso: ano,
  }),
]);

const Onboarding = z
  .object({
    tipo: z.enum(["ALUNO", "PROFESSOR"]),
    vinculos: z.array(Vinculo).max(2),
  })
  .refine((d) => d.tipo === "PROFESSOR" || d.vinculos.length > 0, {
    message: "Aluno precisa marcar graduação, pós ou as duas.",
  });

export type DadosOnboarding = z.input<typeof Onboarding>;

export async function concluirOnboarding(dados: DadosOnboarding) {
  const parsed = Onboarding.safeParse(dados);
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  // A regra de verdade está na função do banco (atômica e com RLS).
  const { error } = await supabase.rpc("concluir_onboarding", {
    p_tipo: parsed.data.tipo,
    p_vinculos: parsed.data.vinculos,
  });
  if (error) return { erro: "Não foi possível salvar. Confira os dados e tente de novo." };

  redirect("/perfil");
}
