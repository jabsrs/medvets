import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.pago      !== undefined) data.pago      = body.pago;
  if (body.valor     !== undefined) data.valor     = Number(body.valor);
  if (body.percentual !== undefined) data.percentual = body.percentual ? Number(body.percentual) : null;

  const comissao = await prisma.comissao.update({
    where: { id: params.id },
    data,
    include: {
      user:    { select: { id: true, name: true } },
      produto: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json(comissao);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.comissao.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
