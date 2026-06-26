import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tipos = await prisma.tipoAtendimento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  return NextResponse.json(tipos);
}
