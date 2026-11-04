import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Cabecalho } from "@/components/cabecalho";
import "./globals.css";
import { cn } from "@/lib/utils";

// Fontes empacotadas pelo pacote "geist": o build não depende de baixar do Google Fonts.

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Revelemo-nos — Projetos da Computação UNIFEI",
  description:
    "Vitrine dos projetos de alunos e professores de CCO, CDA, ECO, SIN e da pós-graduação da UNIFEI. Uma iniciativa do DACOMP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full", "antialiased", GeistSans.variable, GeistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <Cabecalho />
        {children}
      </body>
    </html>
  );
}
