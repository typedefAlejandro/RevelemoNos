import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Volta do Google/GitHub. Troca o "code" pela sessão (cookie),
 * sincroniza o GitHub vinculado e decide para onde mandar a pessoa.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/perfil";
  // Só caminhos internos — evita "open redirect" para outro site.
  const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/perfil";

  const erroProvedor = url.searchParams.get("error_description");
  if (erroProvedor) {
    // O trigger do banco recusa e-mails fora de @unifei.edu.br; o Supabase
    // devolve isso como "Database error saving new user".
    const motivo = /database|unifei/i.test(erroProvedor)
      ? "dominio"
      : /already|linked|identity/i.test(erroProvedor)
        ? "github_em_uso"
        : "falha";
    const volta = destino === "/perfil" && motivo === "github_em_uso" ? "/perfil" : "/login";
    return NextResponse.redirect(`${origin}${volta}?erro=${motivo}`);
  }

  if (!code) return NextResponse.redirect(`${origin}/login?erro=falha`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?erro=falha`);

  await supabase.rpc("sincronizar_github");

  const { data: claims } = await supabase.auth.getClaims();
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completo")
    .eq("id", claims?.claims?.sub ?? "")
    .single();

  const final = profile?.onboarding_completo ? destino : "/onboarding";
  return NextResponse.redirect(`${origin}${final}`);
}
