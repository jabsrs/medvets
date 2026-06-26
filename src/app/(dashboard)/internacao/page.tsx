"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, BedDouble, Clock } from "lucide-react";
import { formatDateTime, especieEmoji } from "@/lib/utils";

type Internacao = {
  id: string;
  entrada: string;
  saida?: string;
  status: string;
  motivo?: string;
  baia?: string;
  animal: { id: string; nome: string; especie: string; tutor: { nome: string; telefone: string } };
  evolucoes: { id: string; data: string; descricao: string }[];
};

type Animal = { id: string; nome: string; tutor: { nome: string } };

const emptyForm = { animalId: "", motivo: "", baia: "", obs: "" };

export default function InternacaoPage() {
  const [internacoes, setInternacoes] = useState<Internacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [evolucaoId, setEvolucaoId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [evolucaoForm, setEvolucaoForm] = useState({ descricao: "", temperatura: "", peso: "" });
  const [saving, setSaving] = useState(false);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animalQ, setAnimalQ] = useState("");

  useEffect(() => {
    fetch("/api/internacoes").then((r) => r.json()).then((d) => { setInternacoes(d); setLoading(false); });
  }, []);

  useEffect(() => {
    if (animalQ.length >= 2) {
      fetch(`/api/animais?q=${encodeURIComponent(animalQ)}`).then((r) => r.json()).then(setAnimais);
    }
  }, [animalQ]);

  async function internar() {
    if (!form.animalId) { toast.error("Selecione um animal"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/internacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const nova = await res.json();
      setInternacoes((prev) => [nova, ...prev]);
      toast.success("Animal internado!");
      setModalOpen(false);
      setForm({ ...emptyForm });
      setAnimalQ("");
    } catch { toast.error("Erro ao internar animal"); }
    finally { setSaving(false); }
  }

  async function addEvolucao() {
    if (!evolucaoForm.descricao) { toast.error("Descrição é obrigatória"); return; }
    await fetch(`/api/internacoes/${evolucaoId}/evolucoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evolucaoForm),
    });
    toast.success("Evolução registrada!");
    setEvolucaoId(null);
    setEvolucaoForm({ descricao: "", temperatura: "", peso: "" });
    fetch("/api/internacoes").then((r) => r.json()).then(setInternacoes);
  }

  async function darAlta(id: string) {
    if (!confirm("Dar alta para este animal?")) return;
    await fetch(`/api/internacoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ALTA", saida: new Date().toISOString() }),
    });
    toast.success("Alta registrada!");
    fetch("/api/internacoes").then((r) => r.json()).then(setInternacoes);
  }

  const internados = internacoes.filter((i) => i.status === "INTERNADO");
  const historico = internacoes.filter((i) => i.status !== "INTERNADO");

  const statusBadge: Record<string, "warning" | "success" | "danger"> = {
    INTERNADO: "warning", ALTA: "success", OBITO: "danger",
  };

  return (
    <div>
      <PageHeader
        title="Internação"
        description={`${internados.length} animal(is) internado(s)`}
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Nova internação</Button>}
      />

      {/* Internados agora */}
      <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><BedDouble size={18} /> Internados agora</h2>
      {loading ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Carregando...</div>
      ) : internados.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400 mb-6">Nenhum animal internado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {internados.map((i) => (
            <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{especieEmoji[i.animal.especie]}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{i.animal.nome}</p>
                    <p className="text-xs text-gray-500">{i.animal.tutor.nome} — {i.animal.tutor.telefone}</p>
                  </div>
                </div>
                <Badge variant="warning">Internado</Badge>
              </div>
              {i.baia && <p className="text-sm text-gray-600 mb-1">🛏 Baia: {i.baia}</p>}
              {i.motivo && <p className="text-sm text-gray-600 mb-1">📋 {i.motivo}</p>}
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                <Clock size={12} /> Internado: {formatDateTime(i.entrada)}
              </p>
              {i.evolucoes.length > 0 && (
                <div className="border-t pt-3 mb-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Última evolução:</p>
                  <p className="text-sm text-gray-700">{i.evolucoes[0].descricao}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(i.evolucoes[0].data)}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEvolucaoId(i.id)}>+ Evolução</Button>
                <Button size="sm" variant="outline" onClick={() => darAlta(i.id)}>Dar alta</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-900 mb-3">Histórico</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Animal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entrada</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Saída</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historico.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{i.animal.nome}</p>
                      <p className="text-xs text-gray-500">{i.animal.tutor.nome}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(i.entrada)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{i.saida ? formatDateTime(i.saida) : "—"}</td>
                    <td className="px-4 py-3"><Badge variant={statusBadge[i.status]}>{i.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal nova internação */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova internação" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Animal *</label>
            <input value={animalQ} onChange={(e) => setAnimalQ(e.target.value)} placeholder="Buscar animal..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            {animais.length > 0 && animalQ && !form.animalId && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-32 overflow-y-auto">
                {animais.map((a) => (
                  <button key={a.id} onClick={() => { setForm({ ...form, animalId: a.id }); setAnimalQ(`${a.nome} (${a.tutor.nome})`); setAnimais([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">{a.nome} — {a.tutor.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input label="Baia / Leito" value={form.baia} onChange={(e) => setForm({ ...form, baia: e.target.value })} placeholder="Ex: Baia 3" />
          <Textarea label="Motivo da internação" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} rows={3} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={internar} loading={saving}>Internar</Button>
        </div>
      </Modal>

      {/* Modal evolução */}
      <Modal open={!!evolucaoId} onClose={() => setEvolucaoId(null)} title="Registrar evolução" size="sm">
        <div className="space-y-3">
          <Textarea label="Descrição *" value={evolucaoForm.descricao} onChange={(e) => setEvolucaoForm({ ...evolucaoForm, descricao: e.target.value })} rows={4} placeholder="Estado atual do animal..." />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Temperatura (°C)" type="number" step="0.1" value={evolucaoForm.temperatura} onChange={(e) => setEvolucaoForm({ ...evolucaoForm, temperatura: e.target.value })} />
            <Input label="Peso (kg)" type="number" step="0.01" value={evolucaoForm.peso} onChange={(e) => setEvolucaoForm({ ...evolucaoForm, peso: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setEvolucaoId(null)}>Cancelar</Button>
          <Button onClick={addEvolucao}>Salvar evolução</Button>
        </div>
      </Modal>
    </div>
  );
}
