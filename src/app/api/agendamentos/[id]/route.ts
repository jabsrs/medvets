import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.inicio) data.inicio = new Date(data.inicio);
  if (data.fim) data.fim = new Date(data.fim);

  const agendamento = await prisma.agendamento.update({
    where: { id: params.id },
    data,
    include: {
      animal: { include: { tutor: true } },
      medico: { select: { id: true, name: true } },
      tipo: true,
    },
  });

  return NextResponse.json(agendamento);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.agendamento.update({
    where: { id: params.id },
    data: { status: "CANCELADO" },
  });
  return NextResponse.json({ ok: true });
}
