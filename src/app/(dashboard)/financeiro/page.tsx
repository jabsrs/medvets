"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Conta = { id: string; nome: string; cor: string };
type Lancamento = {
  id: string; tipo: string; descricao: string; valor: number;
  vencimento: string; pagamento?: string; status: string; categoria?: string;
  conta?: Conta | null;
};

const emptyForm = { tipo: "RECEITA", descricao: "", valor: "", vencimento: "", categoria: "", obs: "", contaId: "" };

const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
const em7dias = new Date(hoje); em7dias.setDate(em7dias.getDate() + 7);

function classificarVencimento(vencimento: string, status: string) {
  if (status === "PAGO") return null;
  const d = new Date(vencimento); d.setHours(0, 0, 0, 0);
  if (d < hoje) return "vencido";
  if (d.getTime() === hoje.getTime()) return "hoje";
  if (d <= em7dias) return "em_breve";
  return null;
}

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [aba, setAba] = useState<"todos" | "receitas" | "despesas">("todos");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroConta, setFiltroConta] = useState("");
  const [contas, setContas] = useState<Conta[]>([]);

  const fetchLancamentos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroConta) params.set("contaId", filtroConta);
    const res = await fetch(`/api/lancamentos?${params}`);
    const data = await res.json();
    setLancamentos(data);
    setLoading(false);
  }, [filtroConta]);

  useEffect(() => { fetchLancamentos(); }, [fetchLancamentos]);

  useEffect(() => {
    fetch("/api/contas-bancarias").then(r => r.json()).then(setContas);
  }, []);

  async function save() {
    if (!form.descricao || !form.valor || !form.vencimento) {
      toast.error("Descrição, valor e vencimento são obrigatórios"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/lancamentos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valor: Number(form.valor), contaId: form.contaId || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lançamento criado!");
      setModalOpen(false); fetchLancamentos();
    } catch { toast.error("Erro ao salvar lançamento"); }
    finally { setSaving(false); }
  }

  async function pagar(id: string) {
    await fetch(`/api/lancamentos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAGO", pagamento: new Date().toISOString() }),
    });
    toast.success("Marcado como pago!");
    fetchLancamentos();
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar este lançamento?")) return;
    await fetch(`/api/lancamentos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO" }),
    });
    toast.success("Lançamento cancelado");
    fetchLancamentos();
  }

  // KPIs
  const receitasPagas = lancamentos.filter(l => l.tipo === "RECEITA" && l.status === "PAGO").reduce((s, l) => s + l.valor, 0);
  const despesasPagas = lancamentos.filter(l => l.tipo === "DESPESA" && l.status === "PAGO").reduce((s, l) => s + l.valor, 0);
  const saldo = receitasPagas - despesasPagas;
  const aReceber = lancamentos.filter(l => l.tipo === "RECEITA" && l.status === "PENDENTE").reduce((s, l) => s + l.valor, 0);
  const aPagar = lancamentos.filter(l => l.tipo === "DESPESA" && l.status === "PENDENTE").reduce((s, l) => s + l.valor, 0);

  // Alertas
  const vencidos = lancamentos.filter(l => classificarVencimento(l.vencimento, l.status) === "vencido");
  const venceHoje = lancamentos.filter(l => classificarVencimento(l.vencimento, l.status) === "hoje");
  const venceEmBreve = lancamentos.filter(l => classificarVencimento(l.vencimento, l.status) === "em_breve");

  // Filtro
  const listagem = lancamentos.filter(l => {
    if (aba === "receitas" && l.tipo !== "RECEITA") return false;
    if (aba === "despesas" && l.tipo !== "DESPESA") return false;
    if (filtroStatus && l.status !== filtroStatus) return false;
    return true;
  });

  const statusBadge: Record<string, "success" | "warning" | "danger"> = {
    PAGO: "success", PENDENTE: "warning", CANCELADO: "danger",
  };
  const statusLabel: Record<string, string> = { PAGO: "Pago", PENDENTE: "Pendente", CANCELADO: "Cancelado" };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Controle de receitas e despesas"
        actions={<Button onClick={() => { setForm({ ...emptyForm }); setModalOpen(true); }}><Plus size={16} /> Novo lançamento</Button>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Receitas recebidas</p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(receitasPagas)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Despesas pagas</p>
            <TrendingDown size={16} className="text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(despesasPagas)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Saldo atual</p>
            <DollarSign size={16} className={saldo >= 0 ? "text-emerald-500" : "text-red-500"} />
          </div>
          <p className={`text-xl font-bold ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCurrency(saldo)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-emerald-600">A receber</p>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(aReceber)}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-red-600">A pagar</p>
            <TrendingDown size={16} className="text-red-400" />
          </div>
          <p className="text-xl font-bold text-red-700">{formatCurrency(aPagar)}</p>
        </div>
      </div>

      {/* Alertas de vencimento */}
      {(vencidos.length > 0 || venceHoje.length > 0 || venceEmBreve.length > 0) && (
        <div className="space-y-2 mb-6">
          {vencidos.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-red-700">{vencidos.length} lançamento(s) vencido(s): </span>
                <span className="text-red-600">{vencidos.map(v => `${v.descricao} (${formatCurrency(v.valor)})`).join(", ")}</span>
              </div>
            </div>
          )}
          {venceHoje.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock size={18} className="text-amber-500 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-amber-700">{venceHoje.length} vence hoje: </span>
                <span className="text-amber-600">{venceHoje.map(v => `${v.descricao} (${formatCurrency(v.valor)})`).join(", ")}</span>
              </div>
            </div>
          )}
          {venceEmBreve.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Clock size={18} className="text-blue-400 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-blue-700">{venceEmBreve.length} vence(m) nos próximos 7 dias</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Abas + filtro */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([["todos", "Todos"], ["receitas", "A Receber"], ["despesas", "A Pagar"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setAba(val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                aba === val ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {contas.length > 0 && (
            <select value={filtroConta} onChange={e => setFiltroConta(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="">Todas as contas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          )}
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Tabela */}
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
            ) : listagem.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum lançamento encontrado</td></tr>
            ) : listagem.map(l => {
              const alerta = classificarVencimento(l.vencimento, l.status);
              return (
                <tr key={l.id} className={`hover:bg-gray-50 transition-colors ${alerta === "vencido" ? "bg-red-50/40" : alerta === "hoje" ? "bg-amber-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {alerta === "vencido" && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                      {alerta === "hoje" && <Clock size={14} className="text-amber-500 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-gray-900">{l.descricao}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {l.categoria && <span className="text-xs text-gray-400">{l.categoria}</span>}
                          {l.conta && (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: l.conta.cor + "20", color: l.conta.cor }}>
                              {l.conta.nome}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
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
                    <div className="flex items-center gap-2 justify-end">
                      {l.status === "PENDENTE" && (
                        <Button size="sm" variant="secondary" onClick={() => pagar(l.id)}>Marcar pago</Button>
                      )}
                      {l.status === "PENDENTE" && (
                        <button onClick={() => cancelar(l.id)} className="text-xs text-gray-400 hover:text-red-500 transition">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo lançamento" size="md">
        <div className="space-y-4">
          <Select label="Tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            <option value="RECEITA">↑ Receita (a receber)</option>
            <option value="DESPESA">↓ Despesa (a pagar)</option>
          </Select>
          <Input label="Descrição *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Consulta — Tutor Silva, Aluguel, Fornecedor..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor *" type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
            <Input label="Vencimento *" type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} />
          </div>
          <Input label="Categoria" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Consultas, Aluguel, Medicamentos, Salários..." />
          {contas.length > 0 && (
            <Select label="Conta bancária" value={form.contaId} onChange={e => setForm({ ...form, contaId: e.target.value })}>
              <option value="">Não vinculada</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          )}
          <Textarea label="Observações" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} rows={2} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
