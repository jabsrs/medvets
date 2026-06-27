import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

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

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "UPDATE", entidade: "Animal", entidadeId: params.id,
    descricao: `Editou animal "${animal.nome}"`,
    ip: getIp(req),
  });

  return NextResponse.json(animal);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const animal = await prisma.animal.findUnique({ where: { id: params.id }, select: { nome: true } });
  await prisma.animal.update({ where: { id: params.id }, data: { ativo: false } });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "DESATIVAR", entidade: "Animal", entidadeId: params.id,
    descricao: `Desativou animal "${animal?.nome ?? params.id}"`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
