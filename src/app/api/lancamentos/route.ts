import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo = tipo;
  if (status) where.status = status;

  const lancamentos = await prisma.lancamento.findMany({
    where,
    orderBy: { vencimento: "asc" },
    take: 100,
  });

  return NextResponse.json(lancamentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.vencimento) data.vencimento = new Date(data.vencimento);
  if (data.pagamento) data.pagamento = new Date(data.pagamento);

  const lancamento = await prisma.lancamento.create({ data });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "CREATE", entidade: "Lancamento", entidadeId: lancamento.id,
    descricao: `Lançou ${lancamento.tipo === "RECEITA" ? "receita" : "despesa"}: "${lancamento.descricao}" — R$ ${lancamento.valor.toFixed(2)}`,
    ip: getIp(req),
  });

  return NextResponse.json(lancamento, { status: 201 });
}
