import { prisma } from "./prisma";
import { NextRequest } from "next/server";

type AuditParams = {
  userId?: string | null;
  userName?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  descricao: string;
  ip?: string | null;
};

export async function audit(params: AuditParams) {
  try {
    await prisma.auditLog.create({ data: { ...params } });
  } catch {
    // Falha no audit nunca deve quebrar a operação principal
  }
}

export function getIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
