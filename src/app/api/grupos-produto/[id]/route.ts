import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nome     !== undefined) data.nome     = body.nome;
  if (body.cor      !== undefined) data.cor      = body.cor;
  if (body.ativo    !== undefined) data.ativo    = body.ativo;
  if (body.ordem    !== undefined) data.ordem    = Number(body.ordem);
  if (body.parentId !== undefined) data.parentId = body.parentId;

  const grupo = await prisma.grupoProduto.update({
    where: { id: params.id },
    data,
    include: { filhos: true, _count: { select: { produtos: true } } },
  });

  return NextResponse.json(grupo);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [qtdProdutos, qtdFilhos] = await Promise.all([
    prisma.produto.count({ where: { grupoProdutoId: params.id } }),
    prisma.grupoProduto.count({ where: { parentId: params.id } }),
  ]);

  if (qtdProdutos > 0)
    return NextResponse.json({ error: `Este grupo possui ${qtdProdutos} produto(s) vinculado(s)` }, { status: 400 });
  if (qtdFilhos > 0)
    return NextResponse.json({ error: `Este grupo possui ${qtdFilhos} subgrupo(s). Remova-os primeiro.` }, { status: 400 });

  await prisma.grupoProduto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
