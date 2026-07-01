import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Status-only update (approve/reject/expire)
  if (body.status && Object.keys(body).length === 1) {
    const updated = await prisma.proposta.update({
      where: { id: params.id },
      data: { status: body.status },
      include: {
        user: { select: { name: true } },
        itens: { include: { produto: { select: { id: true, nome: true, tipo: true, unidade: true } } } },
      },
    });
    return NextResponse.json(updated);
  }

  // Full edit: replace itens
  const { validade, obs, itens } = body;
  const total = ((itens ?? []) as { quantidade: number; preco: number; desconto: number }[]).reduce(
    (s, i) => s + (i.quantidade * i.preco * (1 - (i.desconto ?? 0) / 100)), 0
  );

  await prisma.propostaItem.deleteMany({ where: { propostaId: params.id } });

  const updated = await prisma.proposta.update({
    where: { id: params.id },
    data: {
      validade: validade ? new Date(validade) : undefined,
      obs: obs ?? null,
      total,
      itens: {
        create: ((itens ?? []) as { produtoId: string; quantidade: number; preco: number; desconto: number }[]).map(i => ({
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

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.proposta.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
