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

  const { fornecedorId, nf, chaveNfe, emissaoNf, dataEntrada, natureza, total, obs, itens } = await req.json();

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

  return NextResponse.json(compra, { status: 201 });
}
