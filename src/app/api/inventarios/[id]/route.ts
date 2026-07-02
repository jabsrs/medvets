import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inventario = await prisma.inventario.findUnique({
    where: { id: params.id },
    include: {
      itens: {
        include: {
          produto: {
            select: {
              id: true, nome: true, codigo: true, unidade: true, custo: true,
              grupoProduto: { select: { id: true, nome: true, cor: true } },
            },
          },
        },
        orderBy: { produto: { nome: "asc" } },
      },
    },
  });

  if (!inventario) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inventario);
}

// PATCH: salva contagens parciais. Body: { itens: [{ id, estoqueContado }] }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inv = await prisma.inventario.findUnique({ where: { id: params.id }, select: { status: true } });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inv.status !== "ABERTO") {
    return NextResponse.json({ error: "Inventário não está aberto" }, { status: 400 });
  }

  const body = await req.json();
  const itens: { id: string; estoqueContado: number | null }[] = body.itens ?? [];

  await prisma.$transaction(
    itens.map(it =>
      prisma.inventarioItem.update({
        where: { id: it.id },
        data: {
          estoqueContado: it.estoqueContado,
          contado:        it.estoqueContado !== null && it.estoqueContado !== undefined,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, atualizados: itens.length });
}

// DELETE: cancela/remove um inventário aberto
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.inventario.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
