"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Tag } from "lucide-react";

type Grupo = {
  id: string;
  nome: string;
  cor: string;
  ativo: boolean;
  ordem: number;
  parentId: string | null;
  filhos: Grupo[];
  _count: { produtos: number };
};

const emptyForm = { nome: "", cor: "#6B7280", parentId: "", ordem: "0" };

export default function GruposPage() {
  const [grupos, setGrupos]   = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showInativos, setShowInativos] = useState(false);

  // Modal
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Grupo | null>(null);
  const [form, setForm]       = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving]   = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/grupos-produto?all=1");
    const data: Grupo[] = await res.json();
    setGrupos(data);
    // Expande todos por padrão
    setExpanded(new Set(data.filter(g => g.filhos.length > 0).map(g => g.id)));
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  function abrirNovo(parentId?: string) {
    setEditing(null);
    setForm({ ...emptyForm, parentId: parentId ?? "" });
    setModal(true);
  }

  function abrirEditar(g: Grupo) {
    setEditing(g);
    setForm({ nome: g.nome, cor: g.cor, parentId: g.parentId ?? "", ordem: String(g.ordem) });
    setModal(true);
  }

  async function save() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        nome:     form.nome.trim(),
        cor:      form.cor,
        parentId: form.parentId || null,
        ordem:    Number(form.ordem),
      };
      if (editing) {
        await fetch(`/api/grupos-produto/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Grupo atualizado");
      } else {
        const res = await fetch("/api/grupos-produto", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        toast.success("Grupo criado");
      }
      setModal(false); fetch_();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function toggleAtivo(g: Grupo) {
    await fetch(`/api/grupos-produto/${g.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !g.ativo }),
    });
    toast.success(g.ativo ? "Grupo inativado" : "Grupo reativado");
    fetch_();
  }

  async function excluir(g: Grupo) {
    if (!confirm(`Excluir "${g.nome}"?`)) return;
    const res = await fetch(`/api/grupos-produto/${g.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Grupo excluído"); fetch_(); }
    else { const e = await res.json(); toast.error(e.error ?? "Não foi possível excluir"); }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const listaFiltrada = showInativos ? grupos : grupos.filter(g => g.ativo);

  const totalGrupos  = grupos.length;
  const totalSubGrupos = grupos.reduce((s, g) => s + g.filhos.length, 0);
  const totalProdutos  = grupos.reduce((s, g) => s + g._count.produtos + g.filhos.reduce((ss, f) => ss + f._count.produtos, 0), 0);

  return (
    <div>
      <PageHeader
        title="Grupos de Produtos"
        description="Hierarquia de categorias para produtos e serviços"
        actions={<Button onClick={() => abrirNovo()}><Plus size={16} /> Novo grupo</Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Grupos", valor: totalGrupos },
          { label: "Subgrupos", valor: totalSubGrupos },
          { label: "Produtos vinculados", valor: totalProdutos },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={showInativos} onChange={e => setShowInativos(e.target.checked)}
            className="rounded text-teal-600" />
          Mostrar inativos
        </label>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : listaFiltrada.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Tag size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum grupo cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listaFiltrada.map(grupo => {
            const isOpen = expanded.has(grupo.id);
            const filhosVisiveis = showInativos ? grupo.filhos : grupo.filhos.filter(f => f.ativo);

            return (
              <div key={grupo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header do grupo pai */}
                <div className={`flex items-center gap-3 px-4 py-3 ${!grupo.ativo ? "opacity-50" : ""}`}>
                  {filhosVisiveis.length > 0 ? (
                    <button onClick={() => toggleExpand(grupo.id)}
                      className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  ) : (
                    <div className="w-4 flex-shrink-0" />
                  )}

                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: grupo.cor }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{grupo.nome}</span>
                      {!grupo.ativo && <Badge variant="default">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {filhosVisiveis.length} subgrupo(s) · {grupo._count.produtos} produto(s) direto(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirNovo(grupo.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                      <Plus size={12} /> Subgrupo
                    </button>
                    <button onClick={() => abrirEditar(grupo)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleAtivo(grupo)}
                      className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                      title={grupo.ativo ? "Inativar" : "Reativar"}>
                      {grupo.ativo ? "⏸" : "▶"}
                    </button>
                    <button onClick={() => excluir(grupo)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Subgrupos */}
                {isOpen && filhosVisiveis.length > 0 && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {filhosVisiveis.map(filho => (
                      <div key={filho.id}
                        className={`flex items-center gap-3 pl-10 pr-4 py-2.5 bg-gray-50/50 ${!filho.ativo ? "opacity-50" : ""}`}>
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: filho.cor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{filho.nome}</span>
                            {!filho.ativo && <Badge variant="default">Inativo</Badge>}
                          </div>
                          <p className="text-xs text-gray-400">{filho._count.produtos} produto(s)</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => abrirEditar(filho)}
                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => toggleAtivo(filho)}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                            title={filho.ativo ? "Inativar" : "Reativar"}>
                            {filho.ativo ? "⏸" : "▶"}
                          </button>
                          <button onClick={() => excluir(filho)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? "Editar grupo" : "Novo grupo"} size="sm">
        <div className="space-y-4">
          <Input label="Nome *" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Vacinas, Farmácia..." />

          {/* Pai — só mostra quando não está editando um filho e não tem parentId fixo */}
          {(!editing || editing.parentId !== null) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupo pai (opcional)
              </label>
              <select
                value={form.parentId}
                onChange={e => setForm({ ...form, parentId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">— Nenhum (grupo principal) —</option>
                {grupos.filter(g => !editing || g.id !== editing.id).map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.cor}
                  onChange={e => setForm({ ...form, cor: e.target.value })}
                  className="h-9 w-16 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <span className="text-sm text-gray-500 font-mono">{form.cor}</span>
              </div>
            </div>
            <div className="w-24">
              <Input label="Ordem" type="number" min="0" value={form.ordem}
                onChange={e => setForm({ ...form, ordem: e.target.value })} />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: form.cor }} />
            <span className="text-sm font-medium text-gray-700">{form.nome || "Preview do grupo"}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
