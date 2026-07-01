"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, AlertCircle, TrendingDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type SaldoRow = {
  id: string;
  nome: string;
  saldo_aberto: number;
  ultima_compra: string | null;
};

export default function SaldoClientesPage() {
  const [rows, setRows]   = useState<SaldoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async (q: string) => {
    setLoading(true);
    const res = await fetch(`/api/vendas/saldo-clientes?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(""); }, [fetch_]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetch_(busca);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saldo dos clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} cliente{rows.length !== 1 ? "s" : ""} com saldo devedor
            {total > 0 && <> · Total: <span className="font-semibold text-red-600">{formatCurrency(total)}</span></>}
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Nome do cliente..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>
          <button type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
            Buscar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <TrendingDown size={32} className="mx-auto mb-2 opacity-40" />
            <p>{busca ? "Nenhum cliente encontrado" : "Nenhum cliente com saldo devedor"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Última compra</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5">
                    <Link href={`/tutores/${r.id}`}
                      className="font-medium text-gray-900 hover:text-teal-600 transition">
                      {r.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {r.ultima_compra ? formatDate(r.ultima_compra) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-red-600">
                    {formatCurrency(Number(r.saldo_aberto))}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                      <AlertCircle size={11} /> Saldo devedor
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-gray-700">
                  Total ({rows.length} clientes)
                </td>
                <td className="px-5 py-3 text-right font-bold text-red-600">
                  {formatCurrency(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
