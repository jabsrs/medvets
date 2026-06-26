import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");

  const categorias = await prisma.categoria.findMany({
    where: tipo ? { tipo: tipo as "PRODUTO" | "SERVICO" } : {},
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(categorias);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const categoria = await prisma.categoria.create({ data });
  return NextResponse.json(categoria, { status: 201 });
}
