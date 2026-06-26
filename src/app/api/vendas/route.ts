import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendas = await prisma.venda.findMany({
    include: {
      tutor: { select: { nome: true } },
      itens: { include: { produto: { select: { nome: true } } } },
      pagamentos: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(vendas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tutorId, desconto, total, formaPagamento, itens } = await req.json();

  const venda = await prisma.venda.create({
    data: {
      tutorId: tutorId || null,
      desconto,
      total,
      status: "FECHADA",
      itens: {
        create: itens.map((i: { produtoId: string; quantidade: number; preco: number; subtotal: number }) => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
          preco: i.preco,
          subtotal: i.subtotal,
        })),
      },
      pagamentos: {
        create: [{ forma: formaPagamento, valor: total }],
      },
    },
    include: {
      tutor: { select: { nome: true } },
      itens: { include: { produto: { select: { nome: true } } } },
    },
  });

  // Decrementar estoque dos produtos
  for (const item of itens) {
    await prisma.produto.update({
      where: { id: item.produtoId },
      data: { estoque: { decrement: item.quantidade } },
    });
  }

  return NextResponse.json(venda, { status: 201 });
}
