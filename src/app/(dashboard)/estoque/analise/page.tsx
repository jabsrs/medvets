"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  AlertTriangle, XCircle, TrendingUp, PackageCheck, Package,
  HelpCircle, ShoppingCart, Printer, Filter,
} from "lucide-react";

type Grupo = { id: string; nome: string; cor: string };
type Status = "ZERADO" | "ABAIXO" | "EXCESSO" | "OK" | "SEM_MINIMO";
type Item = {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: string;
  unidade: string;
  estoque: number;
  estoqueMin: number;
  estoqueMax: number | null;
  custo: number | null;
  grupoProduto: Grupo | null;
  status: Status;
  sugestaoCompra: number;
  valorEstoque: number;
  custoReposicao: number;
};
type Resumo = {
  total: number; zerados: number; abaixo: number; excesso: number;
  semMinimo: number; ok: number; valorTotal: number; custoReposicao: number;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function num(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

const STATUS_INFO: Record<Status, { label: string; badge: string; ordem: number }> = {
  ZERADO:     { label: "Zerado",       badge: "bg-red-100 text-red-700",       ordem: 0 },
  ABAIXO:     { label: "Abaixo do mín", badge: "bg-amber-100 text-amber-700",  ordem: 1 },
  EXCESSO:    { label: "Excesso",      badge: "bg-purple-100 text-purple-700", ordem: 2 },
  SEM_MINIMO: { label: "Sem mínimo",   badge: "bg-gray-100 text-gray-500",     ordem: 3 },
  OK:         { label: "OK",           badge: "bg-green-100 text-green-700",   ordem: 4 },
};

export default function EstoqueAnalisePage() {
  const [itens, setItens]     = useState<Item[]>([]);
  const [resumo, setResumo]   = useState<Resumo | null>(null);
  const [grupos, setGrupos]   = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroStatus, setFiltroStatus] = useState<Status | "">("");
  const [filtroGrupo, setFiltroGrupo]   = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroGrupo) params.set("grupo", filtroGrupo);
    const res = await fetch(`/api/estoque-analise?${params}`);
    const data = await res.json();
    setItens(data.itens ?? []);
    setResumo(data.resumo ?? null);
    setLoading(false);
  }, [filtroGrupo]);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    fetch("/api/grupos-produto").then(r => r.json()).then((data: unknown[]) => {
      const flat: Grupo[] = [];
      for (const g of Array.isArray(data) ? data : []) {
        const grupo = g as Grupo & { filhos?: Grupo[] };
        flat.push({ id: grupo.id, nome: grupo.nome, cor: grupo.cor });
        for (const f of grupo.filhos ?? []) flat.push(f);
      }
      setGrupos(flat);
    });
  }, []);

  const filtrados = itens
    .filter(i => !filtroStatus || i.status === filtroStatus)
    .sort((a, b) => STATUS_INFO[a.status].ordem - STATUS_INFO[b.status].ordem
                 || b.sugestaoCompra - a.sugestaoCompra);

  const r = resumo;

  return (
    <div>
      <PageHeader
        title="Análise de estoque"
        description="Situação de mínimo/máximo e sugestão de reposição"
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={15} /> Imprimir
          </Button>
        }
      />

      {/* KPIs — clicáveis para filtrar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 print:hidden">
        {([
          { key: "ZERADO"  as const, label: "Zerados",        val: r?.zerados,   icon: XCircle,       cor: "text-red-500" },
          { key: "ABAIXO"  as const, label: "Abaixo do mín",  val: r?.abaixo,    icon: AlertTriangle, cor: "text-amber-500" },
          { key: "EXCESSO" as const, label: "Excesso",        val: r?.excesso,   icon: TrendingUp,    cor: "text-purple-500" },
          { key: "SEM_MINIMO" as const, label: "Sem mínimo",  val: r?.semMinimo, icon: HelpCircle,    cor: "text-gray-400" },
          { key: "OK"      as const, label: "Em dia",         val: r?.ok,        icon: PackageCheck,  cor: "text-green-500" },
        ]).map(kpi => {
          const Icon = kpi.icon;
          const ativo = filtroStatus === kpi.key;
          return (
            <button key={kpi.key}
              onClick={() => setFiltroStatus(ativo ? "" : kpi.key)}
              className={`bg-white rounded-xl border p-4 text-left transition ${
                ativo ? "border-teal-500 ring-2 ring-teal-100" : "border-gray-200 hover:border-gray-300"
              }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={15} className={kpi.cor} />
                <p className="text-xs font-semibold text-gray-400 uppercase truncate">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.val ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Valores */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Package size={16} className="text-teal-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Valor em estoque (custo)</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(r?.valorTotal ?? 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart size={16} className="text-amber-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Reposição sugerida (custo)</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmt(r?.custoReposicao ?? 0)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap print:hidden">
        <Filter size={14} className="text-gray-400" />
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">Todos os grupos</option>
          {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
        </select>
        {(filtroStatus || filtroGrupo) && (
          <button onClick={() => { setFiltroStatus(""); setFiltroGrupo(""); }}
            className="text-sm text-gray-400 hover:text-gray-600">limpar filtros</button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtrados.length} item(ns)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase print:hidden">Grupo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mín</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Máx</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Situação</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Comprar</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase print:hidden">Custo repos.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                <Package size={28} className="mx-auto mb-2 opacity-30" />
                Nenhum produto nesta situação
              </td></tr>
            ) : filtrados.map(i => {
              const info = STATUS_INFO[i.status];
              return (
                <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <Link href={`/estoque?q=${encodeURIComponent(i.nome)}`}
                      className="font-medium text-gray-900 hover:text-teal-700 transition">
                      {i.nome}
                    </Link>
                    {i.codigo && <p className="text-xs text-gray-400">Cód: {i.codigo}</p>}
                  </td>
                  <td className="px-4 py-2.5 print:hidden">
                    {i.grupoProduto ? (
                      <span className="inline-flex text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: i.grupoProduto.cor + "25", color: i.grupoProduto.cor }}>
                        {i.grupoProduto.nome}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${
                    i.estoque <= 0 ? "text-red-600" : "text-gray-900"
                  }`}>
                    {num(i.estoque)} <span className="text-xs font-normal text-gray-400">{i.unidade}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{num(i.estoqueMin)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {i.estoqueMax != null ? num(i.estoqueMax) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${info.badge}`}>
                      {info.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {i.sugestaoCompra > 0 ? (
                      <span className="font-semibold text-amber-600">
                        {num(i.sugestaoCompra)} <span className="text-xs font-normal text-gray-400">{i.unidade}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-500 print:hidden">
                    {i.custoReposicao > 0 ? fmt(i.custoReposicao) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 4px 8px; }
        }
      `}</style>
    </div>
  );
}
