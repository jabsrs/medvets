import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const medicoId = searchParams.get("medicoId");

  const where: Record<string, unknown> = {};
  if (start && end) {
    where.inicio = { gte: new Date(start), lte: new Date(end) };
  }
  if (medicoId) where.medicoId = medicoId;

  const agendamentos = await prisma.agendamento.findMany({
    where,
    include: {
      animal: { include: { tutor: true } },
      medico: { select: { id: true, name: true } },
      tipo: true,
    },
    orderBy: { inicio: "asc" },
  });

  return NextResponse.json(agendamentos);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  data.inicio = new Date(data.inicio);
  data.fim = new Date(data.fim);

  const agendamento = await prisma.agendamento.create({
    data,
    include: {
      animal: { include: { tutor: true } },
      medico: { select: { id: true, name: true } },
      tipo: true,
    },
  });

  return NextResponse.json(agendamento, { status: 201 });
}
