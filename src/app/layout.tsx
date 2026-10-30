import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Cabecalho } from "@/components/cabecalho";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// Fontes empacotadas pelo pacote "geist": o build não depende de baixar do Google Fonts.

export const metadata: Metadata = {
  title: "Revelemo-nos — Projetos da Computação UNIFEI",
  description:
    "Vitrine dos projetos de alunos e professores de CCO, CDA, ECO, SIN e da pós-graduação da UNIFEI. Uma iniciativa do DACOMP.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full", "antialiased", GeistSans.variable, GeistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Cabecalho />
        {children}
      </body>
    </html>
  );
}
