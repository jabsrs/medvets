import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tutor = await prisma.tutor.findUnique({
    where: { id: params.id },
    include: {
      animais: {
        where: { ativo: true },
        include: {
          agendamentos: { orderBy: { inicio: "desc" }, take: 3 },
          vacinas: { include: { vacina: true }, orderBy: { dataAplicacao: "desc" }, take: 3 },
        },
      },
      vendas: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!tutor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tutor);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const tutor = await prisma.tutor.update({ where: { id: params.id }, data });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "UPDATE", entidade: "Tutor", entidadeId: params.id,
    descricao: `Editou tutor "${tutor.nome}"`,
    ip: getIp(req),
  });

  return NextResponse.json(tutor);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tutor = await prisma.tutor.findUnique({ where: { id: params.id }, select: { nome: true } });
  await prisma.tutor.update({ where: { id: params.id }, data: { ativo: false } });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "DESATIVAR", entidade: "Tutor", entidadeId: params.id,
    descricao: `Desativou tutor "${tutor?.nome ?? params.id}"`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
