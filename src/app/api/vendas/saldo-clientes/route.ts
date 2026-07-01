import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const busca = searchParams.get("q") ?? "";

  type SaldoRow = {
    id: string;
    nome: string;
    saldo_aberto: number;
    ultima_compra: Date | null;
  };

  const rows = await prisma.$queryRaw<SaldoRow[]>`
    SELECT
      t.id,
      t.nome,
      COALESCE(SUM(CASE WHEN v.status = 'ABERTA' THEN v.total ELSE 0 END), 0)::float AS saldo_aberto,
      MAX(CASE WHEN v.status = 'FECHADA' THEN v."createdAt" ELSE NULL END) AS ultima_compra
    FROM tutores t
    JOIN vendas v ON v."tutorId" = t.id
    WHERE t.ativo = true
      AND (${busca} = '' OR t.nome ILIKE ${"%" + busca + "%"})
    GROUP BY t.id, t.nome
    HAVING SUM(CASE WHEN v.status = 'ABERTA' THEN v.total ELSE 0 END) > 0
    ORDER BY saldo_aberto DESC
  `;

  const total = rows.reduce((s, r) => s + Number(r.saldo_aberto), 0);

  return NextResponse.json({ rows, total });
}
