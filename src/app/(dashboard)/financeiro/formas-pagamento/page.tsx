"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Metodo = { id: string; nome: string; tipo: string; ativo: boolean; ordem: number };

const TIPO_ICONES: Record<string, string> = {
  DINHEIRO: "💵", PIX: "⚡", CARTAO_CREDITO: "💳", CARTAO_DEBITO: "💳",
  BOLETO: "🧾", CHEQUE: "📝", CONVENIO: "🤝", OUTRO: "💰",
};
const TIPO_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro", PIX: "Pix", CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito", BOLETO: "Boleto", CHEQUE: "Cheque",
  CONVENIO: "Convênio", OUTRO: "Outro",
};
const TIPOS = Object.entries(TIPO_LABELS);

const emptyForm = { nome: "", tipo: "OUTRO" };

export default function FormasPagamentoPage() {
  const [metodos, setMetodos]     = useState<Metodo[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState<Metodo | null>(null);
  const [form, setForm]           = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving]       = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/formas-pagamento?all=1");
    setMetodos(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  function abrirNovo() { setEditing(null); setForm({ ...emptyForm }); setModal(true); }
  function abrirEditar(m: Metodo) { setEditing(m); setForm({ nome: m.nome, tipo: m.tipo }); setModal(true); }

  async function save() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/formas-pagamento/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: form.nome, tipo: form.tipo }),
        });
        toast.success("Forma de pagamento atualizada");
      } else {
        const res = await fetch("/api/formas-pagamento", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        toast.success("Forma de pagamento criada");
      }
      setModal(false); fetch_();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function toggleAtivo(m: Metodo) {
    await fetch(`/api/formas-pagamento/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !m.ativo }),
    });
    toast.success(m.ativo ? "Desativada" : "Ativada");
    fetch_();
  }

  async function excluir(m: Metodo) {
    if (!confirm(`Excluir "${m.nome}"?`)) return;
    const res = await fetch(`/api/formas-pagamento/${m.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Excluída"); fetch_(); }
    else toast.error("Não foi possível excluir");
  }

  const ativas   = metodos.filter(m => m.ativo);
  const inativas = metodos.filter(m => !m.ativo);

  return (
    <div>
      <PageHeader
        title="Formas de Pagamento"
        description="Configure os meios de pagamento aceitos na clínica"
        actions={<Button onClick={abrirNovo}><Plus size={16} /> Nova forma</Button>}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {/* Ativas */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Ativas ({ativas.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ativas.map(m => (
                <div key={m.id}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3 hover:border-teal-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{TIPO_ICONES[m.tipo] ?? "💰"}</span>
                    <div>
                      <p className="font-medium text-gray-900">{m.nome}</p>
                      <p className="text-xs text-gray-400">{TIPO_LABELS[m.tipo] ?? m.tipo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEditar(m)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleAtivo(m)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition">
                      Ativa
                    </button>
                    <button onClick={() => excluir(m)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inativas */}
          {inativas.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Inativas ({inativas.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inativas.map(m => (
                  <div key={m.id}
                    className="bg-gray-50 rounded-xl border border-dashed border-gray-200 px-4 py-3 flex items-center justify-between gap-3 opacity-60">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl grayscale">{TIPO_ICONES[m.tipo] ?? "💰"}</span>
                      <div>
                        <p className="font-medium text-gray-500">{m.nome}</p>
                        <p className="text-xs text-gray-400">{TIPO_LABELS[m.tipo] ?? m.tipo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleAtivo(m)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-500 hover:bg-teal-50 hover:text-teal-700 transition">
                        Inativa
                      </button>
                      <button onClick={() => excluir(m)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? "Editar forma de pagamento" : "Nova forma de pagamento"} size="sm">
        <div className="space-y-4">
          <Input label="Nome *" value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Pix, Boleto, Dinheiro..." />
          <Select label="Tipo" value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map(([val, label]) => (
              <option key={val} value={val}>{TIPO_ICONES[val]} {label}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
