"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, AlertTriangle, Clock, CheckCircle2, TrendingDown, Search, Building2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Fornecedor = { id: string; nome: string } | null;
type Compra = { fornecedor: Fornecedor } | null;
type Lancamento = {
  id: string; descricao: string; valor: number; vencimento: string;
  pagamento?: string; status: string; categoria?: string;
  formaPagamento?: string; parcelaNum?: number; totalParcelas?: number;
  compra?: Compra;
};

const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
const em7dias = new Date(hoje); em7dias.setDate(em7dias.getDate() + 7);

function alerta(l: Lancamento) {
  if (l.status !== "PENDENTE") return null;
  const d = new Date(l.vencimento); d.setHours(0, 0, 0, 0);
  if (d < hoje) return "vencido";
  if (d.getTime() === hoje.getTime()) return "hoje";
  if (d <= em7dias) return "em_breve";
  return null;
}

function mesAtual() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  return { de: `${y}-${m}-01`, ate: `${y}-${m}-${new Date(y, n.getMonth() + 1, 0).getDate()}` };
}

const emptyForm = { descricao: "", valor: "", vencimento: "", categoria: "", formaPagamento: "", obs: "" };

export default function ContasPagarPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("PENDENTE");
  const [busca, setBusca]             = useState("");
  const [mes, setMes]                 = useState<{ de: string; ate: string } | null>(null);
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving]           = useState(false);
  const [modalPagar, setModalPagar]   = useState<Lancamento | null>(null);
  const [dataPagto, setDataPagto]     = useState("");
  const [formaPagto, setFormaPagto]   = useState("Dinheiro");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ tipo: "DESPESA" });
    if (filtroStatus) params.set("status", filtroStatus);
    if (mes) { params.set("vencDe", mes.de); params.set("vencAte", mes.ate); }
    if (busca) params.set("q", busca);
    const res = await fetch(`/api/lancamentos?${params}`);
    setLancamentos(await res.json());
    setLoading(false);
  }, [filtroStatus, mes, busca]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function marcarPago() {
    if (!modalPagar) return;
    setSaving(true);
    try {
      await fetch(`/api/lancamentos/${modalPagar.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAGO",
          pagamento: dataPagto ? new Date(dataPagto + "T12:00:00").toISOString() : new Date().toISOString(),
          formaPagamento: formaPagto,
        }),
      });
      toast.success("Pagamento registrado!");
      setModalPagar(null); fetch_();
    } catch { toast.error("Erro ao registrar pagamento"); }
    finally { setSaving(false); }
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar este lançamento?")) return;
    await fetch(`/api/lancamentos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO" }),
    });
    toast.success("Cancelado"); fetch_();
  }

  async function salvarNova() {
    if (!form.descricao || !form.valor || !form.vencimento) {
      toast.error("Descrição, valor e vencimento são obrigatórios"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/lancamentos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tipo: "DESPESA", valor: Number(form.valor) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Conta a pagar criada!");
      setModal(false); fetch_();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  function abrirPagar(l: Lancamento) {
    setModalPagar(l);
    setDataPagto(new Date().toISOString().slice(0, 10));
    setFormaPagto("Dinheiro");
  }

  // KPIs sempre sem filtro de status
  const pendentes  = lancamentos.filter(l => l.status === "PENDENTE");
  const vencidos   = pendentes.filter(l => alerta(l) === "vencido");
  const vencem7    = pendentes.filter(l => alerta(l) === "em_breve" || alerta(l) === "hoje");
  const pagos      = lancamentos.filter(l => l.status === "PAGO");
  const totalPend  = pendentes.reduce((s, l) => s + l.valor, 0);
  const totalVenc  = vencidos.reduce((s, l) => s + l.valor, 0);
  const totalPago  = pagos.reduce((s, l) => s + l.valor, 0);

  const fornecedorDe = (l: Lancamento) => l.compra?.fornecedor?.nome ?? null;

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        description="Despesas pendentes, vencidas e pagas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMes(mes ? null : mesAtual())}>
              {mes ? "Todas as datas" : "Este mês"}
            </Button>
            <Button onClick={() => { setForm({ ...emptyForm }); setModal(true); }}>
              <Plus size={16} /> Nova conta
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">A pagar (pendente)</p>
            <TrendingDown size={16} className="text-red-400" />
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalPend)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendentes.length} conta(s)</p>
        </div>
        <div className={`rounded-xl border p-4 ${vencidos.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs ${vencidos.length > 0 ? "text-red-600" : "text-gray-500"}`}>Vencido</p>
            <AlertTriangle size={16} className={vencidos.length > 0 ? "text-red-500" : "text-gray-300"} />
          </div>
          <p className={`text-xl font-bold ${vencidos.length > 0 ? "text-red-700" : "text-gray-300"}`}>
            {formatCurrency(totalVenc)}
          </p>
          <p className={`text-xs mt-1 ${vencidos.length > 0 ? "text-red-500" : "text-gray-300"}`}>{vencidos.length} conta(s)</p>
        </div>
        <div className={`rounded-xl border p-4 ${vencem7.length > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs ${vencem7.length > 0 ? "text-amber-700" : "text-gray-500"}`}>Vence em 7 dias</p>
            <Clock size={16} className={vencem7.length > 0 ? "text-amber-500" : "text-gray-300"} />
          </div>
          <p className={`text-xl font-bold ${vencem7.length > 0 ? "text-amber-700" : "text-gray-300"}`}>
            {vencem7.length} conta(s)
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500">Pago</p>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPago)}</p>
          <p className="text-xs text-gray-400 mt-1">{pagos.length} conta(s)</p>
        </div>
      </div>

      {/* Alertas de urgência */}
      {vencidos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{vencidos.length} conta(s) vencida(s)</strong> totalizando{" "}
            <strong>{formatCurrency(totalVenc)}</strong> — regularize o quanto antes!
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["PENDENTE", "PAGO", "CANCELADO", ""] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroStatus === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {s === "" ? "Todos" : s === "PENDENTE" ? "Pendente" : s === "PAGO" ? "Pago" : "Cancelado"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-44">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetch_()}
            placeholder="Buscar descrição..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        {mes && (
          <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
            {new Date(mes.de + "T12:00:00").toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fornecedor</th>
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
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <CheckCircle2 size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Nenhuma conta encontrada</p>
                </td>
              </tr>
            ) : lancamentos.map(l => {
              const al = alerta(l);
              const forn = fornecedorDe(l);
              return (
                <tr key={l.id} className={`hover:bg-gray-50 transition-colors ${
                  al === "vencido" ? "bg-red-50/40" : al === "hoje" ? "bg-amber-50/40" : ""
                }`}>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      {al === "vencido" && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                      {al === "hoje"    && <Clock size={13} className="text-amber-500 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-gray-900 text-sm leading-snug">{l.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {l.categoria && <span className="text-xs text-gray-400">{l.categoria}</span>}
                          {l.totalParcelas && l.totalParcelas > 1 && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                              Parc. {l.parcelaNum}/{l.totalParcelas}
                            </span>
                          )}
                          {l.formaPagamento && l.status === "PAGO" && (
                            <span className="text-xs text-gray-400">{l.formaPagamento}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {forn ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Building2 size={12} className="text-gray-400 flex-shrink-0" />
                        {forn}
                      </div>
                    ) : <span className="text-gray-300 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <div>{formatDate(l.vencimento)}</div>
                    {l.pagamento && <div className="text-xs text-emerald-600">Pago: {formatDate(l.pagamento)}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700 whitespace-nowrap">
                    {formatCurrency(l.valor)}
                  </td>
                  <td className="px-4 py-3">
                    {l.status === "PENDENTE" && al === "vencido" && (
                      <Badge variant="danger">Vencido</Badge>
                    )}
                    {l.status === "PENDENTE" && al === "hoje" && (
                      <Badge variant="warning">Vence hoje</Badge>
                    )}
                    {l.status === "PENDENTE" && al === "em_breve" && (
                      <Badge variant="warning">A vencer</Badge>
                    )}
                    {l.status === "PENDENTE" && !al && (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                    {l.status === "PAGO" && <Badge variant="success">Pago</Badge>}
                    {l.status === "CANCELADO" && <Badge variant="default">Cancelado</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {l.status === "PENDENTE" && (
                        <Button size="sm" onClick={() => abrirPagar(l)}>Registrar pagamento</Button>
                      )}
                      {l.status === "PENDENTE" && (
                        <button onClick={() => cancelar(l.id)}
                          className="text-xs text-gray-300 hover:text-red-500 transition px-1">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Nova conta a pagar */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova conta a pagar" size="md">
        <div className="space-y-4">
          <Input label="Descrição *" value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Aluguel, Folha de pagamento, Fornecedor X..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor *" type="number" step="0.01" value={form.valor}
              onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0,00" />
            <Input label="Vencimento *" type="date" value={form.vencimento}
              onChange={e => setForm({ ...form, vencimento: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Categoria" value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              placeholder="Aluguel, Salários, Energia..." />
            <Input label="Forma de pagamento" value={form.formaPagamento}
              onChange={e => setForm({ ...form, formaPagamento: e.target.value })}
              placeholder="Dinheiro, Pix, Boleto..." />
          </div>
          <Textarea label="Observações" value={form.obs}
            onChange={e => setForm({ ...form, obs: e.target.value })} rows={2} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={salvarNova} loading={saving}>Criar</Button>
        </div>
      </Modal>

      {/* Modal: Registrar pagamento */}
      <Modal open={!!modalPagar} onClose={() => setModalPagar(null)} title="Registrar pagamento" size="sm">
        {modalPagar && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="font-medium text-gray-900 text-sm">{modalPagar.descricao}</p>
              <p className="text-red-600 font-bold text-lg mt-1">{formatCurrency(modalPagar.valor)}</p>
              {fornecedorDe(modalPagar) && (
                <p className="text-xs text-gray-500 mt-0.5">{fornecedorDe(modalPagar)}</p>
              )}
            </div>
            <Input label="Data do pagamento" type="date" value={dataPagto}
              onChange={e => setDataPagto(e.target.value)} />
            <Select label="Forma de pagamento" value={formaPagto}
              onChange={e => setFormaPagto(e.target.value)}>
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Cartão de Crédito</option>
              <option>Cartão de Débito</option>
              <option>Boleto</option>
              <option>Cheque</option>
              <option>Transferência</option>
            </Select>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalPagar(null)}>Cancelar</Button>
          <Button onClick={marcarPago} loading={saving}>Confirmar pagamento</Button>
        </div>
      </Modal>
    </div>
  );
}
