import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const animal = await prisma.animal.findUnique({
    where: { id: params.id },
    include: {
      tutor: true,
      atendimentos: {
        include: { medico: true, exameClinico: true, receitas: true },
        orderBy: { data: "desc" },
      },
      vacinas: { include: { vacina: true }, orderBy: { dataAplicacao: "desc" } },
      agendamentos: { include: { tipo: true, medico: true }, orderBy: { inicio: "desc" }, take: 10 },
      pesos: { orderBy: { data: "desc" }, take: 10 },
    },
  });

  if (!animal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(animal);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.dataNasc) data.dataNasc = new Date(data.dataNasc);
  const animal = await prisma.animal.update({ where: { id: params.id }, data });
  return NextResponse.json(animal);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.animal.update({ where: { id: params.id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
