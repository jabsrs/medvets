import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const de  = searchParams.get("de");
  const ate = searchParams.get("ate");
  const forma = searchParams.get("forma");

  const dataWhere: Record<string, unknown> = {};
  if (de || ate) {
    dataWhere.data = {
      ...(de  ? { gte: new Date(de  + "T00:00:00") } : {}),
      ...(ate ? { lte: new Date(ate + "T23:59:59") } : {}),
    };
  }
  if (forma) dataWhere.forma = forma;

  // Pagamentos individuais com tutor via venda
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      ...dataWhere,
      venda: { status: "FECHADA" },
    },
    include: {
      venda: {
        select: {
          id: true,
          total: true,
          desconto: true,
          createdAt: true,
          tutor: { select: { id: true, nome: true } },
          itens: { select: { quantidade: true, produto: { select: { nome: true } } }, take: 3 },
        },
      },
    },
    orderBy: { data: "desc" },
    take: 500,
  });

  // Totais agrupados por forma
  const grupos = await prisma.pagamento.groupBy({
    by: ["forma"],
    where: {
      ...dataWhere,
      venda: { status: "FECHADA" },
    },
    _sum:   { valor: true },
    _count: { _all: true },
  });

  const totalGeral = grupos.reduce((s, g) => s + (g._sum.valor ?? 0), 0);
  const qtdVendas  = new Set(pagamentos.map(p => p.vendaId)).size;

  return NextResponse.json({
    pagamentos,
    totais: grupos.map(g => ({
      forma: g.forma,
      total: g._sum.valor ?? 0,
      qtd:   g._count._all,
    })),
    resumo: {
      totalGeral,
      qtdPagamentos: pagamentos.length,
      qtdVendas,
    },
  });
}
