"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, Phone, Mail, PawPrint, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { especieEmoji } from "@/lib/utils";
import { ORIGENS_CLIENTE } from "@/lib/origens";

type Tutor = {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone: string;
  celular?: string;
  dataNasc?: string;
  origem?: string;
  cidade?: string;
  estado?: string;
  animais: { id: string; nome: string; especie: string }[];
};

const emptyForm = {
  nome: "", cpf: "", email: "", telefone: "", celular: "", dataNasc: "", origem: "",
  cep: "", logradouro: "", numero: "", bairro: "", cidade: "", estado: "", obs: "",
};

export default function TutoresPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTutores = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tutores?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTutores(data.tutores ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(fetchTutores, 300);
    return () => clearTimeout(t);
  }, [fetchTutores]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(t: Tutor) {
    setEditId(t.id);
    setForm({
      ...emptyForm, ...t,
      dataNasc: t.dataNasc ? t.dataNasc.slice(0, 10) : "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome || !form.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/tutores/${editId}` : "/api/tutores";
      const method = editId ? "PATCH" : "POST";
      const payload = { ...form, dataNasc: form.dataNasc || null, origem: form.origem || null };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast.success(editId ? "Tutor atualizado!" : "Tutor cadastrado!");
      setModalOpen(false);
      fetchTutores();
    } catch {
      toast.error("Erro ao salvar tutor");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Deseja desativar este tutor?")) return;
    await fetch(`/api/tutores/${id}`, { method: "DELETE" });
    toast.success("Tutor removido");
    fetchTutores();
  }

  const estados = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <div>
      <PageHeader
        title="Tutores"
        description={`${total} tutores cadastrados`}
        actions={
          <Button onClick={openNew}>
            <Plus size={16} /> Novo tutor
          </Button>
        }
      />

      {/* Busca */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, CPF, email ou telefone..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tutor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Animais</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cidade</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : tutores.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhum tutor encontrado</td></tr>
            ) : (
              tutores.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/tutores/${t.id}`} className="font-medium text-gray-900 hover:text-emerald-600">
                      {t.nome}
                    </Link>
                    {t.cpf && <p className="text-xs text-gray-500">CPF: {t.cpf}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-700 flex items-center gap-1">
                        <Phone size={12} className="text-gray-400" /> {t.telefone}
                      </span>
                      {t.email && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail size={12} className="text-gray-400" /> {t.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {t.animais.slice(0, 3).map((a) => (
                        <span key={a.id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                          {especieEmoji[a.especie]} {a.nome}
                        </span>
                      ))}
                      {t.animais.length > 3 && (
                        <span className="text-xs text-gray-500">+{t.animais.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {t.cidade && t.estado ? `${t.cidade}/${t.estado}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => remove(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Editar tutor" : "Novo tutor"} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome completo *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do tutor" />
          </div>
          <Input label="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
          <Input label="Telefone *" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
          <Input label="Celular" value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} placeholder="(11) 99999-9999" />
          <Input label="Data de nascimento" type="date" value={form.dataNasc} onChange={(e) => setForm({ ...form, dataNasc: e.target.value })} />
          <Select label="Como conheceu a clínica?" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })}>
            <option value="">Não informado</option>
            {ORIGENS_CLIENTE.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
          <Input label="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" />
          <Input label="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          <div className="col-span-2">
            <Input label="Logradouro" value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} placeholder="Rua, Avenida..." />
          </div>
          <Input label="Bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
          <Input label="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="">Selecione...</option>
            {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </Select>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
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
