import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [meus, compartilhados] = await Promise.all([
    prisma.modeloOrcamento.findMany({
      where: { userId: session.user.id },
      include: { itens: { include: { produto: { select: { nome: true, preco: true } } } }, user: { select: { name: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.modeloOrcamento.findMany({
      where: { compartilhado: true, ativo: true, userId: { not: session.user.id } },
      include: { itens: { include: { produto: { select: { nome: true, preco: true } } } }, user: { select: { name: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return NextResponse.json({ meus, compartilhados });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nome, validadeDias, compartilhado, obs, itens } = await req.json();
  if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const modelo = await prisma.modeloOrcamento.create({
    data: {
      nome, validadeDias: validadeDias ?? 3, compartilhado: compartilhado ?? true,
      obs: obs || null, userId: session.user.id,
      itens: {
        create: (itens ?? []).map((i: { produtoId: string; quantidade: number }) => ({
          produtoId: i.produtoId, quantidade: i.quantidade,
        })),
      },
    },
    include: { itens: { include: { produto: { select: { nome: true, preco: true } } } }, user: { select: { name: true } } },
  });

  return NextResponse.json(modelo, { status: 201 });
}
