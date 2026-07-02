import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit, getIp } from "@/lib/audit";

// POST: finaliza o inventário aplicando os ajustes de estoque.
// Só itens contados geram ajuste; o estoque do produto passa a ser o valor contado.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inventario = await prisma.inventario.findUnique({
    where: { id: params.id },
    include: { itens: true },
  });
  if (!inventario) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inventario.status !== "ABERTO") {
    return NextResponse.json({ error: "Inventário já finalizado ou cancelado" }, { status: 400 });
  }

  const contados = inventario.itens.filter(i => i.contado && i.estoqueContado !== null);

  const ops = [];
  let ajustados = 0;

  for (const item of contados) {
    const contado = item.estoqueContado as number;
    // ajuste calculado sobre o snapshot (sistema no momento da abertura)
    const ajuste = contado - item.estoqueSistema;

    // registra o ajuste no item
    ops.push(
      prisma.inventarioItem.update({
        where: { id: item.id },
        data:  { ajuste },
      })
    );

    if (ajuste !== 0) {
      ajustados++;
      // define o estoque do produto para o valor contado
      ops.push(
        prisma.produto.update({
          where: { id: item.produtoId },
          data:  { estoque: contado },
        })
      );
      // registra o movimento de ajuste
      ops.push(
        prisma.movEstoque.create({
          data: {
            produtoId:  item.produtoId,
            tipo:       "AJUSTE",
            quantidade: ajuste, // positivo = sobra, negativo = falta
            motivo:     `Ajuste de inventário`,
          },
        })
      );
    }
  }

  // marca o inventário como finalizado
  ops.push(
    prisma.inventario.update({
      where: { id: params.id },
      data:  { status: "FINALIZADO", finalizadoEm: new Date() },
    })
  );

  await prisma.$transaction(ops);

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "UPDATE", entidade: "Inventario", entidadeId: params.id,
    descricao: `Finalizou inventário — ${contados.length} contados, ${ajustados} ajuste(s) de estoque aplicados`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true, contados: contados.length, ajustados });
}
