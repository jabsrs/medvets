import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes = parseInt(searchParams.get("mes") ?? String(new Date().getMonth() + 1));
  const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()));

  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999);

  const [
    atendimentosRaw,
    vacinasTotal,
    agendamentosRaw,
    vendasAgregado,
    receitasAgregado,
    despesasAgregado,
    topProdutosRaw,
  ] = await Promise.all([
    prisma.atendimento.findMany({
      where: { data: { gte: inicio, lte: fim } },
      select: { medico: { select: { id: true, name: true } } },
    }),
    prisma.vacinaAplicada.count({
      where: { dataAplicacao: { gte: inicio, lte: fim } },
    }),
    prisma.agendamento.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { inicio: { gte: inicio, lte: fim } },
    }),
    prisma.venda.aggregate({
      where: { status: "FECHADA", createdAt: { gte: inicio, lte: fim } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.lancamento.aggregate({
      where: { tipo: "RECEITA", status: "PAGO", pagamento: { gte: inicio, lte: fim } },
      _sum: { valor: true },
    }),
    prisma.lancamento.aggregate({
      where: { tipo: "DESPESA", status: "PAGO", pagamento: { gte: inicio, lte: fim } },
      _sum: { valor: true },
    }),
    prisma.itemVenda.groupBy({
      by: ["produtoId"],
      _sum: { quantidade: true, subtotal: true },
      where: { venda: { status: "FECHADA", createdAt: { gte: inicio, lte: fim } } },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 5,
    }),
  ]);

  // Agrupa atendimentos por médico
  const vetMap = new Map<string, { id: string; nome: string; count: number }>();
  for (const a of atendimentosRaw) {
    const { id, name } = a.medico;
    const entry = vetMap.get(id) ?? { id, nome: name, count: 0 };
    entry.count++;
    vetMap.set(id, entry);
  }
  const porVet = Array.from(vetMap.values()).sort((a, b) => b.count - a.count);

  // Busca nomes dos top produtos
  const produtoIds = topProdutosRaw.map(p => p.produtoId);
  const produtos = await prisma.produto.findMany({
    where: { id: { in: produtoIds } },
    select: { id: true, nome: true, tipo: true },
  });
  const produtoNomeMap = new Map(produtos.map(p => [p.id, { nome: p.nome, tipo: p.tipo }]));
  const topProdutos = topProdutosRaw.map(p => ({
    produtoId: p.produtoId,
    nome: produtoNomeMap.get(p.produtoId)?.nome ?? "—",
    tipo: produtoNomeMap.get(p.produtoId)?.tipo ?? "PRODUTO",
    quantidade: p._sum.quantidade ?? 0,
    subtotal: p._sum.subtotal ?? 0,
  }));

  const receitas = receitasAgregado._sum.valor ?? 0;
  const despesas = despesasAgregado._sum.valor ?? 0;

  return NextResponse.json({
    periodo: { mes, ano },
    atendimentos: {
      total: atendimentosRaw.length,
      porVet,
    },
    vacinas: { total: vacinasTotal },
    agendamentos: {
      total: agendamentosRaw.reduce((s, a) => s + a._count._all, 0),
      porStatus: Object.fromEntries(agendamentosRaw.map(a => [a.status, a._count._all])),
    },
    vendas: {
      total: vendasAgregado._sum.total ?? 0,
      count: vendasAgregado._count._all,
    },
    financeiro: {
      receitas,
      despesas,
      saldo: receitas - despesas,
    },
    topProdutos,
  });
}
