"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus, CheckCircle2, Clock, Users, Percent,
  ChevronRight, Search,
} from "lucide-react";

type UserSimples = { id: string; name: string; role: string };
type ProdutoSimples = { id: string; nome: string; tipo: string };

type PorVet = {
  user:        UserSimples;
  pendente:    number;
  pago:        number;
  qtdPendente: number;
  qtdPago:     number;
};

type Resumo = { totalPendente: number; totalPago: number; qtdVets: number };

type DadosComissoes = { porVet: PorVet[]; resumo: Resumo };

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function mesAtual() {
  const hoje = new Date();
  return {
    de:  isoDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    ate: isoDate(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
}

export default function ComissionamentoPage() {
  const [de,  setDe]  = useState(mesAtual().de);
  const [ate, setAte] = useState(mesAtual().ate);
  const [dados, setDados]   = useState<DadosComissoes | null>(null);
  const [loading, setLoading] = useState(true);

  // Listas auxiliares
  const [vets, setVets]       = useState<UserSimples[]>([]);
  const [produtos, setProdutos] = useState<ProdutoSimples[]>([]);

  // Modal nova comissão
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    userId: "", produtoId: "", valor: "", percentual: "", data: isoDate(new Date()),
  });
  const [saving, setSaving] = useState(false);

  // Modal pagar lote por vet
  const [modalPagar, setModalPagar] = useState<PorVet | null>(null);
  const [pagando, setPagando] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/comissoes?de=${de}&ate=${ate}`);
    setDados(await res.json());
    setLoading(false);
  }, [de, ate]);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    fetch("/api/usuarios?ativos=1").then(r => r.json()).then(data => {
      const lista = Array.isArray(data) ? data : (data.usuarios ?? []);
      setVets(lista.filter((u: UserSimples) => ["VETERINARIO", "ADMIN"].includes(u.role)));
    });
    fetch("/api/produtos?tipo=SERVICO&limit=200").then(r => r.json()).then(setProdutos);
  }, []);

  async function salvar() {
    if (!form.userId || !form.valor) { toast.error("Veterinário e valor são obrigatórios"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/comissoes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valor: Number(form.valor), percentual: form.percentual || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Comissão registrada");
      setModal(false);
      fetch_();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  }

  async function pagarLote(vet: PorVet) {
    setPagando(true);
    try {
      const res = await fetch("/api/comissoes/pagar-lote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: vet.user.id }),
      });
      const data = await res.json();
      toast.success(`${data.atualizadas} comissão(ões) marcada(s) como paga(s)`);
      setModalPagar(null);
      fetch_();
    } catch {
      toast.error("Erro ao registrar pagamento");
    } finally { setPagando(false); }
  }

  const resumo = dados?.resumo ?? { totalPendente: 0, totalPago: 0, qtdVets: 0 };
  const porVet = dados?.porVet ?? [];

  return (
    <div>
      <PageHeader
        title="Comissionamento"
        description="Comissões por veterinário no período"
        actions={<Button onClick={() => setModal(true)}><Plus size={16} /> Nova comissão</Button>}
      />

      {/* Período */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input type="date" value={de} onChange={e => setDe(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <span className="text-gray-400 text-sm">até</span>
        <input type="date" value={ate} onChange={e => setAte(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <button onClick={() => { const m = mesAtual(); setDe(m.de); setAte(m.ate); }}
          className="text-sm text-teal-600 hover:underline">Este mês</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-amber-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">A pagar</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmt(resumo.totalPendente)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Pago no período</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(resumo.totalPago)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-teal-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase">Veterinários</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{resumo.qtdVets}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : porVet.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <Percent size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma comissão no período</p>
          <button onClick={() => setModal(true)} className="mt-3 text-sm text-teal-600 hover:underline">
            + Registrar primeira comissão
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {porVet.map(vet => (
            <div key={vet.user.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Info do vet */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-teal-700">
                      {vet.user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{vet.user.name}</p>
                    <Badge variant={vet.user.role === "VETERINARIO" ? "info" : "default"}>
                      {vet.user.role === "VETERINARIO" ? "Veterinário" : vet.user.role}
                    </Badge>
                  </div>
                </div>

                {/* Valores */}
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">A pagar</p>
                    <p className={`text-lg font-bold ${vet.pendente > 0 ? "text-amber-600" : "text-gray-300"}`}>
                      {fmt(vet.pendente)}
                    </p>
                    <p className="text-xs text-gray-400">{vet.qtdPendente} lançamento(s)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Pago</p>
                    <p className="text-lg font-bold text-green-600">{fmt(vet.pago)}</p>
                    <p className="text-xs text-gray-400">{vet.qtdPago} lançamento(s)</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {vet.pendente > 0 && (
                    <Button onClick={() => setModalPagar(vet)} variant="outline">
                      <CheckCircle2 size={14} /> Pagar tudo
                    </Button>
                  )}
                  <Link
                    href={`/comissionamento/extrato?userId=${vet.user.id}&de=${de}&ate=${ate}`}
                    className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
                    Extrato <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Barra de progresso pago/total */}
              {(vet.pendente + vet.pago) > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pago: {((vet.pago / (vet.pago + vet.pendente)) * 100).toFixed(0)}%</span>
                    <span>Total: {fmt(vet.pago + vet.pendente)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${(vet.pago / (vet.pago + vet.pendente)) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link para extrato geral */}
      {porVet.length > 0 && (
        <div className="mt-4 text-center">
          <Link href={`/comissionamento/extrato?de=${de}&ate=${ate}`}
            className="text-sm text-teal-600 hover:underline inline-flex items-center gap-1">
            Ver extrato completo <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Modal nova comissão */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova comissão" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Veterinário *</label>
            <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Selecione...</option>
              {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serviço / Produto (opcional)</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select value={form.produtoId} onChange={e => setForm({ ...form, produtoId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">— Nenhum —</option>
                {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$) *" type="number" step="0.01" min="0"
              value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            <Input label="Percentual (%)" type="number" step="0.01" min="0" max="100"
              value={form.percentual} onChange={e => setForm({ ...form, percentual: e.target.value })}
              placeholder="Ex: 10" />
          </div>

          <Input label="Data" type="date" value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={salvar} loading={saving}>Registrar</Button>
        </div>
      </Modal>

      {/* Modal confirmar pagamento */}
      <Modal open={!!modalPagar} onClose={() => setModalPagar(null)} title="Confirmar pagamento" size="sm">
        {modalPagar && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
              Você está prestes a marcar <strong>{modalPagar.qtdPendente} comissão(ões)</strong> de{" "}
              <strong>{modalPagar.user.name}</strong> como pagas.
            </div>
            <div className="flex justify-between text-sm font-semibold p-3 bg-gray-50 rounded-xl">
              <span>Total a ser pago:</span>
              <span className="text-amber-600">{fmt(modalPagar.pendente)}</span>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalPagar(null)}>Cancelar</Button>
          <Button onClick={() => modalPagar && pagarLote(modalPagar)} loading={pagando}>
            Confirmar pagamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
