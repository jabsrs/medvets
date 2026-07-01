"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DollarSign, Zap, CreditCard, FileText, Wallet,
  ChevronLeft, ChevronRight, LayoutList, BarChart3,
} from "lucide-react";

type TotalForma = { forma: string; total: number; qtd: number };

type ItemVendaSimples = { quantidade: number; produto: { nome: string } };

type Pagamento = {
  id: string;
  forma: string;
  valor: number;
  data: string;
  vendaId: string;
  venda: {
    id: string;
    total: number;
    desconto: number;
    createdAt: string;
    tutor: { id: string; nome: string } | null;
    itens: ItemVendaSimples[];
  };
};

type DadosRecebimentos = {
  pagamentos: Pagamento[];
  totais:     TotalForma[];
  resumo:     { totalGeral: number; qtdPagamentos: number; qtdVendas: number };
};

const FORMA_INFO: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; border: string }> = {
  DINHEIRO:       { label: "Dinheiro",          icon: DollarSign, bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
  PIX:            { label: "Pix",               icon: Zap,        bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CARTAO_CREDITO: { label: "Cartão de Crédito", icon: CreditCard, bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
  CARTAO_DEBITO:  { label: "Cartão de Débito",  icon: CreditCard, bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  BOLETO:         { label: "Boleto",            icon: FileText,   bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  CONVENIO:       { label: "Convênio",          icon: Wallet,     bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200"   },
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

export default function RecebimentosPage() {
  const [de,  setDe]  = useState(isoDate(new Date()));
  const [ate, setAte] = useState(isoDate(new Date()));
  const [filtroForma, setFiltroForma] = useState("");
  const [view, setView] = useState<"lista" | "resumo">("lista");
  const [dados, setDados]   = useState<DadosRecebimentos | null>(null);
  const [loading, setLoading] = useState(true);

  const isUmDia = de === ate;

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ de, ate });
    if (filtroForma) params.set("forma", filtroForma);
    const res = await fetch(`/api/recebimentos?${params}`);
    setDados(await res.json());
    setLoading(false);
  }, [de, ate, filtroForma]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function navDia(delta: number) {
    const d = new Date(de + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const iso = isoDate(d);
    setDe(iso); setAte(iso);
  }

  function setPeriodo(label: string) {
    const hoje = new Date();
    if (label === "hoje") {
      const iso = isoDate(hoje);
      setDe(iso); setAte(iso);
    } else if (label === "semana") {
      const seg = new Date(hoje);
      seg.setDate(hoje.getDate() - hoje.getDay() + 1);
      setDe(isoDate(seg)); setAte(isoDate(hoje));
    } else if (label === "mes") {
      setDe(isoDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
      setAte(isoDate(hoje));
    }
  }

  const totais   = dados?.totais   ?? [];
  const pagamentos = dados?.pagamentos ?? [];
  const resumo   = dados?.resumo   ?? { totalGeral: 0, qtdPagamentos: 0, qtdVendas: 0 };
  const totalExibido = filtroForma
    ? (totais.find(t => t.forma === filtroForma)?.total ?? 0)
    : resumo.totalGeral;

  return (
    <div>
      <PageHeader
        title="Recebimentos"
        description="Resumo de entradas por forma de pagamento"
      />

      {/* Controles de período */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {isUmDia && (
          <>
            <button onClick={() => navDia(-1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              <ChevronLeft size={16} />
            </button>
            <input type="date" value={de}
              onChange={e => { setDe(e.target.value); setAte(e.target.value); }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <button onClick={() => navDia(1)} disabled={de >= isoDate(new Date())}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Período personalizado */}
        {!isUmDia && (
          <div className="flex items-center gap-2">
            <input type="date" value={de} onChange={e => setDe(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <span className="text-gray-400 text-sm">até</span>
            <input type="date" value={ate} onChange={e => setAte(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        )}

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: "hoje",   label: "Hoje"      },
            { key: "semana", label: "Esta semana" },
            { key: "mes",    label: "Este mês"   },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className="px-3 py-1 text-xs font-medium rounded-md text-gray-600 hover:bg-white hover:shadow-sm transition">
              {p.label}
            </button>
          ))}
        </div>

        {/* Toggle vista */}
        <div className="ml-auto flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView("lista")}
            className={`p-1.5 rounded-md transition ${view === "lista" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
            title="Lista de pagamentos">
            <LayoutList size={16} />
          </button>
          <button onClick={() => setView("resumo")}
            className={`p-1.5 rounded-md transition ${view === "resumo" ? "bg-white shadow-sm text-teal-600" : "text-gray-400 hover:text-gray-600"}`}
            title="Resumo por forma">
            <BarChart3 size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {/* Cards de forma de pagamento */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {totais.sort((a, b) => b.total - a.total).map(t => {
              const info = FORMA_INFO[t.forma];
              const Icon = info?.icon ?? DollarSign;
              const ativo = filtroForma === t.forma;
              return (
                <button key={t.forma}
                  onClick={() => setFiltroForma(ativo ? "" : t.forma)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    ativo
                      ? `${info?.bg ?? "bg-gray-50"} ${info?.border ?? "border-gray-200"} ring-2 ring-offset-1 ${info?.text ?? "text-gray-700"}`
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className={`flex items-center gap-1.5 mb-2 ${info?.text ?? "text-gray-500"}`}>
                    <Icon size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {info?.label ?? t.forma}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{fmt(t.total)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.qtd} transação(ões)</p>
                </button>
              );
            })}

            {/* Card total */}
            <div className={`rounded-xl border p-4 col-span-2 lg:col-span-1 ${filtroForma ? "bg-gray-50 border-gray-200" : "bg-teal-600 border-teal-600 text-white"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${filtroForma ? "text-gray-400" : "text-teal-100"}`}>
                {filtroForma ? "Filtrado" : "Total geral"}
              </p>
              <p className={`text-2xl font-bold ${filtroForma ? "text-gray-900" : "text-white"}`}>
                {fmt(totalExibido)}
              </p>
              <p className={`text-xs mt-0.5 ${filtroForma ? "text-gray-400" : "text-teal-100"}`}>
                {resumo.qtdVendas} venda(s) · {resumo.qtdPagamentos} pagamento(s)
              </p>
            </div>
          </div>

          {/* Vista: Resumo por forma com barras */}
          {view === "resumo" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Participação por forma de pagamento</h2>
              </div>
              <div className="p-4 space-y-4">
                {totais.sort((a, b) => b.total - a.total).map(t => {
                  const info = FORMA_INFO[t.forma];
                  const Icon = info?.icon ?? DollarSign;
                  const pct  = resumo.totalGeral > 0 ? (t.total / resumo.totalGeral) * 100 : 0;
                  return (
                    <div key={t.forma}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`flex items-center gap-2 ${info?.text ?? "text-gray-600"}`}>
                          <Icon size={14} />
                          <span className="text-sm font-medium text-gray-800">{info?.label ?? t.forma}</span>
                          <span className="text-xs text-gray-400">({t.qtd} transações)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-bold text-gray-900 w-24 text-right">{fmt(t.total)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: info?.text.replace("text-", "").includes("green") ? "#16a34a"
                              : info?.text.includes("purple") ? "#9333ea"
                              : info?.text.includes("blue") ? "#2563eb"
                              : info?.text.includes("indigo") ? "#4f46e5"
                              : info?.text.includes("orange") ? "#ea580c"
                              : "#0d9488",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vista: Lista de pagamentos */}
          {view === "lista" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {isUmDia ? "Hora" : "Data/Hora"}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Itens</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Forma</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagamentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        <DollarSign size={32} className="mx-auto mb-2 opacity-20" />
                        <p>Nenhum recebimento no período</p>
                      </td>
                    </tr>
                  ) : pagamentos.map(p => {
                    const info = FORMA_INFO[p.forma];
                    const Icon = info?.icon ?? DollarSign;
                    const itensDesc = p.venda.itens
                      .map(i => `${i.quantidade}× ${i.produto.nome}`)
                      .join(", ");
                    const maisItens = p.venda.itens.length === 3 ? "..." : "";
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 tabular-nums whitespace-nowrap">
                          {!isUmDia && <span className="text-gray-400 mr-1">{fmtData(p.data)}</span>}
                          {fmtHora(p.data)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {p.venda.tutor?.nome ?? <span className="text-gray-400">Consumidor</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {itensDesc + maisItens || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${info?.bg ?? "bg-gray-100"} ${info?.text ?? "text-gray-600"}`}>
                            <Icon size={11} />
                            {info?.label ?? p.forma}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          {fmt(p.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {pagamentos.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">
                        Total ({pagamentos.length} pagamento(s))
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-teal-700">
                        {fmt(totalExibido)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
