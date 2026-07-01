import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const d365 = new Date(now.getTime() - 365 * 86400000);
  const d90  = new Date(now.getTime() - 90  * 86400000);
  const d30  = new Date(now.getTime() - 30  * 86400000);

  type RankRow = {
    id: string;
    nome: string;
    total365: number;
    total90:  number;
    total30:  number;
    animais:  string | null;
  };

  const rows = await prisma.$queryRaw<RankRow[]>`
    SELECT
      t.id,
      t.nome,
      COALESCE(SUM(CASE WHEN v."createdAt" >= ${d365} AND v.status = 'FECHADA' THEN v.total ELSE 0 END), 0)::float AS total365,
      COALESCE(SUM(CASE WHEN v."createdAt" >= ${d90}  AND v.status = 'FECHADA' THEN v.total ELSE 0 END), 0)::float AS total90,
      COALESCE(SUM(CASE WHEN v."createdAt" >= ${d30}  AND v.status = 'FECHADA' THEN v.total ELSE 0 END), 0)::float AS total30,
      STRING_AGG(DISTINCT a.nome, ' - ' ORDER BY a.nome) AS animais
    FROM tutores t
    JOIN vendas v ON v."tutorId" = t.id AND v.status = 'FECHADA' AND v."createdAt" >= ${d365}
    LEFT JOIN animais a ON a."tutorId" = t.id AND a.ativo = true
    WHERE t.ativo = true
    GROUP BY t.id, t.nome
    HAVING SUM(CASE WHEN v."createdAt" >= ${d365} AND v.status = 'FECHADA' THEN v.total ELSE 0 END) > 0
    ORDER BY total365 DESC
  `;

  // Classificação ABC por receita acumulada (365 dias)
  const totalReceita = rows.reduce((s, r) => s + Number(r.total365), 0);
  let acumulado = 0;
  const ranked = rows.map((r, i) => {
    acumulado += Number(r.total365);
    const pct = totalReceita > 0 ? acumulado / totalReceita : 0;
    const classe = pct <= 0.65 ? "A" : pct <= 0.90 ? "B" : "C";
    return { ...r, posicao: i + 1, classe, total365: Number(r.total365), total90: Number(r.total90), total30: Number(r.total30) };
  });

  const countA = ranked.filter(r => r.classe === "A").length;
  const countB = ranked.filter(r => r.classe === "B").length;
  const countC = ranked.filter(r => r.classe === "C").length;
  const total  = ranked.length;
  const recA   = ranked.filter(r => r.classe === "A").reduce((s, r) => s + r.total365, 0);
  const recB   = ranked.filter(r => r.classe === "B").reduce((s, r) => s + r.total365, 0);
  const recC   = ranked.filter(r => r.classe === "C").reduce((s, r) => s + r.total365, 0);

  return NextResponse.json({
    rows: ranked,
    kpis: {
      A: { count: countA, pctClientes: total ? countA / total : 0, pctReceita: totalReceita ? recA / totalReceita : 0 },
      B: { count: countB, pctClientes: total ? countB / total : 0, pctReceita: totalReceita ? recB / totalReceita : 0 },
      C: { count: countC, pctClientes: total ? countC / total : 0, pctReceita: totalReceita ? recC / totalReceita : 0 },
      totalReceita,
    },
  });
}
