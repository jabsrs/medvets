import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const fornecedorId = req.nextUrl.searchParams.get("fornecedorId");

  const where: Record<string, unknown> = {};
  if (fornecedorId) where.fornecedorId = fornecedorId;
  if (q) where.OR = [
    { nf: { contains: q } },
    { fornecedor: { nome: { contains: q, mode: "insensitive" } } },
  ];

  const compras = await prisma.compra.findMany({
    where,
    include: { fornecedor: { select: { nome: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(compras);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fornecedorId, nf, chaveNfe, emissaoNf, dataEntrada, natureza, total, obs, itens, parcelas, formaPagamento } = await req.json();

  // Create compra with items
  const compra = await prisma.compra.create({
    data: {
      fornecedorId: fornecedorId || null,
      userId: session.user.id,
      nf: nf || null,
      chaveNfe: chaveNfe || null,
      emissaoNf: emissaoNf ? new Date(emissaoNf) : null,
      dataEntrada: dataEntrada ? new Date(dataEntrada) : new Date(),
      natureza: natureza || null,
      total: total ?? 0,
      obs: obs || null,
      itens: {
        create: (itens ?? []).map((i: {
          produtoId?: string; codigoProd?: string; nomeProd: string; marca?: string;
          quantidade: number; vlUnit: number; vlTotal: number;
          usoInterno: boolean; markup?: number; precoVenda?: number;
        }) => ({
          produtoId: i.produtoId || null,
          codigoProd: i.codigoProd || null,
          nomeProd: i.nomeProd,
          marca: i.marca || null,
          quantidade: i.quantidade,
          vlUnit: i.vlUnit,
          vlTotal: i.vlTotal,
          usoInterno: i.usoInterno ?? false,
          markup: i.markup ?? null,
          precoVenda: i.precoVenda ?? null,
        })),
      },
    },
    include: { fornecedor: true, itens: true },
  });

  // Update products: stock, cost, and optionally sale price
  for (const item of (itens ?? []) as {
    produtoId?: string; quantidade: number; vlUnit: number;
    usoInterno: boolean; markup?: number; precoVenda?: number;
  }[]) {
    if (!item.produtoId) continue;

    const updateData: Record<string, unknown> = {
      custo: item.vlUnit,
      estoque: { increment: item.quantidade },
    };

    // Only update sale price for non-internal products when markup is provided
    if (!item.usoInterno && item.precoVenda) {
      updateData.preco = item.precoVenda;
    }

    await prisma.produto.update({
      where: { id: item.produtoId },
      data: updateData,
    });

    // Record stock movement
    await prisma.movEstoque.create({
      data: {
        produtoId: item.produtoId,
        tipo: "ENTRADA",
        quantidade: item.quantidade,
        custo: item.vlUnit,
        motivo: `Compra NF ${nf ?? "s/n"} — ${compra.id.slice(-6)}`,
      },
    });
  }

  // Create payment installments (Lancamento) if provided
  if (parcelas && Array.isArray(parcelas) && parcelas.length > 0) {
    const fornecedorNome = compra.fornecedor?.nome ?? "Fornecedor";
    const lancamentoData = (parcelas as { num: number; vencimento: string; valor: number }[]).map(p => ({
      tipo: "DESPESA" as const,
      descricao: `NF ${nf ?? "s/n"} — ${fornecedorNome}${parcelas.length > 1 ? ` — Parcela ${p.num}/${parcelas.length}` : ""}`,
      valor: p.valor,
      vencimento: new Date(p.vencimento + "T12:00:00"),
      status: "PENDENTE" as const,
      categoria: "Compra",
      formaPagamento: formaPagamento ?? null,
      compraId: compra.id,
      parcelaNum: p.num,
      totalParcelas: parcelas.length,
    }));

    await prisma.lancamento.createMany({ data: lancamentoData });

    // Create ALERTA notifications for all ATENDENTE users for installments due tomorrow
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaInicio = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate());
    const amanhaFim    = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 23, 59, 59);

    const parcelasAmanha = (parcelas as { num: number; vencimento: string; valor: number }[]).filter(p => {
      const d = new Date(p.vencimento + "T12:00:00");
      return d >= amanhaInicio && d <= amanhaFim;
    });

    if (parcelasAmanha.length > 0) {
      const atendentes = await prisma.user.findMany({
        where: { role: { in: ["ATENDENTE", "ADMIN"] }, active: true },
        select: { id: true },
      });

      const notifData = atendentes.flatMap(u =>
        parcelasAmanha.map(p => ({
          userId: u.id,
          titulo: "Pagamento vence amanhã",
          mensagem: `NF ${nf ?? "s/n"} — ${fornecedorNome}${parcelas.length > 1 ? ` (Parc. ${p.num}/${parcelas.length})` : ""} — R$ ${p.valor.toFixed(2)}`,
          tipo: "ALERTA" as const,
          link: "/financeiro",
        }))
      );

      if (notifData.length > 0) {
        await prisma.notificacao.createMany({ data: notifData });
      }
    }
  }

  return NextResponse.json(compra, { status: 201 });
}
