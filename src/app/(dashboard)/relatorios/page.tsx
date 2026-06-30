"use client";
import { useEffect, useState } from "react";
import { BarChart2, Activity, Syringe, ShoppingCart, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const STATUS_LABEL: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Faltou",
};

const STATUS_COLOR: Record<string, string> = {
  CONCLUIDO: "bg-emerald-500",
  CONFIRMADO: "bg-blue-500",
  AGENDADO: "bg-indigo-400",
  EM_ATENDIMENTO: "bg-yellow-400",
  CANCELADO: "bg-red-400",
  FALTOU: "bg-gray-400",
};

type Relatorio = {
  periodo: { mes: number; ano: number };
  atendimentos: { total: number; porVet: { id: string; nome: string; count: number }[] };
  vacinas: { total: number };
  agendamentos: { total: number; porStatus: Record<string, number> };
  vendas: { total: number; count: number };
  financeiro: { receitas: number; despesas: number; saldo: number };
  topProdutos: { produtoId: string; nome: string; tipo: string; quantidade: number; subtotal: number }[];
};

function currentMesAno() {
  const d = new Date();
  return { mes: d.getMonth() + 1, ano: d.getFullYear() };
}

export default function RelatoriosPage() {
  const now = currentMesAno();
  const [mes, setMes] = useState(now.mes);
  const [ano, setAno] = useState(now.ano);
  const [data, setData] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/relatorios?mes=${mes}&ano=${ano}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [mes, ano]);

  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => now.ano - i);
  const maxVet = data ? Math.max(...data.atendimentos.porVet.map(v => v.count), 1) : 1;
  const maxStatus = data ? Math.max(...Object.values(data.agendamentos.porStatus), 1) : 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 size={24} className="text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={e => setAno(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {anosDisponiveis.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Carregando relatório...
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<Activity size={20} className="text-emerald-600" />}
              label="Atendimentos"
              value={String(data.atendimentos.total)}
              bg="bg-emerald-50"
            />
            <KpiCard
              icon={<Syringe size={20} className="text-blue-600" />}
              label="Vacinas aplicadas"
              value={String(data.vacinas.total)}
              bg="bg-blue-50"
            />
            <KpiCard
              icon={<ShoppingCart size={20} className="text-violet-600" />}
              label="Receita (vendas)"
              value={formatCurrency(data.vendas.total)}
              sub={`${data.vendas.count} venda(s)`}
              bg="bg-violet-50"
            />
            <KpiCard
              icon={<DollarSign size={20} className={data.financeiro.saldo >= 0 ? "text-emerald-600" : "text-red-500"} />}
              label="Saldo financeiro"
              value={formatCurrency(data.financeiro.saldo)}
              sub={`R: ${formatCurrency(data.financeiro.receitas)} / D: ${formatCurrency(data.financeiro.despesas)}`}
              bg={data.financeiro.saldo >= 0 ? "bg-emerald-50" : "bg-red-50"}
            />
          </div>

          {/* Gráficos lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Atendimentos por Veterinária */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Activity size={15} className="text-gray-400" /> Atendimentos por veterinária
              </h2>
              {data.atendimentos.porVet.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum atendimento no período</p>
              ) : (
                <div className="space-y-3">
                  {data.atendimentos.porVet.map(v => (
                    <div key={v.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium truncate max-w-[70%]">{v.nome}</span>
                        <span className="text-gray-500 tabular-nums">{v.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${(v.count / maxVet) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agendamentos por Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart2 size={15} className="text-gray-400" /> Agendamentos por status
              </h2>
              {data.agendamentos.total === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento no período</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.agendamentos.porStatus)
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium">{STATUS_LABEL[status] ?? status}</span>
                          <span className="text-gray-500 tabular-nums">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${STATUS_COLOR[status] ?? "bg-gray-400"}`}
                            style={{ width: `${(count / maxStatus) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Financeiro */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <DollarSign size={15} className="text-gray-400" /> Resumo financeiro (lançamentos pagos)
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <TrendingUp size={20} className="text-emerald-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500 mb-1">Receitas</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(data.financeiro.receitas)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <TrendingDown size={20} className="text-red-500 mx-auto mb-1" />
                <p className="text-xs text-gray-500 mb-1">Despesas</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(data.financeiro.despesas)}</p>
              </div>
              <div className={`p-4 rounded-lg ${data.financeiro.saldo >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                <DollarSign size={20} className={`mx-auto mb-1 ${data.financeiro.saldo >= 0 ? "text-emerald-700" : "text-red-600"}`} />
                <p className="text-xs text-gray-500 mb-1">Saldo</p>
                <p className={`text-lg font-bold ${data.financeiro.saldo >= 0 ? "text-emerald-800" : "text-red-700"}`}>
                  {formatCurrency(data.financeiro.saldo)}
                </p>
              </div>
            </div>
          </div>

          {/* Top Produtos */}
          {data.topProdutos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <ShoppingCart size={15} className="text-gray-400" /> Top produtos e serviços vendidos
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">#</th>
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nome</th>
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">Tipo</th>
                      <th className="text-right py-2 pr-4 text-gray-500 font-medium">Qtd</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topProdutos.map((p, i) => (
                      <tr key={p.produtoId} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{p.nome}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {p.tipo === "SERVICO" ? "Serviço" : p.tipo === "MEDICAMENTO" ? "Medicamento" : "Produto"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700">{p.quantidade}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(p.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-white`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500 font-medium">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}
