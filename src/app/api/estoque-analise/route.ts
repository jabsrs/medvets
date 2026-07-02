import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Status = "ZERADO" | "ABAIXO" | "EXCESSO" | "OK" | "SEM_MINIMO";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const grupoProdutoId = searchParams.get("grupo");

  // Só produtos físicos (serviços não têm estoque)
  const where: Record<string, unknown> = {
    ativo: true,
    tipo:  { in: ["PRODUTO", "MEDICAMENTO"] },
  };
  if (grupoProdutoId) where.grupoProdutoId = grupoProdutoId;

  const produtos = await prisma.produto.findMany({
    where,
    include: { grupoProduto: { select: { id: true, nome: true, cor: true } } },
    orderBy: { nome: "asc" },
  });

  function classificar(estoque: number, min: number, max: number | null): Status {
    if (estoque <= 0)                     return "ZERADO";
    if (min > 0 && estoque < min)         return "ABAIXO";
    if (max != null && estoque > max)     return "EXCESSO";
    if (min <= 0)                         return "SEM_MINIMO";
    return "OK";
  }

  const itens = produtos.map(p => {
    const status = classificar(p.estoque, p.estoqueMin, p.estoqueMax);
    // Sugestão de compra: repor até o máximo (se definido) ou até o mínimo
    const alvo = p.estoqueMax ?? p.estoqueMin;
    const sugestaoCompra = (status === "ZERADO" || status === "ABAIXO")
      ? Math.max(alvo - p.estoque, 0)
      : 0;
    const valorEstoque = p.estoque > 0 && p.custo ? p.estoque * p.custo : 0;
    const custoReposicao = sugestaoCompra > 0 && p.custo ? sugestaoCompra * p.custo : 0;
    return {
      id:            p.id,
      nome:          p.nome,
      codigo:        p.codigo,
      tipo:          p.tipo,
      unidade:       p.unidade,
      estoque:       p.estoque,
      estoqueMin:    p.estoqueMin,
      estoqueMax:    p.estoqueMax,
      custo:         p.custo,
      grupoProduto:  p.grupoProduto,
      status,
      sugestaoCompra,
      valorEstoque,
      custoReposicao,
    };
  });

  const resumo = {
    total:        itens.length,
    zerados:      itens.filter(i => i.status === "ZERADO").length,
    abaixo:       itens.filter(i => i.status === "ABAIXO").length,
    excesso:      itens.filter(i => i.status === "EXCESSO").length,
    semMinimo:    itens.filter(i => i.status === "SEM_MINIMO").length,
    ok:           itens.filter(i => i.status === "OK").length,
    valorTotal:      itens.reduce((s, i) => s + i.valorEstoque, 0),
    custoReposicao:  itens.reduce((s, i) => s + i.custoReposicao, 0),
  };

  return NextResponse.json({ itens, resumo });
}
