import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/servicos — lista serviços com busca por nome e categoria */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const categoriaId = searchParams.get("categoriaId");

  const where: Record<string, unknown> = { tipo: "SERVICO" };
  if (categoriaId) where.categoriaId = categoriaId;
  if (q) where.nome = { contains: q, mode: "insensitive" };

  const servicos = await prisma.produto.findMany({
    where,
    include: { categoria: true },
    orderBy: [{ categoria: { nome: "asc" } }, { nome: "asc" }],
  });

  return NextResponse.json(servicos);
}

/** POST /api/servicos — cria novo serviço */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const servico = await prisma.produto.create({
    data,
    include: { categoria: true },
  });

  return NextResponse.json(servico, { status: 201 });
}
