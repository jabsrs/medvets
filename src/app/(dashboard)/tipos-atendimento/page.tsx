"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Tipo = { id: string; nome: string; cor: string; duracaoMin: number; ativo: boolean };
const emptyForm = { nome: "", cor: "#0d9488", duracaoMin: "30" };

export default function TiposAtendimentoPage() {
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  async function fetchTipos() {
    setLoading(true);
    const res = await fetch("/api/tipos-atendimento");
    setTipos(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchTipos(); }, []);

  function openNew() { setEditId(null); setForm({ ...emptyForm }); setModalOpen(true); }
  function openEdit(t: Tipo) {
    setEditId(t.id);
    setForm({ nome: t.nome, cor: t.cor, duracaoMin: String(t.duracaoMin) });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const body = { nome: form.nome, cor: form.cor, duracaoMin: Number(form.duracaoMin) };
      const res = editId
        ? await fetch(`/api/tipos-atendimento/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/tipos-atendimento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Tipo atualizado!" : "Tipo criado!");
      setModalOpen(false);
      fetchTipos();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function remover(id: string) {
    if (!confirm("Remover este tipo de atendimento?")) return;
    await fetch(`/api/tipos-atendimento/${id}`, { method: "DELETE" });
    toast.success("Removido");
    fetchTipos();
  }

  return (
    <div>
      <PageHeader
        title="Tipos de atendimento"
        description="Configure os tipos de consulta e seus tempos padrão"
        actions={<Button onClick={openNew}><Plus size={16} /> Novo tipo</Button>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duração padrão</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : tipos.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhum tipo cadastrado</td></tr>
            ) : tipos.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-block w-5 h-5 rounded-full border border-gray-200" style={{ background: t.cor }} />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{t.nome}</td>
                <td className="px-4 py-3 text-gray-600">{t.duracaoMin} min</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remover(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Editar tipo" : "Novo tipo de atendimento"} size="sm">
        <div className="space-y-4">
          <Input label="Nome *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Consulta, Vacinação, Retorno..." />
          <Input label="Duração padrão (min)" type="number" value={form.duracaoMin} onChange={e => setForm({ ...form, duracaoMin: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Cor na agenda</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.cor} onChange={e => setForm({ ...form, cor: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
              <span className="text-sm text-gray-500">{form.cor}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
