"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  CreditCard, DollarSign, Wallet, Zap, FileText,
  CheckCircle2, AlertCircle, Clock, Lock, RotateCcw,
  ChevronLeft, ChevronRight, ArrowUpRight,
} from "lucide-react";

type StatusCaixa = "ABERTO" | "FECHADO" | "ENCERRADO" | "EM_REVISAO";

type Caixa = {
  id: string;
  userId: string;
  data: string;
  status: StatusCaixa;
  saldoAbertura: number;
  saldoFechamento: number | null;
  obs: string | null;
  user: { id: string; name: string };
};

type TotalForma = { forma: string; total: number; qtd: number };

type DadosDia = {
  caixas:    Caixa[];
  totaisDia: TotalForma[];
  resumoDia: { totalVendas: number; qtdVendas: number };
};

const FORMA_INFO: Record<string, { label: string; icon: React.ElementType; cor: string }> = {
  DINHEIRO:      { label: "Dinheiro",         icon: DollarSign,  cor: "text-green-600"  },
  PIX:           { label: "Pix",              icon: Zap,         cor: "text-purple-600" },
  CARTAO_CREDITO:{ label: "Cartão de Crédito",icon: CreditCard,  cor: "text-blue-600"   },
  CARTAO_DEBITO: { label: "Cartão de Débito", icon: CreditCard,  cor: "text-indigo-600" },
  BOLETO:        { label: "Boleto",           icon: FileText,    cor: "text-orange-600" },
  CONVENIO:      { label: "Convênio",         icon: Wallet,      cor: "text-teal-600"   },
};

