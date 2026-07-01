import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";

  const fornecedores = await prisma.fornecedor.findMany({
    where: q ? { nome: { contains: q, mode: "insensitive" } } : {},
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(fornecedores);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (!data.nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  // Upsert by CNPJ if provided
  if (data.cnpj) {
    const existing = await prisma.fornecedor.findUnique({ where: { cnpj: data.cnpj } });
    if (existing) {
      const updated = await prisma.fornecedor.update({
        where: { cnpj: data.cnpj },
        data: { nome: data.nome, ie: data.ie, telefone: data.telefone, logradouro: data.logradouro, numero: data.numero, bairro: data.bairro, cidade: data.cidade, estado: data.estado },
      });
      return NextResponse.json(updated);
    }
  }

  const fornecedor = await prisma.fornecedor.create({ data });
  return NextResponse.json(fornecedor, { status: 201 });
}
