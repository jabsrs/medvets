import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const tipo = searchParams.get("tipo");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 100);

  const where: Record<string, unknown> = { ativo: true };
  if (tipo) where.tipo = tipo;
  if (q) where.nome = { contains: q, mode: "insensitive" };

  const produtos = await prisma.produto.findMany({
    where,
    include: { categoria: true },
    orderBy: { nome: "asc" },
    take: limit,
  });

  return NextResponse.json(produtos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const produto = await prisma.produto.create({ data, include: { categoria: true } });
  return NextResponse.json(produto, { status: 201 });
}
