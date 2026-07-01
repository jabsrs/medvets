import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function dayRange(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  return { gte: start, lte: end };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const data   = searchParams.get("data");
  const userId = searchParams.get("userId");

  const isAdmin = ["ADMIN", "FINANCEIRO"].includes(session.user?.role ?? "");

  const where: Record<string, unknown> = {};
  if (!isAdmin) where.userId = session.user?.id;
  else if (userId) where.userId = userId;
  if (data) where.data = dayRange(data);

  const caixas = await prisma.caixa.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { data: "desc" },
    take: 100,
  });

  // Totais de pagamentos do dia solicitado (ou hoje)
  const diaRef = data ?? new Date().toISOString().slice(0, 10);
  const range  = dayRange(diaRef);

  const grupos = await prisma.pagamento.groupBy({
    by: ["forma"],
    where: { data: range },
    _sum: { valor: true },
    _count: { _all: true },
  });

  const totalVendas = await prisma.venda.aggregate({
    where: { status: "FECHADA", updatedAt: range },
    _sum: { total: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    caixas,
    totaisDia: grupos.map(g => ({
      forma:       g.forma,
      total:       g._sum.valor ?? 0,
      qtd:         g._count._all,
    })),
    resumoDia: {
      totalVendas: totalVendas._sum.total ?? 0,
      qtdVendas:   totalVendas._count._all,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const hoje = new Date();
  const range = dayRange(hoje.toISOString().slice(0, 10));

  const existing = await prisma.caixa.findFirst({
    where: { userId: session.user?.id!, data: range, status: { in: ["ABERTO", "EM_REVISAO"] } },
  });

  if (existing) {
    return NextResponse.json({ error: "Já existe um caixa aberto para hoje" }, { status: 400 });
  }

  const caixa = await prisma.caixa.create({
    data: {
      userId:        session.user?.id!,
      data:          hoje,
      saldoAbertura: Number(body.saldoAbertura ?? 0),
      obs:           body.obs ?? null,
      status:        "ABERTO",
    },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(caixa, { status: 201 });
}
