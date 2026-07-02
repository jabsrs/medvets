import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["nome", "banco", "agencia", "numero", "tipo", "cor", "ativo", "ordem"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.saldoInicial !== undefined) data.saldoInicial = Number(body.saldoInicial);

  const conta = await prisma.contaBancaria.update({ where: { id: params.id }, data });
  return NextResponse.json(conta);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Não permite excluir conta com lançamentos vinculados
  const count = await prisma.lancamento.count({ where: { contaId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Conta possui ${count} lançamento(s) vinculado(s). Desative-a em vez de excluir.` },
      { status: 400 }
    );
  }

  await prisma.contaBancaria.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
