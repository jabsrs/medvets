import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [vacinas, aplicacoes] = await Promise.all([
    prisma.vacina.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.vacinaAplicada.findMany({
      include: {
        animal: { include: { tutor: { select: { nome: true } } } },
        vacina: { select: { nome: true } },
      },
      orderBy: { dataAplicacao: "desc" },
      take: 200,
    }),
  ]);

  return NextResponse.json({ vacinas, aplicacoes });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.dataAplicacao) data.dataAplicacao = new Date(data.dataAplicacao);
  if (data.dataVencimento) data.dataVencimento = new Date(data.dataVencimento);
  else delete data.dataVencimento;

  const aplicacao = await prisma.vacinaAplicada.create({
    data,
    include: {
      animal: { include: { tutor: { select: { nome: true } } } },
      vacina: { select: { nome: true } },
    },
  });

  return NextResponse.json(aplicacao, { status: 201 });
}
