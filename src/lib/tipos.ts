export const CURSOS = {
  CCO: "Ciência da Computação",
  CDA: "Ciência de Dados Aplicada",
  ECO: "Engenharia da Computação",
  SIN: "Sistemas de Informação",
} as const;

export type Curso = keyof typeof CURSOS;
export type TipoUsuario = "ALUNO" | "PROFESSOR";
export type Papel = "USUARIO" | "MODERADOR" | "SUPERADMIN";
export type StatusVinculo = "ATIVO" | "EGRESSO";

export type Profile = {
  id: string;
  nome: string;
  tipo: TipoUsuario;
  papel: Papel;
  onboarding_completo: boolean;
  bio: string | null;
  foto_url: string | null;
  linkedin_url: string | null;
  github_username: string | null;
  perfil_publico: boolean;
  verificado: boolean;
};

export type Vinculo = {
  id: string;
  nivel: "GRADUACAO" | "POS";
  curso: Curso | null;
  programa: string | null;
  status: StatusVinculo;
  ano_ingresso: number | null;
};
