import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inventarios = await prisma.inventario.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { itens: true } } },
  });

  // Quantos já contados por inventário
  const comContagem = await Promise.all(
    inventarios.map(async inv => {
      const contados = await prisma.inventarioItem.count({
        where: { inventarioId: inv.id, contado: true },
      });
      return { ...inv, contados, totalItens: inv._count.itens };
    })
  );

  return NextResponse.json(comContagem);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { descricao, grupoProdutoId } = body;

  // Snapshot dos produtos físicos ativos (opcionalmente filtrados por grupo)
  const where: Record<string, unknown> = {
    ativo: true,
    tipo:  { in: ["PRODUTO", "MEDICAMENTO"] },
  };
  if (grupoProdutoId) where.grupoProdutoId = grupoProdutoId;

  const produtos = await prisma.produto.findMany({
    where,
    select: { id: true, estoque: true },
    orderBy: { nome: "asc" },
  });

  if (produtos.length === 0) {
    return NextResponse.json({ error: "Nenhum produto para inventariar" }, { status: 400 });
  }

  const inventario = await prisma.inventario.create({
    data: {
      descricao:      descricao || null,
      grupoProdutoId: grupoProdutoId || null,
      userId:         session.user?.id ?? null,
      itens: {
        create: produtos.map(p => ({
          produtoId:      p.id,
          estoqueSistema: p.estoque,
        })),
      },
    },
  });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "CREATE", entidade: "Inventario", entidadeId: inventario.id,
    descricao: `Abriu inventário com ${produtos.length} item(ns)`,
    ip: getIp(req),
  });

  return NextResponse.json(inventario, { status: 201 });
}
