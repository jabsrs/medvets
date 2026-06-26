"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Scissors } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Servico = {
  id: string;
  nome: string;
  tipo: string;
  preco: number;
  custo?: number;
  descricao?: string;
  duracaoMin?: number;
  ativo: boolean;
  categoria?: { id: string; nome: string };
};

type Categoria = { id: string; nome: string };

const CATEGORIAS_PADRAO = [
  "Consulta",
  "Cirurgia",
  "Procedimento",
  "Higiene e Estética",
  "Exame",
  "Vacina",
  "Internação",
  "Outro",
];

const categoriaIcon: Record<string, string> = {
  "Consulta": "🩺",
  "Cirurgia": "🔪",
  "Procedimento": "💉",
  "Higiene e Estética": "✂️",
  "Exame": "🔬",
  "Vacina": "💊",
  "Internação": "🛏️",
  "Outro": "📋",
};

const emptyForm = {
  nome: "",
  categoriaId: "",
  novaCat: "",
  preco: "",
  custo: "",
  duracaoMin: "30",
  descricao: "",
};

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [catFiltro, setCatFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [usarNovaCat, setUsarNovaCat] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      fetch("/api/servicos?" + new URLSearchParams({ ...(q && { q }), ...(catFiltro && { categoriaId: catFiltro }) })),
      fetch("/api/categorias?tipo=SERVICO"),
    ]);
    const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
    setServicos(sData);
    setCategorias(cData);
    setLoading(false);
  }, [q, catFiltro]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  function openNew() {
    setEditId(null);
    setForm({ ...emptyForm });
    setUsarNovaCat(false);
    setModalOpen(true);
  }

  function openEdit(s: Servico) {
    setEditId(s.id);
    setForm({
      nome: s.nome,
      categoriaId: s.categoria?.id ?? "",
      novaCat: "",
      preco: String(s.preco),
      custo: String(s.custo ?? ""),
      duracaoMin: String(s.duracaoMin ?? "30"),
      descricao: s.descricao ?? "",
    });
    setUsarNovaCat(false);
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome || !form.preco) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      // Se nova categoria, criar antes
      let categoriaId = form.categoriaId;
      if (usarNovaCat && form.novaCat) {
        const cRes = await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.novaCat, tipo: "SERVICO" }),
        });
        const cat = await cRes.json();
        categoriaId = cat.id;
      }

      const url = editId ? `/api/servicos/${editId}` : "/api/servicos";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome,
          tipo: "SERVICO",
          categoriaId: categoriaId || null,
          preco: Number(form.preco),
          custo: form.custo ? Number(form.custo) : null,
          duracaoMin: form.duracaoMin ? Number(form.duracaoMin) : null,
          descricao: form.descricao || null,
          estoque: 9999,
          estoqueMin: 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Serviço atualizado!" : "Serviço cadastrado!");
      setModalOpen(false);
      fetchData();
    } catch {
      toast.error("Erro ao salvar serviço");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(s: Servico) {
    await fetch(`/api/servicos/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !s.ativo }),
    });
    toast.success(s.ativo ? "Serviço desativado" : "Serviço ativado");
    fetchData();
  }

  // Agrupar por categoria
  const grupos = servicos.reduce<Record<string, Servico[]>>((acc, s) => {
    const cat = s.categoria?.nome ?? "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const totalAtivos = servicos.filter((s) => s.ativo).length;

  return (
    <div>
      <PageHeader
        title="Serviços & Procedimentos"
        description={`${totalAtivos} serviços ativos cadastrados`}
        actions={
          <Button onClick={openNew}>
            <Plus size={16} /> Novo serviço
          </Button>
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar serviço..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={catFiltro}
          onChange={(e) => setCatFiltro(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Lista agrupada por categoria */}
      {loading ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Carregando...</div>
      ) : servicos.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          <Scissors size={40} className="mx-auto mb-2 opacity-40" />
          <p className="font-medium">Nenhum serviço cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo serviço" para começar</p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
            {CATEGORIAS_PADRAO.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setForm({ ...emptyForm, novaCat: cat });
                  setUsarNovaCat(true);
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition text-sm text-gray-600"
              >
                <span className="text-xl">{categoriaIcon[cat]}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                <span className="text-lg">{categoriaIcon[cat] ?? "📋"}</span>
                {cat}
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-normal normal-case">
                  {items.length}
                </span>
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duração</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preço</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((s) => (
                      <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${!s.ativo ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {s.descricao ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {s.duracaoMin ? `${s.duracaoMin} min` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(s.preco)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={s.ativo ? "success" : "default"}>
                            {s.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => openEdit(s)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => toggleAtivo(s)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title={s.ativo ? "Desativar" : "Ativar"}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar serviço" : "Novo serviço"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome do serviço *"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Consulta clínica, Castração, Banho simples..."
          />

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            {!usarNovaCat ? (
              <div className="flex gap-2">
                <select
                  value={form.categoriaId}
                  onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione uma categoria...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setUsarNovaCat(true)}
                  className="text-sm text-emerald-600 hover:underline whitespace-nowrap px-2"
                >
                  + Nova
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={form.novaCat}
                  onChange={(e) => setForm({ ...form, novaCat: e.target.value })}
                  placeholder="Nome da nova categoria..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setUsarNovaCat(false)}
                  className="text-sm text-gray-500 hover:underline whitespace-nowrap px-2"
                >
                  Cancelar
                </button>
              </div>
            )}
            {!usarNovaCat && categorias.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Nenhuma categoria. Use categorias sugeridas:
                <span className="flex flex-wrap gap-1 mt-1">
                  {CATEGORIAS_PADRAO.map((c) => (
                    <button key={c} type="button" onClick={() => { setUsarNovaCat(true); setForm({ ...form, novaCat: c }); }}
                      className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-0.5 rounded-full transition">
                      {categoriaIcon[c]} {c}
                    </button>
                  ))}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço (R$) *"
              type="number"
              step="0.01"
              min="0"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: e.target.value })}
              placeholder="0,00"
            />
            <Input
              label="Custo (R$)"
              type="number"
              step="0.01"
              min="0"
              value={form.custo}
              onChange={(e) => setForm({ ...form, custo: e.target.value })}
              placeholder="0,00"
            />
          </div>

          <Input
            label="Duração estimada (minutos)"
            type="number"
            min="5"
            step="5"
            value={form.duracaoMin}
            onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
            placeholder="30"
          />

          <Textarea
            label="Descrição"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Detalhes do serviço, o que está incluído..."
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
