import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const animalId  = searchParams.get("animalId");
  const medicoId  = searchParams.get("medicoId");
  const especie   = searchParams.get("especie");
  const de        = searchParams.get("de");
  const ate       = searchParams.get("ate");
  const q         = searchParams.get("q");
  const page      = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit     = Math.min(100, Number(searchParams.get("limit") ?? "50"));

  // Modo legado: só animalId → retorna tudo sem paginação (prontuário do animal)
  const legado = animalId && !de && !ate && !q && !medicoId && !especie;

  const where: Record<string, unknown> = {};
  if (animalId)  where.animalId  = animalId;
  if (medicoId)  where.medicoId  = medicoId;
  if (de || ate) {
    where.data = {
      ...(de  ? { gte: new Date(de  + "T00:00:00") } : {}),
      ...(ate ? { lte: new Date(ate + "T23:59:59") } : {}),
    };
  }
  if (especie) {
    where.animal = { especie };
  }
  if (q) {
    const s = q.trim();
    where.OR = [
      { animal:      { nome:  { contains: s, mode: "insensitive" } } },
      { animal:      { tutor: { nome: { contains: s, mode: "insensitive" } } } },
      { queixa:      { contains: s, mode: "insensitive" } },
      { diagnostico: { contains: s, mode: "insensitive" } },
    ];
  }

  const include = {
    animal:      { include: { tutor: { select: { id: true, nome: true, telefone: true } } } },
    medico:      { select: { id: true, name: true } },
    exameClinico: !legado ? false : true,
    receitas:     !legado ? false : true,
    exames:       !legado ? false : true,
    documentos:   !legado ? false : true,
  } as const;

  if (legado) {
    const atendimentos = await prisma.atendimento.findMany({
      where,
      include: {
        animal: { include: { tutor: true } },
        medico: { select: { id: true, name: true } },
        exameClinico: true,
        receitas: true,
        exames: true,
        documentos: true,
      },
      orderBy: { data: "desc" },
      take: 200,
    });
    return NextResponse.json(atendimentos);
  }

  const [total, atendimentos] = await Promise.all([
    prisma.atendimento.count({ where }),
    prisma.atendimento.findMany({
      where,
      include: {
        animal: { include: { tutor: { select: { id: true, nome: true, telefone: true } } } },
        medico: { select: { id: true, name: true } },
      },
      orderBy: { data: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  return NextResponse.json({ atendimentos, total, page, limit, pages: Math.ceil(total / limit) });
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
