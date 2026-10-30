import { STATUS_INFO, type StatusProjeto } from "@/lib/projetos";

export function BadgeStatus({ status }: { status: StatusProjeto }) {
  const info = STATUS_INFO[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${info.classe}`}>{info.rotulo}</span>;
}
