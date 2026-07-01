import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = [
  { nome: "Dinheiro",          tipo: "DINHEIRO",        ordem: 1 },
  { nome: "Pix",               tipo: "PIX",             ordem: 2 },
  { nome: "Cartão de Crédito", tipo: "CARTAO_CREDITO",  ordem: 3 },
  { nome: "Cartão de Débito",  tipo: "CARTAO_DEBITO",   ordem: 4 },
  { nome: "Boleto",            tipo: "BOLETO",          ordem: 5 },
  { nome: "Cheque",            tipo: "CHEQUE",          ordem: 6 },
  { nome: "Convênio",          tipo: "CONVENIO",        ordem: 7 },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = req.nextUrl.searchParams.get("all") === "1";

  let metodos = await prisma.metodoPagamento.findMany({
    where: all ? {} : { ativo: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  // Seed defaults on first access
  if (metodos.length === 0) {
    await prisma.metodoPagamento.createMany({ data: DEFAULTS });
    metodos = await prisma.metodoPagamento.findMany({
      where: all ? {} : { ativo: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    });
  }

  return NextResponse.json(metodos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nome, tipo } = await req.json();
  if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const count = await prisma.metodoPagamento.count();
  const metodo = await prisma.metodoPagamento.create({
    data: { nome, tipo: tipo ?? "OUTRO", ordem: count + 1 },
  });

  return NextResponse.json(metodo, { status: 201 });
}
