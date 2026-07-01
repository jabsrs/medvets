import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const modelo = await prisma.modeloOrcamento.findUnique({
    where: { id: params.id },
    include: { itens: { include: { produto: { select: { id: true, nome: true, preco: true, tipo: true } } } }, user: { select: { name: true } } },
  });

  if (!modelo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(modelo);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { nome, validadeDias, compartilhado, ativo, obs, itens } = await req.json();

  // Substitui todos os itens (delete + recreate)
  await prisma.modeloOrcamentoItem.deleteMany({ where: { modeloId: params.id } });

  const modelo = await prisma.modeloOrcamento.update({
    where: { id: params.id },
    data: {
      nome, validadeDias, compartilhado, ativo, obs: obs || null,
      itens: {
        create: (itens ?? []).map((i: { produtoId: string; quantidade: number }) => ({
          produtoId: i.produtoId, quantidade: i.quantidade,
        })),
      },
    },
    include: { itens: { include: { produto: { select: { id: true, nome: true, preco: true, tipo: true } } } }, user: { select: { name: true } } },
  });

  return NextResponse.json(modelo);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.modeloOrcamento.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
