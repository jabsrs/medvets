"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Lancamento = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pagamento?: string;
  status: string;
  categoria?: string;
};

const emptyForm = {
  tipo: "RECEITA", descricao: "", valor: "", vencimento: "", categoria: "", obs: "",
};

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const fetchLancamentos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroStatus) params.set("status", filtroStatus);
    const res = await fetch(`/api/lancamentos?${params}`);
    const data = await res.json();
    setLancamentos(data);
    setLoading(false);
  }, [filtroTipo, filtroStatus]);

  useEffect(() => { fetchLancamentos(); }, [fetchLancamentos]);

  async function save() {
    if (!form.descricao || !form.valor || !form.vencimento) {
      toast.error("Descrição, valor e vencimento são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valor: Number(form.valor) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lançamento criado!");
      setModalOpen(false);
      fetchLancamentos();
    } catch { toast.error("Erro ao salvar lançamento"); }
    finally { setSaving(false); }
  }

  async function pagar(id: string) {
    await fetch(`/api/lancamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAGO", pagamento: new Date().toISOString() }),
    });
    toast.success("Marcado como pago!");
    fetchLancamentos();
  }

  const receitas = lancamentos.filter((l) => l.tipo === "RECEITA");
  const despesas = lancamentos.filter((l) => l.tipo === "DESPESA");
  const totalReceitas = receitas.filter((l) => l.status === "PAGO").reduce((s, l) => s + l.valor, 0);
  const totalDespesas = despesas.filter((l) => l.status === "PAGO").reduce((s, l) => s + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const statusBadge: Record<string, "success" | "warning" | "danger"> = {
    PAGO: "success", PENDENTE: "warning", CANCELADO: "danger",
  };
  const statusLabel: Record<string, string> = { PAGO: "Pago", PENDENTE: "Pendente", CANCELADO: "Cancelado" };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle de receitas e despesas"
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Novo lançamento</Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Receitas pagas</p>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Despesas pagas</p>
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Saldo</p>
            <DollarSign size={18} className={saldo >= 0 ? "text-emerald-500" : "text-red-500"} />
          </div>
          <p className={`text-2xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos os tipos</option>
          <option value="RECEITA">Receitas</option>
          <option value="DESPESA">Despesas</option>
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : lancamentos.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum lançamento encontrado</td></tr>
            ) : (
              lancamentos.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{l.descricao}</p>
                    {l.categoria && <p className="text-xs text-gray-400">{l.categoria}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={l.tipo === "RECEITA" ? "success" : "danger"}>
                      {l.tipo === "RECEITA" ? "↑ Receita" : "↓ Despesa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(l.vencimento)}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={l.tipo === "RECEITA" ? "text-emerald-700" : "text-red-700"}>
                      {formatCurrency(l.valor)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadge[l.status]}>{statusLabel[l.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === "PENDENTE" && (
                      <Button size="sm" variant="secondary" onClick={() => pagar(l.id)}>Marcar pago</Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo lançamento" size="md">
        <div className="space-y-4">
          <Select label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="RECEITA">Receita</option>
            <option value="DESPESA">Despesa</option>
          </Select>
          <Input label="Descrição *" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor *" type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            <Input label="Vencimento *" type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
          </div>
          <Input label="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Consultas, Aluguel, Compras..." />
          <Textarea label="Observações" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
