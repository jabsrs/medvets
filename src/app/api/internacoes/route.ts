import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const internacoes = await prisma.internacao.findMany({
    include: {
      animal: { include: { tutor: { select: { nome: true, telefone: true } } } },
      evolucoes: { orderBy: { data: "desc" }, take: 1 },
    },
    orderBy: { entrada: "desc" },
    take: 100,
  });

  return NextResponse.json(internacoes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animalId, motivo, baia } = await req.json();
  const internacao = await prisma.internacao.create({
    data: { animalId, motivo, baia },
    include: {
      animal: { include: { tutor: { select: { nome: true, telefone: true } } } },
      evolucoes: true,
    },
  });

  return NextResponse.json(internacao, { status: 201 });
}
