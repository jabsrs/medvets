import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animalId, nome, tipo, resultado, obs } = await req.json();
  if (!animalId || !nome) return NextResponse.json({ error: "animalId e nome são obrigatórios" }, { status: 400 });

  const exame = await prisma.exameSolicitado.create({
    data: { animalId, nome, tipo: tipo ?? "LABORATORIAL", resultado: resultado ?? null, arquivo: obs ?? null },
  });
  return NextResponse.json(exame, { status: 201 });
}
