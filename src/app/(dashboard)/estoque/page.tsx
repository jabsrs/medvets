"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Package, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type GrupoSimples = { id: string; nome: string; cor: string; parentId: string | null };
type GrupoComFilhos = GrupoSimples & { filhos: GrupoSimples[] };

type Produto = {
  id: string;
  codigo?: string;
  nome: string;
  tipo: string;
  preco: number;
  custo?: number;
  estoque: number;
  estoqueMin: number;
  estoqueMax?: number | null;
  unidade: string;
  ativo: boolean;
  categoria?: { nome: string };
  grupoProduto?: GrupoSimples;
};

const emptyForm = {
  nome: "", tipo: "PRODUTO", preco: "", custo: "", estoque: "", estoqueMin: "0", estoqueMax: "",
  unidade: "un", codigo: "", descricao: "", grupoProdutoId: "",
};

export default function EstoquePage() {
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [grupos, setGrupos]       = useState<GrupoComFilhos[]>([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState("");
  const [filtroTipo, setFiltroTipo]   = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving]       = useState(false);

  // Opções de grupo achatadas para o select do modal
  const grupoOpcoes: GrupoSimples[] = grupos.flatMap(g => [
    { id: g.id, nome: g.nome, cor: g.cor, parentId: null },
    ...g.filhos.map(f => ({ id: f.id, nome: `  ${g.nome} › ${f.nome}`, cor: f.cor, parentId: g.id })),
  ]);

  const fetchProdutos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q)           params.set("q", q);
    if (filtroTipo)  params.set("tipo", filtroTipo);
    if (filtroGrupo) params.set("grupo", filtroGrupo);
    params.set("limit", "500");
    const res = await fetch(`/api/produtos?${params}`);
    setProdutos(await res.json());
    setLoading(false);
  }, [q, filtroTipo, filtroGrupo]);

  useEffect(() => {
    const t = setTimeout(fetchProdutos, 300);
    return () => clearTimeout(t);
  }, [fetchProdutos]);

  useEffect(() => {
    fetch("/api/grupos-produto")
      .then(r => r.json())
      .then(setGrupos);
  }, []);

  function openNew() {
    setEditId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(p: Produto) {
    setEditId(p.id);
    setForm({
      nome: p.nome, tipo: p.tipo, preco: String(p.preco), custo: String(p.custo ?? ""),
      estoque: String(p.estoque), estoqueMin: String(p.estoqueMin),
      estoqueMax: p.estoqueMax != null ? String(p.estoqueMax) : "", unidade: p.unidade,
      codigo: p.codigo ?? "", descricao: "",
      grupoProdutoId: p.grupoProduto?.id ?? "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome || !form.preco) { toast.error("Nome e preço são obrigatórios"); return; }
    setSaving(true);
    try {
      const url    = editId ? `/api/produtos/${editId}` : "/api/produtos";
      const method = editId ? "PATCH" : "POST";
      const payload = {
        ...form,
        preco:          Number(form.preco),
        custo:          form.custo ? Number(form.custo) : null,
        estoque:        Number(form.estoque),
        estoqueMin:     Number(form.estoqueMin),
        estoqueMax:     form.estoqueMax ? Number(form.estoqueMax) : null,
        grupoProdutoId: form.grupoProdutoId || null,
      };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Produto atualizado!" : "Produto cadastrado!");
      setModalOpen(false);
      fetchProdutos();
    } catch { toast.error("Erro ao salvar produto"); }
    finally { setSaving(false); }
  }

  const totalBaixo = produtos.filter(p => p.tipo !== "SERVICO" && p.estoqueMin > 0 && p.estoque <= p.estoqueMin).length;

  return (
    <div>
      <PageHeader
        title="Produtos e Serviços"
        description={`${produtos.length} itens cadastrados`}
        actions={<Button onClick={openNew}><Plus size={16} /> Adicionar</Button>}
      />

      {totalBaixo > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800 font-medium">{totalBaixo} produto(s) abaixo do estoque mínimo</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos os tipos</option>
          <option value="PRODUTO">Com estoque</option>
          <option value="MEDICAMENTO">Medicamentos</option>
          <option value="SERVICO">Serviços</option>
        </select>
        <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos os grupos</option>
          {grupos.map(g => (
            <optgroup key={g.id} label={g.nome}>
              <option value={g.id}>{g.nome} (todos)</option>
              {g.filhos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Código</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preço de venda</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Custo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estoque</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : produtos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                <Package size={32} className="mx-auto mb-2 opacity-40" /><p>Nenhum produto encontrado</p>
              </td></tr>
            ) : produtos.map(p => {
              const temEstoque = p.tipo !== "SERVICO";
              const baixo = temEstoque && p.estoqueMin > 0 && p.estoque <= p.estoqueMin;
              return (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${baixo ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 text-sm">{p.nome}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.grupoProduto ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: p.grupoProduto.cor + "20", color: p.grupoProduto.cor }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.grupoProduto.cor }} />
                        {p.grupoProduto.nome}
                      </span>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.codigo ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {p.preco > 0 ? formatCurrency(p.preco) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {p.custo ? formatCurrency(p.custo) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {temEstoque ? (
                      <span className={`text-sm font-semibold ${baixo ? "text-amber-600" : "text-gray-900"}`}>
                        {p.estoque} {p.unidade}
                        {baixo && <AlertTriangle size={13} className="inline ml-1 text-amber-500" />}
                      </span>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(p)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? "Editar produto" : "Novo produto"} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </div>
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            <option value="PRODUTO">Produto</option>
            <option value="MEDICAMENTO">Medicamento</option>
            <option value="SERVICO">Serviço</option>
          </Select>
          <Input label="Código" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="SKU / código de barras" />

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
            <select value={form.grupoProdutoId} onChange={e => setForm({ ...form, grupoProdutoId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">— Sem grupo —</option>
              {grupoOpcoes.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>

          <Input label="Preço de venda *" type="number" step="0.01" value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} />
          <Input label="Custo" type="number" step="0.01" value={form.custo} onChange={e => setForm({ ...form, custo: e.target.value })} />
          {form.tipo !== "SERVICO" && (
            <>
              <Input label="Estoque atual" type="number" value={form.estoque} onChange={e => setForm({ ...form, estoque: e.target.value })} />
              <Input label="Estoque mínimo" type="number" value={form.estoqueMin} onChange={e => setForm({ ...form, estoqueMin: e.target.value })} />
              <Input label="Estoque máximo" type="number" value={form.estoqueMax} onChange={e => setForm({ ...form, estoqueMax: e.target.value })} placeholder="opcional" />
            </>
          )}
          <Input label="Unidade" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} placeholder="un, cx, ml, kg..." />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
