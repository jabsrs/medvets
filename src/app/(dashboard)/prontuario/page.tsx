"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, ClipboardList, Stethoscope } from "lucide-react";
import { formatDateTime, especieEmoji } from "@/lib/utils";

type Atendimento = {
  id: string;
  data: string;
  queixa?: string;
  diagnostico?: string;
  animal: { id: string; nome: string; especie: string; tutor: { nome: string } };
  medico: { name: string };
  receitas: { id: string; medicamento: string }[];
};

type Animal = { id: string; nome: string; tutor: { nome: string } };

const emptyExame = { peso: "", temperatura: "", freqCardiaca: "", freqResp: "", tpc: "", hidratacao: "", mucosas: "", linfonodos: "", pulso: "", escoreCorp: "", obs: "" };
const emptyForm = { animalId: "", medicoId: "", queixa: "", diagnostico: "", prognostico: "", tratamento: "", retorno: "", obs: "", peso: "" };

export default function ProntuarioPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [exame, setExame] = useState<Record<string, string>>({ ...emptyExame });
  const [receitas, setReceitas] = useState([{ medicamento: "", dose: "", frequencia: "", duracao: "" }]);
  const [saving, setSaving] = useState(false);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animalQ, setAnimalQ] = useState("");
  const [vets, setVets] = useState<{ id: string; name: string }[]>([]);

  const fetchAtendimentos = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/atendimentos");
    const data = await res.json();
    setAtendimentos(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAtendimentos(); }, [fetchAtendimentos]);

  useEffect(() => {
    fetch("/api/usuarios?role=VETERINARIO").then((r) => r.json()).then(setVets);
  }, []);

  useEffect(() => {
    if (animalQ.length >= 2) {
      fetch(`/api/animais?q=${encodeURIComponent(animalQ)}`).then((r) => r.json()).then(setAnimais);
    }
  }, [animalQ]);

  const filtered = atendimentos.filter((a) =>
    !q || a.animal.nome.toLowerCase().includes(q.toLowerCase()) ||
    a.animal.tutor.nome.toLowerCase().includes(q.toLowerCase()) ||
    a.diagnostico?.toLowerCase().includes(q.toLowerCase())
  );

  async function save() {
    if (!form.animalId || !form.medicoId) { toast.error("Animal e veterinário são obrigatórios"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        peso: form.peso ? Number(form.peso) : undefined,
        exameClinico: Object.values(exame).some(Boolean) ? exame : undefined,
        receitas: receitas.filter((r) => r.medicamento),
      };
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Atendimento registrado!");
      setModalOpen(false);
      fetchAtendimentos();
    } catch { toast.error("Erro ao salvar atendimento"); }
    finally { setSaving(false); }
  }

  function addReceita() {
    setReceitas([...receitas, { medicamento: "", dose: "", frequencia: "", duracao: "" }]);
  }

  function updateReceita(i: number, field: string, value: string) {
    const updated = [...receitas];
    updated[i] = { ...updated[i], [field]: value };
    setReceitas(updated);
  }

  return (
    <div>
      <PageHeader
        title="Prontuário Clínico"
        description="Registro de todos os atendimentos"
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Novo atendimento</Button>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por animal, tutor ou diagnóstico..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-2 opacity-40" />
            <p>Nenhum atendimento encontrado</p>
          </div>
        ) : (
          filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{especieEmoji[a.animal.especie]}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{a.animal.nome}</p>
                    <p className="text-xs text-gray-500">{a.animal.tutor.nome} • {formatDateTime(a.data)}</p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p className="flex items-center gap-1 justify-end">
                    <Stethoscope size={14} /> {a.medico.name}
                  </p>
                </div>
              </div>
              {a.queixa && <p className="text-sm text-gray-700 mt-3"><span className="font-medium">Queixa:</span> {a.queixa}</p>}
              {a.diagnostico && <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Diagnóstico:</span> {a.diagnostico}</p>}
              {a.receitas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Receitas:</p>
                  <div className="flex flex-wrap gap-2">
                    {a.receitas.map((r) => (
                      <span key={r.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.medicamento}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo atendimento" size="xl">
        <div className="space-y-6">
          {/* Animal e Vet */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Animal *</label>
              <input
                value={animalQ}
                onChange={(e) => setAnimalQ(e.target.value)}
                placeholder="Buscar animal..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
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
            <Select label="Veterinário *" value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
              <option value="">Selecione...</option>
              {vets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>

          {/* Queixa principal */}
          <Textarea label="Queixa principal" value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} placeholder="Motivo da consulta..." rows={2} />

          {/* Exame físico */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2"><Stethoscope size={16} /> Exame físico</h3>
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl">
              <Input label="Peso (kg)" type="number" step="0.01" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
              <Input label="Temperatura (°C)" type="number" step="0.1" value={exame.temperatura} onChange={(e) => setExame({ ...exame, temperatura: e.target.value })} />
              <Input label="Freq. Cardíaca (bpm)" type="number" value={exame.freqCardiaca} onChange={(e) => setExame({ ...exame, freqCardiaca: e.target.value })} />
              <Input label="Freq. Resp. (rpm)" type="number" value={exame.freqResp} onChange={(e) => setExame({ ...exame, freqResp: e.target.value })} />
              <Input label="TPC" value={exame.tpc} onChange={(e) => setExame({ ...exame, tpc: e.target.value })} placeholder="< 2 seg" />
              <Input label="Hidratação" value={exame.hidratacao} onChange={(e) => setExame({ ...exame, hidratacao: e.target.value })} placeholder="Normal, desidratado..." />
              <Input label="Mucosas" value={exame.mucosas} onChange={(e) => setExame({ ...exame, mucosas: e.target.value })} placeholder="Rosadas, pálidas..." />
              <Input label="Linfonodos" value={exame.linfonodos} onChange={(e) => setExame({ ...exame, linfonodos: e.target.value })} placeholder="Normais, aumentados..." />
              <Input label="Escore corporal (1-9)" type="number" min="1" max="9" value={exame.escoreCorp} onChange={(e) => setExame({ ...exame, escoreCorp: e.target.value })} />
            </div>
          </div>

          {/* Diagnóstico */}
          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Diagnóstico" value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} rows={3} />
            <Textarea label="Tratamento" value={form.tratamento} onChange={(e) => setForm({ ...form, tratamento: e.target.value })} rows={3} />
          </div>

          {/* Receitas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Receitas</h3>
              <Button size="sm" variant="ghost" onClick={addReceita}><Plus size={14} /> Adicionar</Button>
            </div>
            <div className="space-y-2">
              {receitas.map((r, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg">
                  <Input placeholder="Medicamento" value={r.medicamento} onChange={(e) => updateReceita(i, "medicamento", e.target.value)} />
                  <Input placeholder="Dose" value={r.dose} onChange={(e) => updateReceita(i, "dose", e.target.value)} />
                  <Input placeholder="Frequência" value={r.frequencia} onChange={(e) => updateReceita(i, "frequencia", e.target.value)} />
                  <Input placeholder="Duração" value={r.duracao} onChange={(e) => updateReceita(i, "duracao", e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Retorno" type="date" value={form.retorno} onChange={(e) => setForm({ ...form, retorno: e.target.value })} />
            <Textarea label="Observações" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar atendimento</Button>
        </div>
      </Modal>
    </div>
  );
}
