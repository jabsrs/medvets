import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tutor, statsVendasFechadas, statsVendasAbertas, primeiraVenda] = await Promise.all([
    prisma.tutor.findUnique({
      where: { id: params.id },
      include: {
        animais: {
          include: {
            agendamentos: { orderBy: { inicio: "asc" }, where: { inicio: { gte: new Date() } }, take: 5 },
            vacinas: { include: { vacina: true }, orderBy: { dataAplicacao: "desc" }, take: 3 },
          },
          orderBy: { nome: "asc" },
        },
        vendas: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.venda.aggregate({
      where: { tutorId: params.id, status: "FECHADA" },
      _sum: { total: true },
      _avg: { total: true },
      _max: { total: true, createdAt: true },
      _count: true,
    }),
    prisma.venda.aggregate({
      where: { tutorId: params.id, status: "ABERTA" },
      _sum: { total: true },
      _count: true,
    }),
    prisma.venda.findFirst({
      where: { tutorId: params.id, status: "FECHADA" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  if (!tutor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...tutor,
    _stats: {
      totalVendido: statsVendasFechadas._sum.total ?? 0,
      ticketMedio: statsVendasFechadas._avg.total ?? 0,
      maiorVenda: statsVendasFechadas._max.total ?? 0,
      primeiraVenda: primeiraVenda?.createdAt ?? null,
      ultimaVenda: statsVendasFechadas._max.createdAt ?? null,
      qtdFechadas: statsVendasFechadas._count,
      saldoAberto: statsVendasAbertas._sum.total ?? 0,
      qtdAbertas: statsVendasAbertas._count,
    },
  });
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
