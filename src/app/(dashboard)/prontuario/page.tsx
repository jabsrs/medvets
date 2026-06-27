"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, X, Stethoscope, RotateCcw } from "lucide-react";
import { especieEmoji } from "@/lib/utils";

type Animal = { id: string; nome: string; especie: string };
type Tutor  = { id: string; nome: string; animais: Animal[] };
type SearchAnimal = { id: string; nome: string; tutor: { nome: string } };

const emptyExame = { peso: "", temperatura: "", freqCardiaca: "", freqResp: "", tpc: "", hidratacao: "", mucosas: "", linfonodos: "", pulso: "", escoreCorp: "", obs: "" };
const emptyForm  = { animalId: "", medicoId: "", queixa: "", diagnostico: "", prognostico: "", tratamento: "", retorno: "", obs: "", peso: "" };

export default function ProntuarioPage() {
  const [tutores, setTutores]       = useState<Tutor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [qResp, setQResp]           = useState("");
  const [qAnimal, setQAnimal]       = useState("");
  const [applied, setApplied]       = useState({ resp: "", animal: "" });

  // modal state
  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]             = useState<Record<string, string>>({ ...emptyForm });
  const [exame, setExame]           = useState<Record<string, string>>({ ...emptyExame });
  const [receitas, setReceitas]     = useState([{ medicamento: "", dose: "", frequencia: "", duracao: "" }]);
  const [saving, setSaving]         = useState(false);
  const [animalQ, setAnimalQ]       = useState("");
  const [animalSugg, setAnimalSugg] = useState<SearchAnimal[]>([]);
  const [vets, setVets]             = useState<{ id: string; name: string }[]>([]);

  const fetchTutores = useCallback(async (resp: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (resp) params.set("q", resp);
    const res  = await fetch(`/api/tutores?${params}`);
    const data = await res.json();
    setTutores(data.tutores ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTutores(""); }, [fetchTutores]);

  useEffect(() => {
    fetch("/api/usuarios?role=VETERINARIO").then(r => r.json()).then(setVets);
  }, []);

  useEffect(() => {
    if (animalQ.length >= 2) {
      fetch(`/api/animais?q=${encodeURIComponent(animalQ)}`).then(r => r.json()).then(setAnimalSugg);
    } else {
      setAnimalSugg([]);
    }
  }, [animalQ]);

  function buscar() {
    setApplied({ resp: qResp, animal: qAnimal });
    fetchTutores(qResp);
  }

  function limpar() {
    setQResp(""); setQAnimal("");
    setApplied({ resp: "", animal: "" });
    fetchTutores("");
  }

  // Filter by animal name client-side
  const lista = tutores.filter(t => {
    if (!applied.animal) return t.animais.length > 0;
    return t.animais.some(a => a.nome.toLowerCase().includes(applied.animal.toLowerCase()));
  });

  // For each row, which animals to show (highlighted if animal filter active)
  function animaisDoTutor(t: Tutor) {
    if (!applied.animal) return t.animais;
    return t.animais.filter(a => a.nome.toLowerCase().includes(applied.animal.toLowerCase()));
  }

  async function save() {
    if (!form.animalId || !form.medicoId) { toast.error("Animal e veterinário são obrigatórios"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        peso: form.peso ? Number(form.peso) : undefined,
        exameClinico: Object.values(exame).some(Boolean) ? exame : undefined,
        receitas: receitas.filter(r => r.medicamento),
      };
      const res = await fetch("/api/atendimentos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Atendimento registrado!");
      setModalOpen(false);
      setForm({ ...emptyForm }); setExame({ ...emptyExame });
      setReceitas([{ medicamento: "", dose: "", frequencia: "", duracao: "" }]);
    } catch { toast.error("Erro ao salvar atendimento"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">Atendimento clínico</h1>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Adicionar</Button>
      </div>

      {/* Barra de busca — igual ao SimplesVet */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <input
            value={qResp}
            onChange={e => setQResp(e.target.value)}
            onKeyDown={e => e.key === "Enter" && buscar()}
            placeholder="Responsável"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {qResp && (
            <button onClick={() => setQResp("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="relative">
          <input
            value={qAnimal}
            onChange={e => setQAnimal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && buscar()}
            placeholder="Animal"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {qAnimal && (
            <button onClick={() => setQAnimal("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={buscar}
          className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          title="Buscar"
        >
          <Search size={16} />
        </button>
        <button
          onClick={limpar}
          className="p-2 border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-50 transition"
          title="Limpar filtros"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-700 w-2/5">Nome</th>
              <th className="text-left px-5 py-3 text-sm font-semibold text-gray-700">Animais</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} className="text-center py-16 text-gray-400">Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-16 text-gray-400">
                  <Search size={36} className="mx-auto mb-2 opacity-30" />
                  <p>Nenhum cliente encontrado</p>
                </td>
              </tr>
            ) : lista.map(t => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/tutores/${t.id}`} className="text-gray-900 font-medium hover:text-teal-600 transition-colors">
                    {t.nome}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-x-1 items-center">
                    {animaisDoTutor(t).map((a, i) => (
                      <span key={a.id} className="flex items-center gap-1">
                        {i > 0 && <span className="text-gray-300 mx-0.5">—</span>}
                        <Link
                          href={`/animais/${a.id}`}
                          className="text-teal-600 hover:text-teal-800 hover:underline text-sm font-medium transition-colors"
                        >
                          {especieEmoji[a.especie] ? `${a.nome}` : a.nome}
                        </Link>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && lista.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            {lista.length} cliente{lista.length !== 1 ? "s" : ""}
            {applied.animal ? ` com animal "${applied.animal}"` : ""}
          </div>
        )}
      </div>

      {/* Modal novo atendimento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo atendimento" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Animal *</label>
              <input
                value={animalQ}
                onChange={e => setAnimalQ(e.target.value)}
                placeholder="Buscar por nome ou tutor..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {animalSugg.length > 0 && animalQ && !form.animalId && (
                <div className="border border-gray-200 rounded-lg mt-1 max-h-36 overflow-y-auto shadow-sm">
                  {animalSugg.map(a => (
                    <button key={a.id}
                      onClick={() => { setForm({ ...form, animalId: a.id }); setAnimalQ(`${a.nome} — ${a.tutor.nome}`); setAnimalSugg([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      {a.nome} <span className="text-gray-400">— {a.tutor.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Select label="Veterinária *" value={form.medicoId} onChange={e => setForm({ ...form, medicoId: e.target.value })}>
              <option value="">Selecione...</option>
              {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>

          <Textarea label="Queixa principal" value={form.queixa} onChange={e => setForm({ ...form, queixa: e.target.value })} placeholder="Motivo da consulta..." rows={2} />

          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Stethoscope size={15} /> Exame físico
            </h3>
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl">
              <Input label="Peso (kg)" type="number" step="0.01" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
              <Input label="Temperatura (°C)" type="number" step="0.1" value={exame.temperatura} onChange={e => setExame({ ...exame, temperatura: e.target.value })} />
              <Input label="Freq. Cardíaca (bpm)" type="number" value={exame.freqCardiaca} onChange={e => setExame({ ...exame, freqCardiaca: e.target.value })} />
              <Input label="Freq. Resp. (rpm)" type="number" value={exame.freqResp} onChange={e => setExame({ ...exame, freqResp: e.target.value })} />
              <Input label="TPC" value={exame.tpc} onChange={e => setExame({ ...exame, tpc: e.target.value })} placeholder="< 2 seg" />
              <Input label="Mucosas" value={exame.mucosas} onChange={e => setExame({ ...exame, mucosas: e.target.value })} placeholder="Rosadas, pálidas..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Textarea label="Diagnóstico" value={form.diagnostico} onChange={e => setForm({ ...form, diagnostico: e.target.value })} rows={3} />
            <Textarea label="Tratamento" value={form.tratamento} onChange={e => setForm({ ...form, tratamento: e.target.value })} rows={3} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-sm">Receitas</h3>
              <Button size="sm" variant="ghost" onClick={() => setReceitas([...receitas, { medicamento: "", dose: "", frequencia: "", duracao: "" }])}>
                <Plus size={13} /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {receitas.map((r, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded-lg">
                  <Input placeholder="Medicamento" value={r.medicamento} onChange={e => { const u=[...receitas]; u[i]={...u[i],medicamento:e.target.value}; setReceitas(u); }} />
                  <Input placeholder="Dose" value={r.dose} onChange={e => { const u=[...receitas]; u[i]={...u[i],dose:e.target.value}; setReceitas(u); }} />
                  <Input placeholder="Frequência" value={r.frequencia} onChange={e => { const u=[...receitas]; u[i]={...u[i],frequencia:e.target.value}; setReceitas(u); }} />
                  <Input placeholder="Duração" value={r.duracao} onChange={e => { const u=[...receitas]; u[i]={...u[i],duracao:e.target.value}; setReceitas(u); }} />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Retorno" type="date" value={form.retorno} onChange={e => setForm({ ...form, retorno: e.target.value })} />
            <Textarea label="Observações" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} rows={2} />
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
