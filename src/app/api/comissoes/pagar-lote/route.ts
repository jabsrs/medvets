import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, userId } = await req.json();

  const where = ids?.length
    ? { id: { in: ids as string[] } }
    : userId
    ? { userId, pago: false }
    : null;

  if (!where) return NextResponse.json({ error: "Informe ids ou userId" }, { status: 400 });

  const result = await prisma.comissao.updateMany({ where, data: { pago: true } });
  return NextResponse.json({ atualizadas: result.count });
}