const STATUS_INFO: Record<StatusCaixa, { label: string; variant: "success" | "warning" | "default" | "danger"; icon: React.ElementType }> = {
  ABERTO:     { label: "Aberto",      variant: "success", icon: CheckCircle2 },
  FECHADO:    { label: "Fechado",     variant: "default", icon: Lock         },
  ENCERRADO:  { label: "Encerrado",   variant: "default", icon: Lock         },
  EM_REVISAO: { label: "Em revisão",  variant: "warning", icon: AlertCircle  },
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CaixaPage() {
  const { data: session } = useSession();

  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [dados, setDados]               = useState<DadosDia | null>(null);
  const [loading, setLoading]           = useState(true);

  // Modal abrir caixa
  const [modalAbrir, setModalAbrir]     = useState(false);
  const [saldoAbertura, setSaldoAbertura] = useState("0");
  const [obsAbertura, setObsAbertura]   = useState("");
  const [saving, setSaving]             = useState(false);

  // Modal fechar caixa
  const [modalFechar, setModalFechar]   = useState(false);
  const [caixaFechando, setCaixaFechando] = useState<Caixa | null>(null);
  const [saldoFechamento, setSaldoFechamento] = useState("0");
  const [obsFechar, setObsFechar]       = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/caixas?data=${selectedDate}`);
      setDados(await res.json());
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const meuCaixa = dados?.caixas.find(c => c.userId === session?.user?.id) ?? null;
  const totalDia = (dados?.totaisDia ?? []).reduce((s, t) => s + t.total, 0);
  const isHoje   = selectedDate === isoDate(new Date());

  function navData(delta: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(isoDate(d));
  }

  async function abrirCaixa() {
    setSaving(true);
    try {
      const res = await fetch("/api/caixas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoAbertura: Number(saldoAbertura), obs: obsAbertura }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Caixa aberto com sucesso!");
      setModalAbrir(false);
      fetch_();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir caixa");
    } finally { setSaving(false); }
  }

  function iniciarFechamento(caixa: Caixa) {
    setCaixaFechando(caixa);
    // Sugerir o total recebido em dinheiro como saldo de fechamento
    const dinheiro = dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0;
    setSaldoFechamento((caixa.saldoAbertura + dinheiro).toFixed(2));
    setObsFechar("");
    setModalFechar(true);
  }

  async function fecharCaixa() {
    if (!caixaFechando) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/caixas/${caixaFechando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FECHADO", saldoFechamento: Number(saldoFechamento), obs: obsFechar }),
      });
      if (!res.ok) throw new Error();
      toast.success("Caixa fechado!");
      setModalFechar(false);
      fetch_();
    } catch {
      toast.error("Erro ao fechar caixa");
    } finally { setSaving(false); }
  }

  async function reabrirCaixa(caixa: Caixa) {
    if (!confirm("Reabrir este caixa?")) return;
    await fetch(`/api/caixas/${caixa.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ABERTO" }),
    });
    toast.success("Caixa reaberto");
    fetch_();
  }

  const isAdmin = ["ADMIN", "FINANCEIRO"].includes((session?.user as { role?: string })?.role ?? "");

  return (
    <div>
      <PageHeader
        title="Caixa"
        description="Controle de abertura e fechamento de caixa por operador"
      />

      {/* Seletor de data */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navData(-1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button onClick={() => navData(1)} disabled={isHoje}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight size={16} />
        </button>
        {!isHoje && (
          <button onClick={() => setSelectedDate(isoDate(new Date()))}
            className="text-sm text-teal-600 hover:underline">
            Ir para hoje
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {/* KPIs do dia */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Total do dia</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(totalDia)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dados?.resumoDia.qtdVendas} venda(s)</p>
            </div>
            {(dados?.totaisDia ?? []).slice(0, 3).map(t => {
              const info = FORMA_INFO[t.forma];
              const Icon = info?.icon ?? DollarSign;
              return (
                <div key={t.forma} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className={info?.cor ?? "text-gray-400"} />
                    <p className="text-xs font-semibold text-gray-400 uppercase">{info?.label ?? t.forma}</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{fmt(t.total)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.qtd} transação(ões)</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna esquerda — Meu caixa */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Meu caixa
              </h2>

              {!meuCaixa ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 text-center">
                  <Wallet size={32} className="mx-auto text-gray-200 mb-3" />
                  {isHoje ? (
                    <>
                      <p className="text-sm text-gray-500 mb-4">Caixa não aberto hoje</p>
                      <Button onClick={() => { setSaldoAbertura("0"); setObsAbertura(""); setModalAbrir(true); }}>
                        Abrir caixa
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Sem caixa nesta data</p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Status header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    meuCaixa.status === "ABERTO" ? "bg-green-50" :
                    meuCaixa.status === "EM_REVISAO" ? "bg-amber-50" : "bg-gray-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      {(() => { const I = STATUS_INFO[meuCaixa.status].icon; return <I size={16} className={
                        meuCaixa.status === "ABERTO" ? "text-green-600" :
                        meuCaixa.status === "EM_REVISAO" ? "text-amber-500" : "text-gray-500"
                      } />; })()}
                      <span className="font-semibold text-sm text-gray-900">
                        {STATUS_INFO[meuCaixa.status].label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{fmtData(meuCaixa.data)}</span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Saldo abertura</span>
                      <span className="font-medium">{fmt(meuCaixa.saldoAbertura)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Entradas (dinheiro)</span>
                      <span className="font-medium text-green-600">
                        {fmt(dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-sm font-semibold">
                      <span>Saldo esperado</span>
                      <span>{fmt(meuCaixa.saldoAbertura + (dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0))}</span>
                    </div>
                    {meuCaixa.saldoFechamento != null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Saldo fechamento</span>
                        <span className={`font-medium ${
                          Math.abs(meuCaixa.saldoFechamento - (meuCaixa.saldoAbertura + (dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0))) > 0.01
                            ? "text-red-600" : "text-green-600"
                        }`}>
                          {fmt(meuCaixa.saldoFechamento)}
                        </span>
                      </div>
                    )}
                    {meuCaixa.obs && (
                      <p className="text-xs text-gray-400 italic">{meuCaixa.obs}</p>
                    )}
                  </div>

                  <div className="px-4 pb-4 flex gap-2">
                    {meuCaixa.status === "ABERTO" && isHoje && (
                      <Button onClick={() => iniciarFechamento(meuCaixa)} className="flex-1">
                        <Lock size={14} /> Fechar caixa
                      </Button>
                    )}
                    {(meuCaixa.status === "FECHADO" || meuCaixa.status === "EM_REVISAO") && isAdmin && (
                      <button onClick={() => reabrirCaixa(meuCaixa)}
                        className="flex items-center gap-1.5 text-sm text-amber-600 hover:underline">
                        <RotateCcw size={13} /> Reabrir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna direita — Movimentos por forma de pagamento */}
            <div className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Recebimentos do dia por forma de pagamento
              </h2>

              {(dados?.totaisDia ?? []).length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <ArrowUpRight size={28} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">Nenhum recebimento nesta data</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Forma</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(dados?.totaisDia ?? []).sort((a, b) => b.total - a.total).map(t => {
                        const info = FORMA_INFO[t.forma];
                        const Icon = info?.icon ?? DollarSign;
                        const pct  = totalDia > 0 ? (t.total / totalDia) * 100 : 0;
                        return (
                          <tr key={t.forma} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Icon size={15} className={info?.cor ?? "text-gray-400"} />
                                <span className="text-sm font-medium text-gray-900">
                                  {info?.label ?? t.forma}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-500">{t.qtd}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              {fmt(t.total)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-8 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">Total geral</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">
                          {(dados?.totaisDia ?? []).reduce((s, t) => s + t.qtd, 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{fmt(totalDia)}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Todos os caixas do dia (visível para admin) */}
          {isAdmin && (dados?.caixas ?? []).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Todos os caixas ({dados?.caixas.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Operador</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Abertura</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fechamento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Obs</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(dados?.caixas ?? []).map(c => {
                      const si = STATUS_INFO[c.status];
                      const Icon = si.icon;
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.user.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Icon size={13} className={
                                c.status === "ABERTO" ? "text-green-600" :
                                c.status === "EM_REVISAO" ? "text-amber-500" : "text-gray-400"
                              } />
                              <Badge variant={si.variant}>{si.label}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{fmt(c.saldoAbertura)}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {c.saldoFechamento != null ? fmt(c.saldoFechamento) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{c.obs ?? "—"}</td>
                          <td className="px-4 py-3">
                            {(c.status === "FECHADO" || c.status === "EM_REVISAO") && (
                              <button onClick={() => reabrirCaixa(c)}
                                className="flex items-center gap-1 text-xs text-amber-600 hover:underline">
                                <RotateCcw size={11} /> Reabrir
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal — Abrir caixa */}
      <Modal open={modalAbrir} onClose={() => setModalAbrir(false)} title="Abrir caixa" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            Informe o valor em dinheiro que há no caixa antes de começar as operações do dia.
          </div>
          <Input
            label="Saldo de abertura (R$)"
            type="number"
            step="0.01"
            min="0"
            value={saldoAbertura}
            onChange={e => setSaldoAbertura(e.target.value)}
            placeholder="0,00"
          />
          <Input
            label="Observação (opcional)"
            value={obsAbertura}
            onChange={e => setObsAbertura(e.target.value)}
            placeholder="Ex: turno da manhã"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalAbrir(false)}>Cancelar</Button>
          <Button onClick={abrirCaixa} loading={saving}>Abrir caixa</Button>
        </div>
      </Modal>

      {/* Modal — Fechar caixa */}
      <Modal open={modalFechar} onClose={() => setModalFechar(false)} title="Fechar caixa" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
            Conte o dinheiro físico no caixa e informe o total abaixo para conferência.
          </div>

          {caixaFechando && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Saldo abertura</span>
                <span className="font-medium">{fmt(caixaFechando.saldoAbertura)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Entradas em dinheiro</span>
                <span className="font-medium text-green-600">
                  {fmt(dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0)}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Saldo esperado</span>
                <span>{fmt(caixaFechando.saldoAbertura + (dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0))}</span>
              </div>
            </div>
          )}

          <Input
            label="Saldo de fechamento — dinheiro contado (R$)"
            type="number"
            step="0.01"
            min="0"
            value={saldoFechamento}
            onChange={e => setSaldoFechamento(e.target.value)}
            placeholder="0,00"
          />

          {caixaFechando && (() => {
            const esperado = caixaFechando.saldoAbertura + (dados?.totaisDia.find(t => t.forma === "DINHEIRO")?.total ?? 0);
            const contado  = Number(saldoFechamento);
            const diff     = contado - esperado;
            if (Math.abs(diff) > 0.01) return (
              <div className={`rounded-xl p-3 text-sm ${diff > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                {diff > 0 ? "Sobra" : "Falta"}: {fmt(Math.abs(diff))}
              </div>
            );
            return <div className="rounded-xl p-3 bg-green-50 text-green-700 text-sm">Caixa conferido — sem diferença.</div>;
          })()}

          <Input
            label="Observação (opcional)"
            value={obsFechar}
            onChange={e => setObsFechar(e.target.value)}
            placeholder="Ex: falta de troco, etc."
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalFechar(false)}>Cancelar</Button>
          <Button onClick={fecharCaixa} loading={saving}>Confirmar fechamento</Button>
        </div>
      </Modal>
    </div>
  );
}
