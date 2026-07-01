import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipo      = searchParams.get("tipo");       // ENTRADA | SAIDA | AJUSTE
  const produtoId = searchParams.get("produtoId");
  const de        = searchParams.get("de");
  const ate       = searchParams.get("ate");
  const motivo    = searchParams.get("motivo");
  const q         = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (tipo)      where.tipo      = tipo;
  if (produtoId) where.produtoId = produtoId;
  if (motivo)    where.motivo    = { contains: motivo, mode: "insensitive" };
  if (de || ate) {
    where.data = {
      ...(de  ? { gte: new Date(de  + "T00:00:00") } : {}),
      ...(ate ? { lte: new Date(ate + "T23:59:59") } : {}),
    };
  }
  if (q) {
    where.produto = { nome: { contains: q, mode: "insensitive" } };
  }

  const movimentos = await prisma.movEstoque.findMany({
    where,
    include: {
      produto: {
        select: {
          id: true, nome: true, unidade: true, estoque: true,
          grupoProduto: { select: { id: true, nome: true, cor: true } },
        },
      },
    },
    orderBy: { data: "desc" },
    take: 300,
  });

  return NextResponse.json(movimentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { produtoId, quantidade, motivo, obs, data, tipo = "SAIDA" } = body;

  if (!produtoId || !quantidade || quantidade <= 0) {
    return NextResponse.json({ error: "Produto e quantidade são obrigatórios" }, { status: 400 });
  }

  const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
  if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

  // Para SAIDA, decrementa estoque; para ENTRADA/AJUSTE, incrementa
  const delta = tipo === "SAIDA" ? -Number(quantidade) : Number(quantidade);
  const novoEstoque = produto.estoque + delta;

  const [movimento] = await prisma.$transaction([
    prisma.movEstoque.create({
      data: {
        produtoId,
        tipo,
        quantidade: Number(quantidade),
        custo: produto.custo ?? null,
        motivo: motivo ? String(motivo) + (obs ? ` — ${obs}` : "") : obs ?? null,
        data: data ? new Date(data) : new Date(),
      },
      include: {
        produto: {
          select: {
            id: true, nome: true, unidade: true, estoque: true,
            grupoProduto: { select: { id: true, nome: true, cor: true } },
          },
        },
      },
    }),
    prisma.produto.update({
      where: { id: produtoId },
      data: { estoque: Math.max(novoEstoque, 0) },
    }),
  ]);

  return NextResponse.json(movimento, { status: 201 });
}
