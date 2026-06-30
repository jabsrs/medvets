import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ tutores: [], animais: [], produtos: [] });

  const [tutores, animais, produtos] = await Promise.all([
    prisma.tutor.findMany({
      where: {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { cpf: { contains: q } },
          { telefone: { contains: q } },
          { celular: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nome: true, telefone: true, celular: true, _count: { select: { animais: true } } },
      take: 8,
    }),
    prisma.animal.findMany({
      where: {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { raca: { contains: q, mode: "insensitive" } },
          { microchip: { contains: q } },
        ],
        ativo: true,
      },
      select: { id: true, nome: true, especie: true, raca: true, tutor: { select: { id: true, nome: true } } },
      take: 8,
    }),
    prisma.produto.findMany({
      where: {
        OR: [
          { nome: { contains: q, mode: "insensitive" } },
          { codigo: { contains: q, mode: "insensitive" } },
        ],
        ativo: true,
      },
      select: { id: true, nome: true, tipo: true, preco: true, codigo: true },
      take: 6,
    }),
  ]);

  return NextResponse.json({ tutores, animais, produtos });
}
