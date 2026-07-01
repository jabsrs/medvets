"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Building2, Phone, MapPin } from "lucide-react";

type Fornecedor = {
  id: string; nome: string; cnpj?: string; ie?: string;
  telefone?: string; email?: string;
  logradouro?: string; numero?: string; bairro?: string; cidade?: string; estado?: string;
  ativo: boolean; createdAt: string;
};

const emptyForm = {
  nome: "", cnpj: "", ie: "", telefone: "", email: "",
  logradouro: "", numero: "", bairro: "", cidade: "", estado: "",
};

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [busca, setBusca]               = useState("");
  const [modal, setModal]               = useState(false);
  const [editing, setEditing]           = useState<Fornecedor | null>(null);
  const [form, setForm]                 = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving]             = useState(false);
  const [somenteAtivos, setSomenteAtivos] = useState(true);

  const fetch_ = useCallback(async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/fornecedores?q=${encodeURIComponent(q)}&all=1`);
    setFornecedores(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  function f(k: string) { return (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value })); }

  function abrirNovo() { setEditing(null); setForm({ ...emptyForm }); setModal(true); }
  function abrirEditar(f: Fornecedor) {
    setEditing(f);
    setForm({
      nome: f.nome ?? "", cnpj: f.cnpj ?? "", ie: f.ie ?? "",
      telefone: f.telefone ?? "", email: f.email ?? "",
      logradouro: f.logradouro ?? "", numero: f.numero ?? "",
      bairro: f.bairro ?? "", cidade: f.cidade ?? "", estado: f.estado ?? "",
    });
    setModal(true);
  }

  async function save() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome, cnpj: form.cnpj || null, ie: form.ie || null,
        telefone: form.telefone || null, email: form.email || null,
        logradouro: form.logradouro || null, numero: form.numero || null,
        bairro: form.bairro || null, cidade: form.cidade || null, estado: form.estado || null,
      };
      if (editing) {
        await fetch(`/api/fornecedores/${editing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Fornecedor atualizado");
      } else {
        const res = await fetch("/api/fornecedores", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        toast.success("Fornecedor criado");
      }
      setModal(false); fetch_();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar fornecedor");
    } finally { setSaving(false); }
  }

  async function toggleAtivo(forn: Fornecedor) {
    await fetch(`/api/fornecedores/${forn.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !forn.ativo }),
    });
    toast.success(forn.ativo ? "Fornecedor inativado" : "Fornecedor reativado");
    fetch_();
  }

  async function excluir(forn: Fornecedor) {
    if (!confirm(`Excluir "${forn.nome}"?`)) return;
    const res = await fetch(`/api/fornecedores/${forn.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Fornecedor excluído"); fetch_(); }
    else { const e = await res.json(); toast.error(e.error ?? "Não foi possível excluir"); }
  }

  const lista = fornecedores.filter(f => {
    if (somenteAtivos && !f.ativo) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return f.nome.toLowerCase().includes(q) || (f.cnpj ?? "").includes(q) || (f.cidade ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        description="Distribuidoras, laboratórios e prestadores de serviço"
        actions={<Button onClick={abrirNovo}><Plus size={16} /> Novo fornecedor</Button>}
      />

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => { setBusca(e.target.value); fetch_(e.target.value); }}
            placeholder="Buscar por nome, CNPJ ou cidade..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={somenteAtivos} onChange={e => setSomenteAtivos(e.target.checked)}
            className="rounded text-teal-600" />
          Somente ativos
        </label>
        <span className="text-sm text-gray-400">{lista.length} resultado(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fornecedor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contato</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Localização</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  <Building2 size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 text-sm">Nenhum fornecedor cadastrado</p>
                  <button onClick={abrirNovo} className="mt-2 text-sm text-teal-600 hover:underline">+ Cadastrar fornecedor</button>
                </td>
              </tr>
            ) : lista.map(forn => (
              <tr key={forn.id} className={`hover:bg-gray-50 transition-colors ${!forn.ativo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Building2 size={15} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{forn.nome}</p>
                      {forn.ie && <p className="text-xs text-gray-400">IE: {forn.ie}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                  {forn.cnpj ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <div className="space-y-0.5">
                    {forn.telefone && <div className="flex items-center gap-1"><Phone size={11} />{forn.telefone}</div>}
                    {forn.email && <div className="text-xs text-gray-400">{forn.email}</div>}
                    {!forn.telefone && !forn.email && <span className="text-gray-300">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {forn.cidade ? (
                    <div className="flex items-center gap-1"><MapPin size={11} className="flex-shrink-0" />{forn.cidade}{forn.estado ? `/${forn.estado}` : ""}</div>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={forn.ativo ? "success" : "default"}>
                    {forn.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => abrirEditar(forn)}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => toggleAtivo(forn)}
                      className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                      title={forn.ativo ? "Inativar" : "Reativar"}>
                      {forn.ativo ? "⏸" : "▶"}
                    </button>
                    <button onClick={() => excluir(forn)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? "Editar fornecedor" : "Novo fornecedor"} size="lg">
        <div className="space-y-4">
          <Input label="Nome / Razão Social *" value={form.nome} onChange={f("nome")} placeholder="Ex: Distribuidora MedPet Ltda" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="CNPJ" value={form.cnpj} onChange={f("cnpj")} placeholder="00.000.000/0000-00" />
            <Input label="Inscrição Estadual" value={form.ie} onChange={f("ie")} placeholder="IE" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" value={form.telefone} onChange={f("telefone")} placeholder="(00) 00000-0000" />
            <Input label="E-mail" type="email" value={form.email} onChange={f("email")} placeholder="fornecedor@email.com" />
          </div>
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input label="Logradouro" value={form.logradouro} onChange={f("logradouro")} placeholder="Rua, Av..." />
              </div>
              <Input label="Número" value={form.numero} onChange={f("numero")} placeholder="123" />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Input label="Bairro" value={form.bairro} onChange={f("bairro")} />
              <Input label="Cidade" value={form.cidade} onChange={f("cidade")} />
              <Input label="UF" value={form.estado} onChange={f("estado")} placeholder="SP" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
