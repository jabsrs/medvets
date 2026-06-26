"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { especieEmoji, especieLabel, calcAge } from "@/lib/utils";

type Animal = {
  id: string;
  nome: string;
  especie: string;
  raca?: string;
  sexo: string;
  dataNasc?: string;
  peso?: number;
  castrado: boolean;
  tutor: { id: string; nome: string; telefone: string };
};

const emptyForm = {
  tutorId: "", nome: "", especie: "CACHORRO", raca: "", sexo: "MACHO",
  dataNasc: "", peso: "", cor: "", pelagem: "", microchip: "", castrado: false, obs: "",
};

export default function AnimaisPage() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [tutores, setTutores] = useState<{ id: string; nome: string }[]>([]);

  const fetchAnimais = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/animais?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setAnimais(data);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(fetchAnimais, 300);
    return () => clearTimeout(t);
  }, [fetchAnimais]);

  useEffect(() => {
    fetch("/api/tutores?limit=200").then((r) => r.json()).then((d) => setTutores(d.tutores ?? []));
  }, []);

  function openNew() {
    setEditId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(a: Animal) {
    setEditId(a.id);
    setForm({
      ...emptyForm, ...a,
      tutorId: a.tutor.id,
      dataNasc: a.dataNasc ? a.dataNasc.slice(0, 10) : "",
      peso: a.peso ?? "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome || !form.tutorId) { toast.error("Nome e tutor são obrigatórios"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/animais/${editId}` : "/api/animais";
      const method = editId ? "PATCH" : "POST";
      const payload = { ...form, peso: form.peso ? Number(form.peso) : null };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Animal atualizado!" : "Animal cadastrado!");
      setModalOpen(false);
      fetchAnimais();
    } catch {
      toast.error("Erro ao salvar animal");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Deseja desativar este animal?")) return;
    await fetch(`/api/animais/${id}`, { method: "DELETE" });
    toast.success("Animal removido");
    fetchAnimais();
  }

  return (
    <div>
      <PageHeader
        title="Animais"
        description={`${animais.length} animais ativos`}
        actions={<Button onClick={openNew}><Plus size={16} /> Novo animal</Button>}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, raça, tutor ou microchip..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Animal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Espécie / Raça</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tutor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Idade / Peso</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : animais.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum animal encontrado</td></tr>
            ) : (
              animais.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/animais/${a.id}`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-emerald-600">
                      <span className="text-xl">{especieEmoji[a.especie]}</span>
                      {a.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <p>{especieLabel[a.especie]}</p>
                    {a.raca && <p className="text-xs text-gray-400">{a.raca}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/tutores/${a.tutor.id}`} className="text-sm text-gray-700 hover:text-emerald-600">
                      {a.tutor.nome}
                    </Link>
                    <p className="text-xs text-gray-400">{a.tutor.telefone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <p>{calcAge(a.dataNasc)}</p>
                    {a.peso && <p className="text-xs text-gray-400">{a.peso} kg</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs">{a.sexo === "MACHO" ? "♂ Macho" : "♀ Fêmea"}</span>
                      {a.castrado && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full w-fit">Castrado</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><Edit size={16} /></button>
                      <button onClick={() => remove(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Editar animal" : "Novo animal"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Select label="Tutor *" value={form.tutorId as string} onChange={(e) => setForm({ ...form, tutorId: e.target.value })}>
              <option value="">Selecione o tutor...</option>
              {tutores.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
          </div>
          <Input label="Nome do animal *" value={form.nome as string} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Select label="Espécie" value={form.especie as string} onChange={(e) => setForm({ ...form, especie: e.target.value })}>
            {Object.entries(especieLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input label="Raça" value={form.raca as string} onChange={(e) => setForm({ ...form, raca: e.target.value })} />
          <Select label="Sexo" value={form.sexo as string} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </Select>
          <Input label="Data de nascimento" type="date" value={form.dataNasc as string} onChange={(e) => setForm({ ...form, dataNasc: e.target.value })} />
          <Input label="Peso (kg)" type="number" step="0.01" value={form.peso as string} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
          <Input label="Cor" value={form.cor as string} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          <Input label="Microchip" value={form.microchip as string} onChange={(e) => setForm({ ...form, microchip: e.target.value })} />
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" id="castrado" checked={form.castrado as boolean} onChange={(e) => setForm({ ...form, castrado: e.target.checked })} className="w-4 h-4 rounded text-emerald-600" />
            <label htmlFor="castrado" className="text-sm font-medium text-gray-700">Castrado(a)</label>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.obs as string} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
