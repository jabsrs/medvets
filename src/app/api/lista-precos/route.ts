import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH body: { percentual: number, tipo?: string, grupoProdutoId?: string }
// Aplica reajuste em lote via SQL (preco = preco * fator)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { percentual, tipo, grupoProdutoId } = body;

  if (typeof percentual !== "number" || percentual === 0) {
    return NextResponse.json({ error: "Percentual inválido" }, { status: 400 });
  }

  const fator = 1 + percentual / 100;

  const conditions: string[] = [`ativo = true`];
  if (tipo) conditions.push(`tipo = '${tipo}'`);
  if (grupoProdutoId) conditions.push(`"grupoProdutoId" = '${grupoProdutoId}'`);

  const where = conditions.join(" AND ");

  // $executeRaw para update com expressão aritmética
  const result = await prisma.$executeRawUnsafe(
    `UPDATE produtos SET preco = ROUND(CAST(preco * ${fator} AS numeric), 2), "updatedAt" = NOW() WHERE ${where}`
  );

  return NextResponse.json({ atualizados: result });
}
