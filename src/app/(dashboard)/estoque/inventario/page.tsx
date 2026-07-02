"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import Link from "next/link";
import { ClipboardList, Plus, CheckCircle2, Clock, Trash2 } from "lucide-react";

type Grupo = { id: string; nome: string; cor: string };
type Inventario = {
  id: string;
  descricao: string | null;
  status: "ABERTO" | "FINALIZADO" | "CANCELADO";
  createdAt: string;
  finalizadoEm: string | null;
  totalItens: number;
  contados: number;
};

const STATUS_BADGE: Record<string, string> = {
  ABERTO:     "bg-amber-100 text-amber-700",
  FINALIZADO: "bg-green-100 text-green-700",
  CANCELADO:  "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Em contagem", FINALIZADO: "Finalizado", CANCELADO: "Cancelado",
};

export default function InventarioListaPage() {
  const router = useRouter();
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [grupos, setGrupos]           = useState<Grupo[]>([]);
  const [loading, setLoading]         = useState(true);

  const [modal, setModal]     = useState(false);
  const [descricao, setDescricao] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [criando, setCriando] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventarios");
    setInventarios(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  useEffect(() => {
    fetch("/api/grupos-produto").then(r => r.json()).then((data: unknown[]) => {
      const flat: Grupo[] = [];
      for (const g of Array.isArray(data) ? data : []) {
        const grupo = g as Grupo & { filhos?: Grupo[] };
        flat.push({ id: grupo.id, nome: grupo.nome, cor: grupo.cor });
        for (const f of grupo.filhos ?? []) flat.push(f);
      }
      setGrupos(flat);
    });
  }, []);

  async function criar() {
    setCriando(true);
    try {
      const res = await fetch("/api/inventarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao, grupoProdutoId: grupoId || null }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const inv = await res.json();
      toast.success("Inventário criado");
      router.push(`/estoque/inventario/${inv.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar inventário");
    } finally { setCriando(false); }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este inventário? Esta ação não pode ser desfeita.")) return;
    await fetch(`/api/inventarios/${id}`, { method: "DELETE" });
    toast.success("Inventário excluído");
    fetch_();
  }

  return (
    <div>
      <PageHeader
        title="Inventário"
        description="Contagem periódica de estoque com ajuste automático"
        actions={<Button onClick={() => { setDescricao(""); setGrupoId(""); setModal(true); }}>
          <Plus size={16} /> Novo inventário
        </Button>}
      />

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : inventarios.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <ClipboardList size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Nenhum inventário realizado</p>
          <button onClick={() => setModal(true)} className="mt-3 text-sm text-teal-600 hover:underline">
            + Iniciar primeiro inventário
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Criado em</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progresso</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventarios.map(inv => {
                const pct = inv.totalItens ? Math.round((inv.contados / inv.totalItens) * 100) : 0;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/estoque/inventario/${inv.id}`}
                        className="font-medium text-gray-900 hover:text-teal-700 transition">
                        {inv.descricao || `Inventário ${new Date(inv.createdAt).toLocaleDateString("pt-BR")}`}
                      </Link>
                      <p className="text-xs text-gray-400">{inv.totalItens} item(ns)</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                      <span className="text-xs text-gray-400 ml-1">
                        {new Date(inv.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-24">
                          <div className={`h-full rounded-full ${inv.status === "FINALIZADO" ? "bg-green-500" : "bg-teal-500"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-20 text-right">{inv.contados}/{inv.totalItens}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[inv.status]}`}>
                        {inv.status === "FINALIZADO" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/estoque/inventario/${inv.id}`}
                          className="text-sm text-teal-600 hover:underline">
                          {inv.status === "ABERTO" ? "Continuar" : "Ver"}
                        </Link>
                        {inv.status !== "FINALIZADO" && (
                          <button onClick={() => excluir(inv.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal novo inventário */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo inventário" size="sm">
        <div className="space-y-4">
          <Input label="Descrição (opcional)" value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: Contagem mensal — Julho" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limitar a um grupo (opcional)</label>
            <select value={grupoId} onChange={e => setGrupoId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Todos os produtos físicos</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Serão listados os produtos ativos (produtos e medicamentos) com o estoque atual congelado para conferência.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={criar} loading={criando}>Iniciar contagem</Button>
        </div>
      </Modal>
    </div>
  );
}
