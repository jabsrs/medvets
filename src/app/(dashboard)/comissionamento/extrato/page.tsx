"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft, CheckCircle2, Clock, Trash2, Filter, ArrowLeft,
} from "lucide-react";

type UserSimples  = { id: string; name: string };
type ProdutoSimples = { id: string; nome: string };
type Comissao = {
  id: string;
  data: string;
  valor: number;
  percentual: number | null;
  pago: boolean;
  user: UserSimples;
  produto: ProdutoSimples | null;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function mesAtual() {
  const hoje = new Date();
  return {
    de:  isoDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    ate: isoDate(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
}

function ExtratoContent() {
  const sp = useSearchParams();
  const defaultUserId = sp.get("userId") ?? "";
  const defaultDe     = sp.get("de")     ?? mesAtual().de;
  const defaultAte    = sp.get("ate")    ?? mesAtual().ate;

  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filtroUserId, setFiltroUserId] = useState(defaultUserId);
  const [filtroPago, setFiltroPago]     = useState<"" | "true" | "false">("");
  const [de,  setDe]  = useState(defaultDe);
  const [ate, setAte] = useState(defaultAte);

  const [vets, setVets] = useState<UserSimples[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  // Modal confirmar exclusão
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [modalExcluir, setModalExcluir] = useState(false);

  const [pagando, setPagando] = useState(false);

  const fetchComissoes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroUserId) params.set("userId", filtroUserId);
    if (filtroPago)   params.set("pago",   filtroPago);
    if (de)  params.set("de",  de);
    if (ate) params.set("ate", ate);
    const res = await fetch(`/api/comissoes?${params}`);
    const data = await res.json();
    setComissoes(data.comissoes ?? []);
    setLoading(false);
  }, [filtroUserId, filtroPago, de, ate]);

  useEffect(() => { fetchComissoes(); }, [fetchComissoes]);

  useEffect(() => {
    fetch("/api/usuarios?ativos=1").then(r => r.json()).then(data => {
      const lista = Array.isArray(data) ? data : (data.usuarios ?? []);
      setVets(lista);
    });
  }, []);

  function toggleSel(id: string) {
    setSelecionadas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    const pendentes = comissoes.filter(c => !c.pago).map(c => c.id);
    if (selecionadas.size === pendentes.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(pendentes));
    }
  }

  async function pagarSelecionadas() {
    if (!selecionadas.size) return;
    setPagando(true);
    try {
      const res = await fetch("/api/comissoes/pagar-lote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selecionadas) }),
      });
      const data = await res.json();
      toast.success(`${data.atualizadas} comissão(ões) pagas`);
      setSelecionadas(new Set());
      fetchComissoes();
    } catch {
      toast.error("Erro ao registrar pagamento");
    } finally { setPagando(false); }
  }

  async function excluir(id: string) {
    setExcluindo(id);
    setModalExcluir(true);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await fetch(`/api/comissoes/${excluindo}`, { method: "DELETE" });
      toast.success("Comissão excluída");
      setSelecionadas(prev => { const n = new Set(prev); n.delete(excluindo); return n; });
      fetchComissoes();
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setModalExcluir(false);
      setExcluindo(null);
    }
  }

  async function marcarPaga(id: string) {
    try {
      await fetch(`/api/comissoes/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pago: true }),
      });
      toast.success("Marcada como paga");
      fetchComissoes();
    } catch {
      toast.error("Erro ao atualizar");
    }
  }

  const pendentes = comissoes.filter(c => !c.pago);
  const totalPendente = pendentes.reduce((s, c) => s + c.valor, 0);
  const totalPago     = comissoes.filter(c => c.pago).reduce((s, c) => s + c.valor, 0);

  return (
    <div>
      <PageHeader
        title="Extrato de comissões"
        description="Histórico completo de comissões"
        actions={
          <Link href="/comissionamento" className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
            <ArrowLeft size={14} /> Voltar ao resumo
          </Link>
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filtros</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filtroUserId} onChange={e => setFiltroUserId(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Todos os veterinários</option>
            {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <select value={filtroPago} onChange={e => setFiltroPago(e.target.value as "" | "true" | "false")}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Todos os status</option>
            <option value="false">Pendentes</option>
            <option value="true">Pagas</option>
          </select>
          <input type="date" value={de} onChange={e => setDe(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <span className="text-gray-400 text-sm">até</span>
          <input type="date" value={ate} onChange={e => setAte(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <button onClick={() => { const m = mesAtual(); setDe(m.de); setAte(m.ate); }}
            className="text-sm text-teal-600 hover:underline">Este mês</button>
        </div>
      </div>

      {/* KPIs compactas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Pendente</span>
          <span className="font-bold text-amber-600">{fmt(totalPendente)}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Pago</span>
          <span className="font-bold text-green-600">{fmt(totalPago)}</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total ({comissoes.length})</span>
          <span className="font-bold text-gray-900">{fmt(totalPendente + totalPago)}</span>
        </div>
      </div>

      {/* Ações em lote */}
      {selecionadas.size > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-3 flex items-center justify-between">
          <span className="text-sm text-teal-800 font-medium">
            {selecionadas.size} selecionada(s)
          </span>
          <Button onClick={pagarSelecionadas} loading={pagando}>
            <CheckCircle2 size={14} /> Pagar selecionadas
          </Button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-8">
                <input type="checkbox"
                  checked={selecionadas.size === pendentes.length && pendentes.length > 0}
                  onChange={toggleTodos}
                  className="rounded" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Veterinário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Serviço</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : comissoes.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhuma comissão encontrada</td></tr>
            ) : comissoes.map(c => (
              <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.pago ? "opacity-70" : ""}`}>
                <td className="px-4 py-3">
                  {!c.pago && (
                    <input type="checkbox"
                      checked={selecionadas.has(c.id)}
                      onChange={() => toggleSel(c.id)}
                      className="rounded" />
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(c.data).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{c.user.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.produto?.nome ?? "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(c.valor)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {c.percentual != null ? `${c.percentual}%` : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {c.pago ? (
                    <Badge variant="success">Paga</Badge>
                  ) : (
                    <Badge variant="warning">Pendente</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {!c.pago && (
                      <button onClick={() => marcarPaga(c.id)}
                        title="Marcar como paga"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button onClick={() => excluir(c.id)}
                      title="Excluir"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {comissoes.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-600">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(totalPendente + totalPago)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal excluir */}
      <Modal open={modalExcluir} onClose={() => setModalExcluir(false)} title="Excluir comissão" size="sm">
        <p className="text-sm text-gray-600 mb-4">Tem certeza que deseja excluir esta comissão? Esta ação não pode ser desfeita.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalExcluir(false)}>Cancelar</Button>
          <Button onClick={confirmarExclusao} className="bg-red-600 hover:bg-red-700">Excluir</Button>
        </div>
      </Modal>
    </div>
  );
}

export default function ExtratoPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Carregando...</div>}>
      <ExtratoContent />
    </Suspense>
  );
}
