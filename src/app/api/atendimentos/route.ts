import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const animalId = searchParams.get("animalId");

  const atendimentos = await prisma.atendimento.findMany({
    where: animalId ? { animalId } : {},
    include: {
      animal: { include: { tutor: true } },
      medico: { select: { id: true, name: true } },
      exameClinico: true,
      receitas: true,
      exames: true,
      documentos: true,
    },
    orderBy: { data: "desc" },
    take: 50,
  });

  return NextResponse.json(atendimentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exameClinico, receitas, peso, ...atendData } = await req.json();
  if (atendData.data) atendData.data = new Date(atendData.data);
  if (atendData.retorno) atendData.retorno = new Date(atendData.retorno);

  const atendimento = await prisma.atendimento.create({
    data: {
      ...atendData,
      ...(exameClinico && { exameClinico: { create: exameClinico } }),
      ...(receitas?.length && { receitas: { create: receitas } }),
    },
    include: {
      animal: { include: { tutor: true } },
      medico: { select: { id: true, name: true } },
      exameClinico: true,
      receitas: true,
    },
  });

  if (peso) {
    await prisma.pesoRegistro.create({
      data: { animalId: atendData.animalId, atendimentoId: atendimento.id, peso },
    });
    await prisma.animal.update({ where: { id: atendData.animalId }, data: { peso } });
  }

  if (atendData.agendamentoId) {
    await prisma.agendamento.update({
      where: { id: atendData.agendamentoId },
      data: { status: "CONCLUIDO" },
    });
  }

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "CREATE", entidade: "Atendimento", entidadeId: atendimento.id,
    descricao: `Registrou atendimento de "${atendimento.animal?.nome ?? "—"}" (tutor: ${atendimento.animal?.tutor?.nome ?? "—"}) por ${atendimento.medico?.name ?? "—"}`,
    ip: getIp(req),
  });

  return NextResponse.json(atendimento, { status: 201 });
}
