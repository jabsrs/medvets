import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q              = searchParams.get("q") ?? "";
  const tipo           = searchParams.get("tipo");
  const grupoProdutoId = searchParams.get("grupo");
  const limit          = Math.min(Number(searchParams.get("limit") ?? "500"), 500);

  const where: Record<string, unknown> = { ativo: true };
  if (tipo)           where.tipo           = tipo;
  if (grupoProdutoId) where.grupoProdutoId = grupoProdutoId;
  if (q)              where.nome           = { contains: q, mode: "insensitive" };

  const produtos = await prisma.produto.findMany({
    where,
    include: {
      categoria:    true,
      grupoProduto: { select: { id: true, nome: true, cor: true, parentId: true } },
    },
    orderBy: { nome: "asc" },
    take: limit,
  });

  return NextResponse.json(produtos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.grupoProdutoId === "") data.grupoProdutoId = null;

  const produto = await prisma.produto.create({
    data,
    include: {
      categoria:    true,
      grupoProduto: { select: { id: true, nome: true, cor: true, parentId: true } },
    },
  });
  return NextResponse.json(produto, { status: 201 });
}
