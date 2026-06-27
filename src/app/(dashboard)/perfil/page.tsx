"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, Save, User } from "lucide-react";

export default function PerfilPage() {
  const { data: session } = useSession();
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!form.senhaAtual || !form.novaSenha || !form.confirmar) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (form.novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (form.novaSenha !== form.confirmar) {
      toast.error("A nova senha e a confirmação não coincidem");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/perfil/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error || "Erro ao trocar senha");
    } else {
      toast.success("Senha alterada com sucesso!");
      setForm({ senhaAtual: "", novaSenha: "", confirmar: "" });
    }
  }

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrador",
    VETERINARIO: "Médico(a) Veterinário(a)",
    ATENDENTE: "Secretaria / Atendente",
    FINANCEIRO: "Financeiro",
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h1>

      {/* Dados do usuário */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{session?.user?.name}</p>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              {roleLabel[session?.user?.role ?? ""] ?? session?.user?.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 border-t border-gray-100 pt-3">
          <User size={12} />
          <span>Para alterar nome ou e-mail, peça ao administrador em Usuários</span>
        </div>
      </div>

      {/* Trocar senha */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Trocar Senha</h2>
        <form onSubmit={trocarSenha} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
            <div className="relative">
              <input
                type={showAtual ? "text" : "password"}
                value={form.senhaAtual}
                onChange={e => setForm(f => ({ ...f, senhaAtual: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Digite sua senha atual"
              />
              <button type="button" onClick={() => setShowAtual(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                {showAtual ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <div className="relative">
              <input
                type={showNova ? "text" : "password"}
                value={form.novaSenha}
                onChange={e => setForm(f => ({ ...f, novaSenha: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" onClick={() => setShowNova(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                {showNova ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={form.confirmar}
                onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Repita a nova senha"
              />
              <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Trocar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
