import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const de  = searchParams.get("de");
  const ate = searchParams.get("ate");

  const where: Record<string, unknown> = { ativo: true };
  if (de || ate) {
    where.createdAt = {
      ...(de  ? { gte: new Date(de  + "T00:00:00") } : {}),
      ...(ate ? { lte: new Date(ate + "T23:59:59") } : {}),
    };
  }

  const grupos = await prisma.tutor.groupBy({
    by: ["origem"],
    where,
    _count: { _all: true },
  });

  const total       = grupos.reduce((s, g) => s + g._count._all, 0);
  const semOrigem   = grupos.find(g => g.origem === null)?._count._all ?? 0;

  const origens = grupos
    .filter(g => g.origem !== null)
    .map(g => ({ origem: g.origem as string, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    origens,
    total,
    semOrigem,
    comOrigem: total - semOrigem,
  });
}
