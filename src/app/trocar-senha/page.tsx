"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export default function TrocarSenhaPage() {
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmar: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.novaSenha !== form.confirmar) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (form.novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/perfil/senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual: form.senhaAtual, novaSenha: form.novaSenha }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Senha alterada! Faça login novamente.");
      await signOut({ callbackUrl: "/login" });
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Erro ao alterar senha");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-full mx-auto mb-4">
            <ShieldCheck size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Troca de senha obrigatória</h1>
          <p className="text-gray-500 text-sm mt-2">
            Por segurança, defina uma nova senha personalizada antes de continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual (temporária)</label>
            <input
              type="password"
              required
              value={form.senhaAtual}
              onChange={(e) => setForm({ ...form, senhaAtual: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input
              type="password"
              required
              value={form.novaSenha}
              onChange={(e) => setForm({ ...form, novaSenha: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              required
              value={form.confirmar}
              onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Repita a nova senha"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">
          MedVets © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
