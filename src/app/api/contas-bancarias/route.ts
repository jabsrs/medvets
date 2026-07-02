import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = req.nextUrl.searchParams.get("all") === "1";

  const contas = await prisma.contaBancaria.findMany({
    where: all ? {} : { ativo: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  // Calcula saldo atual de cada conta: saldoInicial + receitas pagas - despesas pagas
  const comSaldo = await Promise.all(
    contas.map(async (c) => {
      const [receitas, despesas, movimentos] = await Promise.all([
        prisma.lancamento.aggregate({
          where: { contaId: c.id, tipo: "RECEITA", status: "PAGO" },
          _sum: { valor: true },
        }),
        prisma.lancamento.aggregate({
          where: { contaId: c.id, tipo: "DESPESA", status: "PAGO" },
          _sum: { valor: true },
        }),
        prisma.lancamento.count({ where: { contaId: c.id } }),
      ]);
      const entrou = receitas._sum.valor ?? 0;
      const saiu   = despesas._sum.valor ?? 0;
      return {
        ...c,
        saldoAtual: c.saldoInicial + entrou - saiu,
        totalEntradas: entrou,
        totalSaidas:   saiu,
        qtdLancamentos: movimentos,
      };
    })
  );

  return NextResponse.json(comSaldo);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const count = await prisma.contaBancaria.count();
  const conta = await prisma.contaBancaria.create({
    data: {
      nome:         body.nome,
      banco:        body.banco || null,
      agencia:      body.agencia || null,
      numero:       body.numero || null,
      tipo:         body.tipo ?? "CORRENTE",
      saldoInicial: body.saldoInicial ? Number(body.saldoInicial) : 0,
      cor:          body.cor ?? "#0EA5E9",
      ordem:        count + 1,
    },
  });

  return NextResponse.json(conta, { status: 201 });
}
