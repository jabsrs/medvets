import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { descricao, temperatura, peso } = await req.json();
  const evolucao = await prisma.evolucaoInternacao.create({
    data: {
      internacaoId: params.id,
      descricao,
      temperatura: temperatura ? Number(temperatura) : null,
      peso: peso ? Number(peso) : null,
    },
  });

  return NextResponse.json(evolucao, { status: 201 });
}
