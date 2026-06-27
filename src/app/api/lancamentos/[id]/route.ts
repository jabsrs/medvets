import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  if (data.pagamento) data.pagamento = new Date(data.pagamento);
  const lancamento = await prisma.lancamento.update({ where: { id: params.id }, data });

  const acao = data.status === "PAGO" ? "PAGAR" : data.status === "CANCELADO" ? "CANCELAR" : "UPDATE";
  const descricao =
    acao === "PAGAR"
      ? `Marcou como pago: "${lancamento.descricao}" — R$ ${lancamento.valor.toFixed(2)}`
      : acao === "CANCELAR"
      ? `Cancelou lançamento: "${lancamento.descricao}"`
      : `Editou lançamento "${lancamento.descricao}"`;

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao, entidade: "Lancamento", entidadeId: params.id,
    descricao, ip: getIp(req),
  });

  return NextResponse.json(lancamento);
}
