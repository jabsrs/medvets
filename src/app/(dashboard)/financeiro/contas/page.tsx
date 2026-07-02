"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  Plus, Landmark, Wallet, PiggyBank, Banknote, CircleDollarSign,
  Edit, Trash2, Power,
} from "lucide-react";

type Conta = {
  id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  numero: string | null;
  tipo: string;
  saldoInicial: number;
  cor: string;
  ativo: boolean;
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  qtdLancamentos: number;
};

const TIPOS = [
  { value: "CORRENTE", label: "Conta corrente", icon: Landmark },
  { value: "POUPANCA", label: "Poupança",       icon: PiggyBank },
  { value: "CAIXA",    label: "Caixa / Loja",   icon: Banknote },
  { value: "CARTEIRA", label: "Carteira",       icon: Wallet },
  { value: "OUTRO",    label: "Outro",          icon: CircleDollarSign },
];
const TIPO_ICON: Record<string, React.ElementType> = Object.fromEntries(TIPOS.map(t => [t.value, t.icon]));
const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map(t => [t.value, t.label]));

const CORES = ["#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#EC4899", "#14B8A6", "#64748B"];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const emptyForm = {
  nome: "", banco: "", agencia: "", numero: "", tipo: "CORRENTE", saldoInicial: "", cor: "#0EA5E9",
};

export default function ContasBancariasPage() {
  const [contas, setContas]   = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/contas-bancarias?all=1");
    setContas(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setModal(true);
  }
  function openEdit(c: Conta) {
    setEditId(c.id);
    setForm({
      nome: c.nome, banco: c.banco ?? "", agencia: c.agencia ?? "", numero: c.numero ?? "",
      tipo: c.tipo, saldoInicial: String(c.saldoInicial), cor: c.cor,
    });
    setModal(true);
  }

  async function save() {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const url    = editId ? `/api/contas-bancarias/${editId}` : "/api/contas-bancarias";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, saldoInicial: form.saldoInicial || 0 }),
      });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Conta atualizada" : "Conta criada");
      setModal(false);
      fetch_();
    } catch {
      toast.error("Erro ao salvar conta");
    } finally { setSaving(false); }
  }

  async function toggleAtivo(c: Conta) {
    await fetch(`/api/contas-bancarias/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !c.ativo }),
    });
    fetch_();
  }

  async function excluir(c: Conta) {
    if (!confirm(`Excluir a conta "${c.nome}"?`)) return;
    const res = await fetch(`/api/contas-bancarias/${c.id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); toast.error(e.error); return; }
    toast.success("Conta excluída");
    fetch_();
  }

  const saldoTotal = contas.filter(c => c.ativo).reduce((s, c) => s + c.saldoAtual, 0);

  return (
    <div>
      <PageHeader
        title="Contas bancárias"
        description="Contas, caixas e carteiras da clínica"
        actions={<Button onClick={openNew}><Plus size={16} /> Nova conta</Button>}
      />

      {/* Saldo consolidado */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-xl p-5 mb-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Saldo consolidado (contas ativas)</p>
        <p className="text-3xl font-bold mt-1">{fmt(saldoTotal)}</p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : contas.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Landmark size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma conta cadastrada</p>
          <button onClick={openNew} className="mt-3 text-sm text-teal-600 hover:underline">
            + Cadastrar primeira conta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contas.map(c => {
            const Icon = TIPO_ICON[c.tipo] ?? CircleDollarSign;
            return (
              <div key={c.id}
                className={`bg-white rounded-xl border p-5 transition hover:shadow-sm ${
                  c.ativo ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: c.cor + "20" }}>
                      <Icon size={20} style={{ color: c.cor }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.nome}</p>
                      <p className="text-xs text-gray-400">{TIPO_LABEL[c.tipo]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleAtivo(c)} title={c.ativo ? "Desativar" : "Ativar"}
                      className={`p-1.5 rounded-lg transition ${c.ativo ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50" : "text-green-500 hover:bg-green-50"}`}>
                      <Power size={15} />
                    </button>
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => excluir(c)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {(c.banco || c.agencia || c.numero) && (
                  <p className="text-xs text-gray-400 mb-3">
                    {[c.banco, c.agencia && `Ag. ${c.agencia}`, c.numero && `C/C ${c.numero}`]
                      .filter(Boolean).join(" · ")}
                  </p>
                )}

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400">Saldo atual</p>
                  <p className={`text-2xl font-bold ${c.saldoAtual < 0 ? "text-red-600" : "text-gray-900"}`}>
                    {fmt(c.saldoAtual)}
                  </p>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-green-600">↑ {fmt(c.totalEntradas)}</span>
                    <span className="text-red-500">↓ {fmt(c.totalSaidas)}</span>
                    <span className="text-gray-400">{c.qtdLancamentos} lanç.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "Editar conta" : "Nova conta"} size="sm">
        <div className="space-y-4">
          <Input label="Nome da conta *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Itaú Principal, Caixa da loja" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Banco" value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} placeholder="Itaú" />
            <Input label="Agência" value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} />
            <Input label="Conta" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
          </div>
          <Input label="Saldo inicial (R$)" type="number" step="0.01" value={form.saldoInicial}
            onChange={e => setForm({ ...form, saldoInicial: e.target.value })}
            placeholder="0,00" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cor</label>
            <div className="flex gap-2">
              {CORES.map(cor => (
                <button key={cor} type="button" onClick={() => setForm({ ...form, cor })}
                  className={`w-7 h-7 rounded-full transition ${form.cor === cor ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                  style={{ backgroundColor: cor }} />
              ))}
            </div>
          </div>
          {!editId && (
            <p className="text-xs text-gray-400">
              O saldo atual é calculado a partir do saldo inicial mais os lançamentos pagos vinculados a esta conta.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
