import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const tutorId = searchParams.get("tutorId");
  const especie = searchParams.get("especie");

  const where: Record<string, unknown> = { ativo: true };
  if (tutorId) where.tutorId = tutorId;
  if (especie) where.especie = especie;
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { raca: { contains: q, mode: "insensitive" } },
      { microchip: { contains: q } },
      { tutor: { nome: { contains: q, mode: "insensitive" } } },
    ];
  }

  const animais = await prisma.animal.findMany({
    where,
    include: { tutor: { select: { id: true, nome: true, telefone: true } } },
    orderBy: { nome: "asc" },
    take: 50,
  });

  return NextResponse.json(animais);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.dataNasc) data.dataNasc = new Date(data.dataNasc);
  const animal = await prisma.animal.create({ data, include: { tutor: true } });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "CREATE", entidade: "Animal", entidadeId: animal.id,
    descricao: `Cadastrou animal "${animal.nome}" (tutor: ${animal.tutor?.nome ?? "—"})`,
    ip: getIp(req),
  });

  return NextResponse.json(animal, { status: 201 });
}
