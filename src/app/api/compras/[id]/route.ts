import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const compra = await prisma.compra.findUnique({
    where: { id: params.id },
    include: {
      fornecedor: true,
      user: { select: { name: true } },
      itens: { include: { produto: { select: { id: true, nome: true, codigo: true, preco: true, usoInterno: true } } } },
    },
  });

  if (!compra) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(compra);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.compra.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
