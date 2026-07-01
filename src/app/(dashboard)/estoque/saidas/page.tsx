"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, PackageX, AlertTriangle, CalendarDays } from "lucide-react";

type GrupoSimples = { id: string; nome: string; cor: string };

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  estoque: number;
  grupoProduto?: GrupoSimples;
};

type Movimento = {
  id: string;
  produtoId: string;
  tipo: string;
  quantidade: number;
  custo: number | null;
  motivo: string | null;
  data: string;
  produto: Produto;
};

const MOTIVOS = [
  "Consumo interno",
  "Perda de validade",
  "Avaria / Dano",
  "Doação",
  "Uso veterinário",
  "Furto / Extravio",
  "Outro",
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function mesAtual() {
  const hoje = new Date();
  const de  = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { de: isoDate(de), ate: isoDate(ate) };
}

export default function SaidasEstoquePage() {
  const [movimentos, setMovimentos]   = useState<Movimento[]>([]);
  const [produtos, setProdutos]       = useState<Produto[]>([]);
  const [loading, setLoading]         = useState(true);

  const [q, setQ]                     = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("");
  const [de, setDe]                   = useState(mesAtual().de);
  const [ate, setAte]                 = useState(mesAtual().ate);

  // Modal
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState({
    produtoId: "", motivo: MOTIVOS[0], obs: "", quantidade: "",
    data: isoDate(new Date()),
  });
  const [saving, setSaving]           = useState(false);
  const [produtoBusca, setProdutoBusca] = useState("");
  const [produtosFiltrados, setProdutosFiltrados] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tipo: "SAIDA" });
    if (de)           params.set("de", de);
    if (ate)          params.set("ate", ate);
    if (filtroMotivo) params.set("motivo", filtroMotivo);
    if (q)            params.set("q", q);
    const res = await fetch(`/api/movimentos?${params}`);
    setMovimentos(await res.json());
    setLoading(false);
  }, [de, ate, filtroMotivo, q]);

  useEffect(() => {
    const t = setTimeout(fetch_, 300);
    return () => clearTimeout(t);
  }, [fetch_]);

  useEffect(() => {
    fetch("/api/produtos?limit=500")
      .then(r => r.json())
      .then(data => setProdutos(data.filter((p: Produto & { tipo: string }) => p.tipo !== "SERVICO")));
  }, []);

  // Busca de produto no modal
  useEffect(() => {
    if (!produtoBusca.trim()) { setProdutosFiltrados([]); return; }
    const q = produtoBusca.toLowerCase();
    setProdutosFiltrados(
      produtos.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 8)
    );
  }, [produtoBusca, produtos]);

  function abrirModal() {
    setForm({ produtoId: "", motivo: MOTIVOS[0], obs: "", quantidade: "", data: isoDate(new Date()) });
    setProdutoBusca("");
    setProdutoSelecionado(null);
    setModal(true);
  }

  function selecionarProduto(p: Produto) {
    setProdutoSelecionado(p);
    setForm(prev => ({ ...prev, produtoId: p.id }));
    setProdutoBusca(p.nome);
    setProdutosFiltrados([]);
  }

  async function save() {
    if (!form.produtoId)   { toast.error("Selecione um produto"); return; }
    if (!form.quantidade || Number(form.quantidade) <= 0) { toast.error("Quantidade inválida"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId:  form.produtoId,
          quantidade: Number(form.quantidade),
          motivo:     form.motivo,
          obs:        form.obs,
          data:       form.data,
          tipo:       "SAIDA",
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Saída registrada com sucesso!");
      setModal(false);
      fetch_();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar saída");
    } finally { setSaving(false); }
  }

  // KPIs
  const totalItens    = movimentos.reduce((s, m) => s + m.quantidade, 0);
  const custoTotal    = movimentos.reduce((s, m) => s + (m.custo ?? 0) * m.quantidade, 0);
  const produtosUnicos = new Set(movimentos.map(m => m.produtoId)).size;

  const MOTIVO_COR: Record<string, string> = {
    "Consumo interno":  "bg-blue-100 text-blue-700",
    "Perda de validade": "bg-amber-100 text-amber-700",
    "Avaria / Dano":     "bg-red-100 text-red-700",
    "Doação":            "bg-green-100 text-green-700",
    "Uso veterinário":   "bg-purple-100 text-purple-700",
    "Furto / Extravio":  "bg-red-100 text-red-800",
    "Outro":             "bg-gray-100 text-gray-600",
  };

  function motivoLabel(motivo: string | null) {
    if (!motivo) return null;
    const base = MOTIVOS.find(m => motivo.startsWith(m)) ?? "Outro";
    return base;
  }

  return (
    <div>
      <PageHeader
        title="Saídas de Estoque"
        description="Registre perdas, avarias, consumo interno e doações"
        actions={<Button onClick={abrirModal}><Plus size={16} /> Registrar saída</Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Itens retirados</p>
          <p className="text-2xl font-bold text-gray-900">{totalItens.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-400 mt-0.5">{movimentos.length} registro(s) no período</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Produtos afetados</p>
          <p className="text-2xl font-bold text-gray-900">{produtosUnicos}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Custo estimado</p>
          <p className="text-2xl font-bold text-red-600">{fmt(custoTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Baseado no custo unitário</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <select value={filtroMotivo} onChange={e => setFiltroMotivo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">Todos os motivos</option>
          {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
          <input type="date" value={de} onChange={e => setDe(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <span className="text-gray-400 text-sm">até</span>
          <input type="date" value={ate} onChange={e => setAte(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={() => { const m = mesAtual(); setDe(m.de); setAte(m.ate); }}
          className="text-sm text-teal-600 hover:underline whitespace-nowrap">
          Este mês
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Motivo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Custo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : movimentos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <PackageX size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">Nenhuma saída registrada no período</p>
                  <button onClick={abrirModal} className="mt-2 text-sm text-teal-600 hover:underline">
                    + Registrar saída
                  </button>
                </td>
              </tr>
            ) : movimentos.map(m => {
              const label = motivoLabel(m.motivo);
              const cor   = label ? (MOTIVO_COR[label] ?? "bg-gray-100 text-gray-600") : "";
              const obs   = m.motivo?.includes(" — ") ? m.motivo.split(" — ").slice(1).join(" — ") : null;
              return (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{m.produto.nome}</p>
                    {obs && <p className="text-xs text-gray-400 mt-0.5">{obs}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {m.produto.grupoProduto ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: m.produto.grupoProduto.cor + "20", color: m.produto.grupoProduto.cor }}>
                        {m.produto.grupoProduto.nome}
                      </span>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {label ? (
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${cor}`}>
                        {label}
                      </span>
                    ) : <span className="text-gray-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {m.quantidade} {m.produto.unidade}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-red-600">
                    {m.custo ? fmt(m.custo * m.quantidade) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{fmtData(m.data)}</td>
                </tr>
              );
            })}
          </tbody>
          {movimentos.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total ({movimentos.length} registros)
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                  {totalItens.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-red-600">
                  {fmt(custoTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Registrar saída de estoque" size="md">
        <div className="space-y-4">
          {/* Busca de produto */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={produtoBusca}
                onChange={e => { setProdutoBusca(e.target.value); setProdutoSelecionado(null); setForm(prev => ({ ...prev, produtoId: "" })); }}
                placeholder="Digite o nome do produto..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {produtosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {produtosFiltrados.map(p => (
                  <button key={p.id} onClick={() => selecionarProduto(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-teal-50 transition text-left">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.nome}</p>
                      {p.grupoProduto && (
                        <p className="text-xs text-gray-400">{p.grupoProduto.nome}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-3 flex-shrink-0">
                      Estoque: <strong>{p.estoque} {p.unidade}</strong>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Aviso de estoque baixo */}
          {produtoSelecionado && produtoSelecionado.estoque <= 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-700">
              <AlertTriangle size={15} className="flex-shrink-0" />
              Estoque atual zerado ({produtoSelecionado.estoque} {produtoSelecionado.unidade})
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
              <select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Input
              label="Quantidade *"
              type="number"
              min="0.001"
              step="0.001"
              value={form.quantidade}
              onChange={e => setForm({ ...form, quantidade: e.target.value })}
              placeholder={produtoSelecionado ? `Max: ${produtoSelecionado.estoque} ${produtoSelecionado.unidade}` : "0"}
            />
          </div>

          <Input
            label="Observação (opcional)"
            value={form.obs}
            onChange={e => setForm({ ...form, obs: e.target.value })}
            placeholder="Ex: lote vencido em jan/25, produto danificado na entrega..."
          />

          <Input
            label="Data"
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Registrar saída</Button>
        </div>
      </Modal>
    </div>
  );
}
