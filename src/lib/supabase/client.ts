import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para Client Components ("use client").
 * Usa só a chave pública (publishable): toda proteção de dados vem da RLS no banco.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
