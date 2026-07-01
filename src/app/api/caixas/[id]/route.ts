import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const isAdmin = ["ADMIN", "FINANCEIRO"].includes(session.user?.role ?? "");

  const caixa = await prisma.caixa.findUnique({ where: { id: params.id } });
  if (!caixa) return NextResponse.json({ error: "Caixa não encontrado" }, { status: 404 });

  if (!isAdmin && caixa.userId !== session.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.status           !== undefined) data.status           = body.status;
  if (body.saldoFechamento  !== undefined) data.saldoFechamento  = Number(body.saldoFechamento);
  if (body.obs              !== undefined) data.obs              = body.obs;

  const updated = await prisma.caixa.update({
    where: { id: params.id },
    data,
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}
