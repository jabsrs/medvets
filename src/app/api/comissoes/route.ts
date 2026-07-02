import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const pago   = searchParams.get("pago");
  const de     = searchParams.get("de");
  const ate    = searchParams.get("ate");

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (pago !== null && pago !== "") where.pago = pago === "true";
  if (de || ate) {
    where.data = {
      ...(de  ? { gte: new Date(de  + "T00:00:00") } : {}),
      ...(ate ? { lte: new Date(ate + "T23:59:59") } : {}),
    };
  }

  const comissoes = await prisma.comissao.findMany({
    where,
    include: {
      user:    { select: { id: true, name: true, role: true } },
      produto: { select: { id: true, nome: true, tipo: true } },
    },
    orderBy: { data: "desc" },
    take: 500,
  });

  // Agrupamento por veterinário
  const porVet: Record<string, {
    user: { id: string; name: string; role: string };
    pendente: number;
    pago: number;
    qtdPendente: number;
    qtdPago: number;
  }> = {};

  for (const c of comissoes) {
    if (!porVet[c.userId]) {
      porVet[c.userId] = { user: c.user, pendente: 0, pago: 0, qtdPendente: 0, qtdPago: 0 };
    }
    if (c.pago) {
      porVet[c.userId].pago        += c.valor;
      porVet[c.userId].qtdPago     += 1;
    } else {
      porVet[c.userId].pendente    += c.valor;
      porVet[c.userId].qtdPendente += 1;
    }
  }

  return NextResponse.json({
    comissoes,
    porVet: Object.values(porVet).sort((a, b) => b.pendente - a.pendente),
    resumo: {
      totalPendente: comissoes.filter(c => !c.pago).reduce((s, c) => s + c.valor, 0),
      totalPago:     comissoes.filter(c =>  c.pago).reduce((s, c) => s + c.valor, 0),
      qtdVets:       Object.keys(porVet).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.userId || !body.valor) {
    return NextResponse.json({ error: "Veterinário e valor são obrigatórios" }, { status: 400 });
  }

  const comissao = await prisma.comissao.create({
    data: {
      userId:     body.userId,
      produtoId:  body.produtoId   || null,
      vendaId:    body.vendaId     || null,
      valor:      Number(body.valor),
      percentual: body.percentual ? Number(body.percentual) : null,
      data:       body.data ? new Date(body.data) : new Date(),
      pago:       false,
    },
    include: {
      user:    { select: { id: true, name: true, role: true } },
      produto: { select: { id: true, nome: true, tipo: true } },
    },
  });

  return NextResponse.json(comissao, { status: 201 });
}
