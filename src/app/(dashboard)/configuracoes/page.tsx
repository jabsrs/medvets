"use client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useState } from "react";
import { toast } from "sonner";
import { Settings, Users, Tag } from "lucide-react";

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<"clinica" | "usuarios" | "tipos">("clinica");

  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie as configurações da clínica" />

      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {[
          { id: "clinica", label: "Clínica", icon: Settings },
          { id: "usuarios", label: "Usuários", icon: Users },
          { id: "tipos", label: "Tipos de atendimento", icon: Tag },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "clinica" && <ClinicaForm />}
      {tab === "usuarios" && <UsuariosForm />}
      {tab === "tipos" && <TiposForm />}
    </div>
  );
}

function ClinicaForm() {
  const [form, setForm] = useState({ nome: "Clínica MedVets", telefone: "", email: "", cidade: "", estado: "", cep: "", endereco: "" });
  const [saving, setSaving] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
      <h2 className="font-semibold text-gray-900 mb-4">Dados da clínica</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><Input label="Nome da clínica" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <Input label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
        <div className="col-span-2"><Input label="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
        <Input label="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
        <Input label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
      </div>
      <div className="mt-4">
        <Button loading={saving} onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); toast.success("Configurações salvas!"); }, 800); }}>
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function UsuariosForm() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
      <h2 className="font-semibold text-gray-900 mb-4">Gestão de usuários</h2>
      <p className="text-sm text-gray-500">Usuários do sistema e perfis de acesso. Em breve.</p>
    </div>
  );
}

function TiposForm() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
      <h2 className="font-semibold text-gray-900 mb-4">Tipos de atendimento</h2>
      <p className="text-sm text-gray-500">Configure os tipos de atendimento, cores e durações. Em breve.</p>
    </div>
  );
}
