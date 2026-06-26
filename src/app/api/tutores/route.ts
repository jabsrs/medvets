import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/tutores — lista tutores com busca e paginação */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");

  const where = q
    ? {
        OR: [
          { nome: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { telefone: { contains: q } },
          { cpf: { contains: q } },
        ],
        ativo: true,
      }
    : { ativo: true };

  const [tutores, total] = await Promise.all([
    prisma.tutor.findMany({
      where,
      include: { animais: { where: { ativo: true }, select: { id: true, nome: true, especie: true } } },
      orderBy: { nome: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tutor.count({ where }),
  ]);

  return NextResponse.json({ tutores, total, page, limit });
}

/** POST /api/tutores — cria novo tutor */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const tutor = await prisma.tutor.create({ data });
  return NextResponse.json(tutor, { status: 201 });
}
