"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, Pencil, Power, X, Eye, EyeOff } from "lucide-react";

type Role = "ADMIN" | "VETERINARIO" | "ATENDENTE" | "FINANCEIRO";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: Role;
  crmv?: string;
  specialty?: string;
  phone?: string;
  active: boolean;
}

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  VETERINARIO: "Médico(a) Veterinário(a)",
  ATENDENTE: "Secretaria / Atendente",
  FINANCEIRO: "Financeiro",
};

const roleColors: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  VETERINARIO: "bg-blue-100 text-blue-700",
  ATENDENTE: "bg-green-100 text-green-700",
  FINANCEIRO: "bg-orange-100 text-orange-700",
};

const empty = { name: "", email: "", password: "", role: "ATENDENTE" as Role, crmv: "", specialty: "", phone: "" };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState(empty);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/usuarios");
    const data = await res.json();
    setUsuarios(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setShowPass(false);
    setModal(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, crmv: u.crmv || "", specialty: u.specialty || "", phone: u.phone || "" });
    setShowPass(false);
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.email) { toast.error("Nome e e-mail são obrigatórios"); return; }
    if (!editing && !form.password) { toast.error("Senha é obrigatória para novo usuário"); return; }

    setSaving(true);
    const body: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, crmv: form.crmv || null, specialty: form.specialty || null, phone: form.phone || null };
    if (form.password) body.password = form.password;

    const url = editing ? `/api/usuarios/${editing.id}` : "/api/usuarios";
    const method = editing ? "PATCH" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Erro ao salvar");
    } else {
      toast.success(editing ? "Usuário atualizado!" : "Usuário criado!");
      setModal(false);
      load();
    }
    setSaving(false);
  };

  const toggleActive = async (u: Usuario) => {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (res.ok) {
      toast.success(u.active ? "Usuário desativado" : "Usuário reativado");
      load();
    }
  };

  const ativos = usuarios.filter(u => u.active);
  const inativos = usuarios.filter(u => !u.active);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie quem tem acesso ao sistema</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium">
          <UserPlus size={18} /> Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Usuários Ativos ({ativos.length})</span>
            </div>
            {ativos.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Nenhum usuário ativo</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 font-medium">E-mail</th>
                    <th className="text-left px-4 py-3 font-medium">Perfil</th>
                    <th className="text-left px-4 py-3 font-medium">CRMV</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ativos.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        {u.specialty && <div className="text-xs text-gray-400">{u.specialty}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColors[u.role]}`}>
                          {roleLabels[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.crmv || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(u)} title="Editar" className="text-gray-400 hover:text-blue-600 transition">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => toggleActive(u)} title="Desativar" className="text-gray-400 hover:text-red-500 transition">
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {inativos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-semibold text-gray-500">Usuários Inativos ({inativos.length})</span>
              </div>
              <table className="w-full">
                <tbody className="divide-y divide-gray-50">
                  {inativos.map(u => (
                    <tr key={u.id} className="opacity-60">
                      <td className="px-4 py-3 text-sm text-gray-500">{u.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{roleLabels[u.role]}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{u.crmv || "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(u)} title="Reativar" className="text-gray-400 hover:text-green-600 transition">
                          <Power size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{editing ? "Editar Usuário" : "Novo Usuário"}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="email@clinica.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editing ? "Nova senha (deixe em branco para não alterar)" : "Senha *"}
                </label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de acesso *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {form.role === "VETERINARIO" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CRMV</label>
                    <input value={form.crmv} onChange={e => setForm(f => ({ ...f, crmv: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: SP-12345" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade</label>
                    <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ex: Clínica Geral, Ortopedia..." />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
