"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Save, CheckCircle2, Search, AlertTriangle, Printer,
} from "lucide-react";

type Grupo = { id: string; nome: string; cor: string };
type Item = {
  id: string;
  estoqueSistema: number;
  estoqueContado: number | null;
  contado: boolean;
  ajuste: number;
  produto: {
    id: string; nome: string; codigo: string | null; unidade: string;
    custo: number | null; grupoProduto: Grupo | null;
  };
};
type Inventario = {
  id: string;
  descricao: string | null;
  status: "ABERTO" | "FINALIZADO" | "CANCELADO";
  createdAt: string;
  finalizadoEm: string | null;
  itens: Item[];
};

function num(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default function InventarioContagemPage() {
  const params = useParams();
  const id = params.id as string;

  const [inv, setInv]         = useState<Inventario | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState("");
  const [salvando, setSalvando] = useState(false);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [finalizando, setFinalizando]       = useState(false);

  // contagens locais: itemId -> string (para permitir campo vazio)
  const [counts, setCounts]   = useState<Record<string, string>>({});
  const [dirty, setDirty]     = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/inventarios/${id}`);
    const data: Inventario = await res.json();
    setInv(data);
    const init: Record<string, string> = {};
    for (const it of data.itens ?? []) {
      init[it.id] = it.estoqueContado != null ? String(it.estoqueContado) : "";
    }
    setCounts(init);
    setDirty(false);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const aberto = inv?.status === "ABERTO";

  function setCount(itemId: string, value: string) {
    setCounts(prev => ({ ...prev, [itemId]: value }));
    setDirty(true);
  }

  async function salvar(silent = false) {
    if (!inv) return;
    setSalvando(true);
    try {
      const itens = inv.itens.map(it => {
        const v = counts[it.id];
        return { id: it.id, estoqueContado: v === "" || v === undefined ? null : Number(v) };
      });
      const res = await fetch(`/api/inventarios/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens }),
      });
      if (!res.ok) throw new Error();
      setDirty(false);
      if (!silent) toast.success("Contagem salva");
    } catch {
      toast.error("Erro ao salvar contagem");
    } finally { setSalvando(false); }
  }

  async function finalizar() {
    setFinalizando(true);
    try {
      // salva antes de finalizar
      await salvar(true);
      const res = await fetch(`/api/inventarios/${id}/finalizar`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const data = await res.json();
      toast.success(`Inventário finalizado — ${data.ajustados} ajuste(s) aplicado(s)`);
      setModalFinalizar(false);
      fetch_();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao finalizar");
    } finally { setFinalizando(false); }
  }

  // Estatísticas ao vivo
  function diferenca(it: Item): number | null {
    const v = counts[it.id];
    if (v === "" || v === undefined) return null;
    return Number(v) - it.estoqueSistema;
  }

  const itens = inv?.itens ?? [];
  const filtrados = itens.filter(it => {
    if (!q) return true;
    const s = q.toLowerCase();
    return it.produto.nome.toLowerCase().includes(s) || (it.produto.codigo ?? "").toLowerCase().includes(s);
  });

  const contadosCount = itens.filter(it => counts[it.id] !== "" && counts[it.id] !== undefined).length;
  const divergencias  = itens.filter(it => { const d = diferenca(it); return d !== null && d !== 0; });
  const pct = itens.length ? Math.round((contadosCount / itens.length) * 100) : 0;

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!inv)    return <div className="text-center py-20 text-gray-400">Inventário não encontrado</div>;

  return (
    <div>
      <PageHeader
        title={inv.descricao || `Inventário ${new Date(inv.createdAt).toLocaleDateString("pt-BR")}`}
        description={aberto ? "Digite a quantidade contada de cada item" : "Inventário finalizado"}
        actions={
          <div className="flex gap-2">
            <Link href="/estoque/inventario" className="flex items-center gap-1 text-sm text-teal-600 hover:underline px-3 py-2">
              <ArrowLeft size={14} /> Voltar
            </Link>
            {!aberto && (
              <Button variant="outline" onClick={() => window.print()}>
                <Printer size={15} /> Imprimir
              </Button>
            )}
            {aberto && (
              <>
                <Button variant="outline" onClick={() => salvar()} loading={salvando}>
                  <Save size={15} /> Salvar
                </Button>
                <Button onClick={() => setModalFinalizar(true)}>
                  <CheckCircle2 size={15} /> Finalizar
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Barra de status */}
      <div className="grid grid-cols-3 gap-3 mb-4 print:hidden">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Contados</p>
          <p className="text-xl font-bold text-gray-900">{contadosCount}<span className="text-sm text-gray-400">/{itens.length}</span></p>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Divergências</p>
          <p className="text-xl font-bold text-amber-600">{divergencias.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Situação</p>
          <p className={`text-xl font-bold ${aberto ? "text-teal-600" : "text-green-600"}`}>
            {aberto ? "Em contagem" : "Finalizado"}
          </p>
        </div>
      </div>

      {dirty && aberto && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 text-sm text-amber-700 flex items-center gap-2 print:hidden">
          <AlertTriangle size={14} /> Há contagens não salvas. Clique em Salvar ou Finalizar.
        </div>
      )}

      {/* Busca */}
      <div className="relative max-w-md mb-4 print:hidden">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar produto por nome ou código..."
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase print:hidden">Grupo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sistema</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhum produto encontrado</td></tr>
            ) : filtrados.map(it => {
              const dif = aberto ? diferenca(it) : (it.contado ? it.ajuste : null);
              return (
                <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{it.produto.nome}</p>
                    {it.produto.codigo && <p className="text-xs text-gray-400">Cód: {it.produto.codigo}</p>}
                  </td>
                  <td className="px-4 py-2.5 print:hidden">
                    {it.produto.grupoProduto ? (
                      <span className="inline-flex text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: it.produto.grupoProduto.cor + "25", color: it.produto.grupoProduto.cor }}>
                        {it.produto.grupoProduto.nome}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">
                    {num(it.estoqueSistema)} <span className="text-xs text-gray-400">{it.produto.unidade}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {aberto ? (
                      <input
                        type="number" step="0.01"
                        value={counts[it.id] ?? ""}
                        onChange={e => setCount(it.id, e.target.value)}
                        placeholder="—"
                        className="w-24 text-right border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    ) : (
                      <span className={it.contado ? "text-gray-900 font-medium" : "text-gray-300"}>
                        {it.contado ? num(it.estoqueContado ?? 0) : "não contado"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {dif === null ? (
                      <span className="text-gray-300">—</span>
                    ) : dif === 0 ? (
                      <span className="text-green-600 font-medium">0</span>
                    ) : (
                      <span className={`font-semibold ${dif > 0 ? "text-blue-600" : "text-red-600"}`}>
                        {dif > 0 ? "+" : ""}{num(dif)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal finalizar */}
      <Modal open={modalFinalizar} onClose={() => setModalFinalizar(false)} title="Finalizar inventário" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Ao finalizar, o estoque dos produtos contados será ajustado para os valores digitados. Esta ação não pode ser desfeita.
          </p>
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Itens contados:</span>
              <span className="font-semibold">{contadosCount} de {itens.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ajustes a aplicar:</span>
              <span className="font-semibold text-amber-600">{divergencias.length}</span>
            </div>
          </div>
          {contadosCount < itens.length && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} /> Itens não contados manterão o estoque atual inalterado.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalFinalizar(false)}>Cancelar</Button>
          <Button onClick={finalizar} loading={finalizando}>Confirmar e ajustar estoque</Button>
        </div>
      </Modal>

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
