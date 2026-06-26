"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Package, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Produto = {
  id: string;
  codigo?: string;
  nome: string;
  tipo: string;
  preco: number;
  custo?: number;
  estoque: number;
  estoqueMin: number;
  unidade: string;
  ativo: boolean;
  categoria?: { nome: string };
};

const tipoLabel: Record<string, string> = {
  PRODUTO: "Produto",
  SERVICO: "Serviço",
  MEDICAMENTO: "Medicamento",
};

const emptyForm = {
  nome: "", tipo: "PRODUTO", preco: "", custo: "", estoque: "", estoqueMin: "0",
  unidade: "un", codigo: "", descricao: "",
};

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filtroTipo) params.set("tipo", filtroTipo);
    const res = await fetch(`/api/produtos?${params}`);
    const data = await res.json();
    setProdutos(data);
    setLoading(false);
  }, [q, filtroTipo]);

  useEffect(() => {
    const t = setTimeout(fetchProdutos, 300);
    return () => clearTimeout(t);
  }, [fetchProdutos]);

  function openNew() {
    setEditId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(p: Produto) {
    setEditId(p.id);
    setForm({
      nome: p.nome, tipo: p.tipo, preco: String(p.preco), custo: String(p.custo ?? ""),
      estoque: String(p.estoque), estoqueMin: String(p.estoqueMin), unidade: p.unidade,
      codigo: p.codigo ?? "", descricao: "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome || !form.preco) { toast.error("Nome e preço são obrigatórios"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/produtos/${editId}` : "/api/produtos";
      const method = editId ? "PATCH" : "POST";
      const payload = {
        ...form,
        preco: Number(form.preco),
        custo: form.custo ? Number(form.custo) : null,
        estoque: Number(form.estoque),
        estoqueMin: Number(form.estoqueMin),
      };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Produto atualizado!" : "Produto cadastrado!");
      setModalOpen(false);
      fetchProdutos();
    } catch { toast.error("Erro ao salvar produto"); }
    finally { setSaving(false); }
  }

  const totalBaixo = produtos.filter((p) => p.tipo !== "SERVICO" && p.estoque <= p.estoqueMin).length;

  return (
    <div>
      <PageHeader
        title="Estoque"
        description={`${produtos.length} produtos cadastrados`}
        actions={<Button onClick={openNew}><Plus size={16} /> Novo produto</Button>}
      />

      {totalBaixo > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800 font-medium">{totalBaixo} produto(s) abaixo do estoque mínimo</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos os tipos</option>
          <option value="PRODUTO">Produtos</option>
          <option value="MEDICAMENTO">Medicamentos</option>
          <option value="SERVICO">Serviços</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preço</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mínimo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : produtos.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400"><Package size={32} className="mx-auto mb-2 opacity-40" /><p>Nenhum produto encontrado</p></td></tr>
            ) : (
              produtos.map((p) => {
                const baixo = p.tipo !== "SERVICO" && p.estoque <= p.estoqueMin;
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${baixo ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.nome}</p>
                      {p.codigo && <p className="text-xs text-gray-400">Cód: {p.codigo}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.tipo === "SERVICO" ? "purple" : p.tipo === "MEDICAMENTO" ? "info" : "default"}>
                        {tipoLabel[p.tipo]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(p.preco)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${baixo ? "text-amber-600" : "text-gray-900"}`}>
                        {p.tipo === "SERVICO" ? "—" : `${p.estoque} ${p.unidade}`}
                      </span>
                      {baixo && <AlertTriangle size={14} className="inline ml-1 text-amber-500" />}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {p.tipo === "SERVICO" ? "—" : `${p.estoqueMin} ${p.unidade}`}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Editar produto" : "Novo produto"} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <Select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="PRODUTO">Produto</option>
            <option value="MEDICAMENTO">Medicamento</option>
            <option value="SERVICO">Serviço</option>
          </Select>
          <Input label="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="SKU / código de barras" />
          <Input label="Preço de venda *" type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
          <Input label="Custo" type="number" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
          {form.tipo !== "SERVICO" && (
            <>
              <Input label="Estoque atual" type="number" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
              <Input label="Estoque mínimo" type="number" value={form.estoqueMin} onChange={(e) => setForm({ ...form, estoqueMin: e.target.value })} />
            </>
          )}
          <Input label="Unidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un, cx, ml, kg..." />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
