import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const animalId = req.nextUrl.searchParams.get("animalId");
  if (!animalId) return NextResponse.json({ error: "animalId required" }, { status: 400 });

  const propostas = await prisma.proposta.findMany({
    where: { animalId },
    include: {
      user: { select: { name: true } },
      itens: {
        include: { produto: { select: { id: true, nome: true, tipo: true, unidade: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(propostas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animalId, tutorId, validade, obs, itens } = await req.json();
  if (!animalId) return NextResponse.json({ error: "animalId obrigatório" }, { status: 400 });
  if (!itens || itens.length === 0) return NextResponse.json({ error: "Informe ao menos um item" }, { status: 400 });

  const total = (itens as { quantidade: number; preco: number; desconto: number }[]).reduce(
    (s, i) => s + (i.quantidade * i.preco * (1 - (i.desconto ?? 0) / 100)), 0
  );

  const proposta = await prisma.proposta.create({
    data: {
      animalId,
      tutorId: tutorId || null,
      userId: session.user.id,
      validade: validade ? new Date(validade) : new Date(Date.now() + 3 * 86400000),
      obs: obs || null,
      total,
      itens: {
        create: (itens as { produtoId: string; quantidade: number; preco: number; desconto: number }[]).map(i => ({
          produtoId: i.produtoId,
          quantidade: i.quantidade,
          preco: i.preco,
          desconto: i.desconto ?? 0,
          subtotal: i.quantidade * i.preco * (1 - (i.desconto ?? 0) / 100),
        })),
      },
    },
    include: {
      user: { select: { name: true } },
      itens: { include: { produto: { select: { id: true, nome: true, tipo: true, unidade: true } } } },
    },
  });

  return NextResponse.json(proposta, { status: 201 });
}
