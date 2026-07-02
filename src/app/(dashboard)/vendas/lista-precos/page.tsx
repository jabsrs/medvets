"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Printer, TrendingUp, Search, Filter, Check, X } from "lucide-react";

type Grupo = { id: string; nome: string; cor: string };
type Produto = {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: string;
  preco: number;
  custo: number | null;
  ativo: boolean;
  grupoProduto: Grupo | null;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function margem(preco: number, custo: number | null): string {
  if (!custo || custo <= 0) return "—";
  const m = ((preco - custo) / preco) * 100;
  return `${m.toFixed(1)}%`;
}

function margemCor(preco: number, custo: number | null): string {
  if (!custo || custo <= 0) return "text-gray-400";
  const m = ((preco - custo) / preco) * 100;
  if (m < 20) return "text-red-500";
  if (m < 40) return "text-amber-500";
  return "text-green-600";
}

const TIPO_LABEL: Record<string, string> = {
  PRODUTO: "Produto", SERVICO: "Serviço", MEDICAMENTO: "Medicamento",
};
const TIPO_VARIANT: Record<string, "default" | "info" | "success"> = {
  PRODUTO: "default", SERVICO: "info", MEDICAMENTO: "success",
};

export default function ListaPrecosPage() {
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [grupos, setGrupos]       = useState<Grupo[]>([]);
  const [loading, setLoading]     = useState(true);

  // Filtros
  const [q, setQ]                 = useState("");
  const [filtroTipo, setFiltroTipo]   = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");

  // Edição inline
  const [editando, setEditando]   = useState<string | null>(null);
  const [editPreco, setEditPreco] = useState("");
  const [editCusto, setEditCusto] = useState("");
  const [saving, setSaving]       = useState(false);
  const precoRef = useRef<HTMLInputElement>(null);

  // Modal reajuste
  const [modalReajuste, setModalReajuste] = useState(false);
  const [reajPercent, setReajPercent]     = useState("");
  const [reajTipo, setReajTipo]           = useState("");
  const [reajGrupo, setReajGrupo]         = useState("");
  const [reajustando, setReajustando]     = useState(false);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/produtos?limit=2000&ativo=1");
    const data = await res.json();
    const lista: Produto[] = Array.isArray(data) ? data : (data.produtos ?? data);
    setProdutos(lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    setLoading(false);
  }, []);

  useEffect(() => { fetchProdutos(); }, [fetchProdutos]);

  useEffect(() => {
    fetch("/api/grupos-produto").then(r => r.json()).then((data: { grupos?: Grupo[]; filhos?: Grupo[] }[]) => {
      const flat: Grupo[] = [];
      for (const g of Array.isArray(data) ? data : []) {
        const grupo = g as unknown as Grupo & { filhos?: Grupo[] };
        flat.push({ id: grupo.id, nome: grupo.nome, cor: grupo.cor });
        for (const f of grupo.filhos ?? []) flat.push(f);
      }
      setGrupos(flat);
    });
  }, []);

  const filtrados = produtos.filter(p => {
    if (filtroTipo  && p.tipo            !== filtroTipo)  return false;
    if (filtroGrupo && p.grupoProduto?.id !== filtroGrupo) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!p.nome.toLowerCase().includes(s) && !(p.codigo ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  function startEdit(p: Produto) {
    setEditando(p.id);
    setEditPreco(String(p.preco));
    setEditCusto(p.custo != null ? String(p.custo) : "");
    setTimeout(() => precoRef.current?.select(), 50);
  }

  function cancelEdit() { setEditando(null); }

  async function saveEdit(id: string) {
    if (!editPreco || isNaN(Number(editPreco))) { toast.error("Preço inválido"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/produtos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preco: Number(editPreco),
          custo: editCusto !== "" ? Number(editCusto) : null,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const updated = await res.json();
      setProdutos(prev => prev.map(p => p.id === id ? { ...p, preco: updated.preco, custo: updated.custo } : p));
      setEditando(null);
      toast.success("Preço atualizado");
    } catch {
      toast.error("Erro ao salvar preço");
    } finally { setSaving(false); }
  }

  async function aplicarReajuste() {
    if (!reajPercent || isNaN(Number(reajPercent))) { toast.error("Percentual inválido"); return; }
    setReajustando(true);
    try {
      const res = await fetch("/api/lista-precos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentual:     Number(reajPercent),
          tipo:           reajTipo  || undefined,
          grupoProdutoId: reajGrupo || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`${data.atualizados} produto(s) reajustado(s)`);
      setModalReajuste(false);
      setReajPercent("");
      fetchProdutos();
    } catch {
      toast.error("Erro ao aplicar reajuste");
    } finally { setReajustando(false); }
  }

  const totalProdutos  = filtrados.filter(p => p.tipo === "PRODUTO").length;
  const totalServicos  = filtrados.filter(p => p.tipo === "SERVICO").length;
  const totalMedic     = filtrados.filter(p => p.tipo === "MEDICAMENTO").length;
  const precoMedio     = filtrados.length
    ? filtrados.reduce((s, p) => s + p.preco, 0) / filtrados.length
    : 0;

  return (
    <div>
      <PageHeader
        title="Lista de preços"
        description="Consulte e atualize os preços de produtos e serviços"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={15} /> Imprimir
            </Button>
            <Button onClick={() => setModalReajuste(true)}>
              <TrendingUp size={15} /> Reajuste em lote
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5 print:hidden">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Produtos</p>
          <p className="text-xl font-bold text-gray-900">{totalProdutos}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Serviços</p>
          <p className="text-xl font-bold text-gray-900">{totalServicos}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Medicamentos</p>
          <p className="text-xl font-bold text-gray-900">{totalMedic}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Preço médio</p>
          <p className="text-xl font-bold text-teal-700">{fmt(precoMedio)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar por nome ou código..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Todos os tipos</option>
            <option value="PRODUTO">Produto</option>
            <option value="SERVICO">Serviço</option>
            <option value="MEDICAMENTO">Medicamento</option>
          </select>
          <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Todos os grupos</option>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
          </select>
          {(q || filtroTipo || filtroGrupo) && (
            <button onClick={() => { setQ(""); setFiltroTipo(""); setFiltroGrupo(""); }}
              className="text-sm text-gray-400 hover:text-gray-600">limpar</button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtrados.length} item(ns)</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase print:hidden">Grupo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase print:hidden">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Custo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preço venda</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase print:hidden">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum produto encontrado</td></tr>
            ) : filtrados.map(p => {
              const isEdit = editando === p.id;
              return (
                <tr key={p.id}
                  className={`transition-colors group ${isEdit ? "bg-teal-50" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900 leading-snug">{p.nome}</p>
                    {p.codigo && <p className="text-xs text-gray-400">Cód: {p.codigo}</p>}
                  </td>
                  <td className="px-4 py-2.5 print:hidden">
                    {p.grupoProduto ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: p.grupoProduto.cor + "25",
                          color: p.grupoProduto.cor,
                        }}>
                        {p.grupoProduto.nome}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 print:hidden">
                    <Badge variant={TIPO_VARIANT[p.tipo] ?? "default"}>
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                    </Badge>
                  </td>

                  {/* Custo */}
                  <td className="px-4 py-2.5 text-right">
                    {isEdit ? (
                      <input
                        type="number" step="0.01" min="0"
                        value={editCusto}
                        onChange={e => setEditCusto(e.target.value)}
                        className="w-24 text-right border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="0,00"
                      />
                    ) : (
                      <span className="text-gray-500">
                        {p.custo != null ? fmt(p.custo) : "—"}
                      </span>
                    )}
                  </td>

                  {/* Preço venda */}
                  <td className="px-4 py-2.5 text-right">
                    {isEdit ? (
                      <input
                        ref={precoRef}
                        type="number" step="0.01" min="0"
                        value={editPreco}
                        onChange={e => setEditPreco(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") saveEdit(p.id);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-28 text-right border border-teal-400 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    ) : (
                      <button
                        onClick={() => startEdit(p)}
                        className="font-semibold text-gray-900 hover:text-teal-700 hover:underline transition print:pointer-events-none">
                        {fmt(p.preco)}
                      </button>
                    )}
                  </td>

                  {/* Margem */}
                  <td className="px-4 py-2.5 text-right print:hidden">
                    {isEdit ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => saveEdit(p.id)} disabled={saving}
                          className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition" title="Salvar">
                          <Check size={14} />
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition" title="Cancelar">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className={`font-medium ${margemCor(p.preco, p.custo)}`}>
                        {margem(p.preco, p.custo)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal reajuste em lote */}
      <Modal open={modalReajuste} onClose={() => setModalReajuste(false)} title="Reajuste de preços em lote" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            Aplica um percentual de reajuste sobre os preços atuais. Use valores negativos para redução.
          </div>
          <Input label="Percentual de reajuste *" type="number" step="0.1"
            value={reajPercent} onChange={e => setReajPercent(e.target.value)}
            placeholder="Ex: 10 (para +10%) ou -5 (para -5%)" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por tipo (opcional)</label>
            <select value={reajTipo} onChange={e => setReajTipo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Todos os tipos</option>
              <option value="PRODUTO">Somente Produtos</option>
              <option value="SERVICO">Somente Serviços</option>
              <option value="MEDICAMENTO">Somente Medicamentos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por grupo (opcional)</label>
            <select value={reajGrupo} onChange={e => setReajGrupo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Todos os grupos</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>

          {reajPercent && !isNaN(Number(reajPercent)) && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700">
              Serão reajustados{" "}
              <strong>
                {filtrados.filter(p =>
                  (!reajTipo  || p.tipo === reajTipo) &&
                  (!reajGrupo || p.grupoProduto?.id === reajGrupo)
                ).length} produto(s)
              </strong>{" "}
              em <strong className={Number(reajPercent) >= 0 ? "text-green-600" : "text-red-600"}>
                {Number(reajPercent) >= 0 ? "+" : ""}{reajPercent}%
              </strong>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalReajuste(false)}>Cancelar</Button>
          <Button onClick={aplicarReajuste} loading={reajustando}>Aplicar reajuste</Button>
        </div>
      </Modal>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 4px 8px; }
          thead { background: #f5f5f5; }
        }
      `}</style>
    </div>
  );
}
