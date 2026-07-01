"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type RankRow = {
  id: string;
  nome: string;
  posicao: number;
  classe: "A" | "B" | "C";
  animais: string | null;
  total365: number;
  total90:  number;
  total30:  number;
};

type Kpis = {
  A: { count: number; pctClientes: number; pctReceita: number };
  B: { count: number; pctClientes: number; pctReceita: number };
  C: { count: number; pctClientes: number; pctReceita: number };
  totalReceita: number;
};

const classeStyle: Record<string, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-amber-500 text-white",
};

const kpiStyle: Record<string, string> = {
  A: "bg-emerald-500",
  B: "bg-blue-500",
  C: "bg-amber-500",
};

function pct(n: number) { return (n * 100).toFixed(1) + "%"; }

export default function RankingClientesPage() {
  const [rows, setRows]   = useState<RankRow[]>([]);
  const [kpis, setKpis]   = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro]   = useState<"" | "A" | "B" | "C">("");

  useEffect(() => {
    fetch("/api/vendas/ranking-clientes")
      .then(r => r.json())
      .then(d => { setRows(d.rows); setKpis(d.kpis); })
      .finally(() => setLoading(false));
  }, []);

  const exibidos = filtro ? rows.filter(r => r.classe === filtro) : rows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ranking de clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Classificação ABC por receita dos últimos 365 dias
        </p>
      </div>

      {/* KPI cards ABC */}
      {kpis && (
        <div className="grid grid-cols-3 gap-4">
          {(["A", "B", "C"] as const).map(c => (
            <button key={c} onClick={() => setFiltro(filtro === c ? "" : c)}
              className={`${kpiStyle[c]} text-white rounded-xl p-5 text-left transition hover:opacity-90 ${filtro === c ? "ring-2 ring-offset-2 ring-gray-900" : ""}`}>
              <p className="text-2xl font-bold">{kpis[c].count} clientes "{c}"</p>
              <p className="text-sm opacity-90 mt-1">
                {pct(kpis[c].pctClientes)} dos clientes representam {pct(kpis[c].pctReceita)} das vendas do último ano
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : exibidos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Trophy size={32} className="mx-auto mb-2 opacity-40" />
            <p>Nenhuma venda no período</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pos.</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Class.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Animais</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">365 dias</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">90 dias</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">30 dias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exibidos.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5">
                    <Link href={`/tutores/${r.id}`}
                      className="font-medium text-gray-900 hover:text-teal-600 transition">
                      {r.nome}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-center text-gray-500 font-medium">
                    {r.posicao}º
                  </td>
                  <td className="px-3 py-3.5 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${classeStyle[r.classe]}`}>
                      {r.classe}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell max-w-xs truncate">
                    {r.animais ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                    {r.total365 > 0 ? formatCurrency(r.total365) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-600 hidden md:table-cell">
                    {r.total90 > 0 ? formatCurrency(r.total90) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right text-gray-600 hidden md:table-cell">
                    {r.total30 > 0 ? formatCurrency(r.total30) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
