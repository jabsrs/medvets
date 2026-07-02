"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PieChart, Users, HelpCircle, TrendingUp } from "lucide-react";

type OrigemRow = { origem: string; count: number };
type Dados = { origens: OrigemRow[]; total: number; semOrigem: number; comOrigem: number };

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

// Paleta de cores para as barras (ciclo)
const CORES = [
  "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#64748B",
];

export default function OrigemClientesPage() {
  const [dados, setDados]     = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [de,  setDe]  = useState("");
  const [ate, setAte] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (de)  params.set("de",  de);
    if (ate) params.set("ate", ate);
    const res = await fetch(`/api/origem-clientes?${params}`);
    setDados(await res.json());
    setLoading(false);
  }, [de, ate]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const origens   = dados?.origens ?? [];
  const total     = dados?.total ?? 0;
  const comOrigem = dados?.comOrigem ?? 0;
  const semOrigem = dados?.semOrigem ?? 0;
  const maxCount  = origens.length ? origens[0].count : 0;
  const pctPreenchido = total ? Math.round((comOrigem / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Origem dos clientes"
        description="Como os clientes conheceram a clínica"
      />

      {/* Filtro de período (por data de cadastro) */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-sm text-gray-500">Cadastrados entre:</span>
        <input type="date" value={de} onChange={e => setDe(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <span className="text-gray-400 text-sm">até</span>
        <input type="date" value={ate} onChange={e => setAte(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        {(de || ate) && (
          <button onClick={() => { setDe(""); setAte(""); }}
            className="text-sm text-gray-400 hover:text-gray-600">limpar</button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-teal-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Total de clientes</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString("pt-BR")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Com origem preenchida</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{comOrigem.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pctPreenchido}% do total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle size={16} className="text-amber-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Não informado</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{semOrigem.toLocaleString("pt-BR")}</p>
        </div>
      </div>

      {/* Ranking de origens */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-5">
          <PieChart size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">Distribuição por origem</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : origens.length === 0 ? (
          <div className="text-center py-12">
            <PieChart size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">Nenhum cliente com origem preenchida no período</p>
            <p className="text-xs text-gray-400 mt-1">
              Preencha o campo &quot;Como conheceu a clínica?&quot; no cadastro dos clientes
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {origens.map((o, i) => {
              const cor = CORES[i % CORES.length];
              const pctDoTotal    = comOrigem ? (o.count / comOrigem) * 100 : 0;
              const larguraBarra  = maxCount ? (o.count / maxCount) * 100 : 0;
              return (
                <div key={o.origem}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                      <span className="text-sm font-medium text-gray-700">{o.origem}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{o.count.toLocaleString("pt-BR")}</span>
                      <span className="text-xs text-gray-400 w-12 text-right">{pctDoTotal.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${larguraBarra}%`, backgroundColor: cor }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
