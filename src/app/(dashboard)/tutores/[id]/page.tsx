"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Phone, Mail, MapPin, Edit, PawPrint, Calendar, MessageCircle, ShoppingBag, AlertCircle, CheckCircle } from "lucide-react";
import { especieEmoji, formatCurrency, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type TutorDetalhe = {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone: string;
  celular?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  obs?: string;
  ativo: boolean;
  createdAt: string;
  animais: {
    id: string;
    nome: string;
    especie: string;
    raca?: string;
    sexo: string;
    castrado: boolean;
    dataNasc?: string;
    ativo: boolean;
    agendamentos: { id: string; inicio: string; status: string; tipo?: string }[];
    vacinas: { id: string; vacina: { nome: string }; dataVencimento?: string }[];
  }[];
  vendas: { id: string; total: number; status: string; createdAt: string }[];
  _stats: {
    totalVendido: number;
    ticketMedio: number;
    maiorVenda: number;
    primeiraVenda: string | null;
    ultimaVenda: string | null;
    qtdFechadas: number;
    saldoAberto: number;
    qtdAbertas: number;
  };
};

const emptyForm = {
  nome: "", cpf: "", email: "", telefone: "", celular: "",
  cep: "", logradouro: "", numero: "", bairro: "", cidade: "", estado: "", obs: "",
};

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function TutorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tutor, setTutor] = useState<TutorDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTutor = useCallback(async () => {
    const res = await fetch(`/api/tutores/${id}`);
    if (res.ok) setTutor(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTutor(); }, [fetchTutor]);

  function openEdit() {
    if (!tutor) return;
    setForm({
      nome: tutor.nome ?? "",
      cpf: tutor.cpf ?? "",
      email: tutor.email ?? "",
      telefone: tutor.telefone ?? "",
      celular: tutor.celular ?? "",
      cep: tutor.cep ?? "",
      logradouro: tutor.logradouro ?? "",
      numero: tutor.numero ?? "",
      bairro: tutor.bairro ?? "",
      cidade: tutor.cidade ?? "",
      estado: tutor.estado ?? "",
      obs: tutor.obs ?? "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome || !form.telefone) { toast.error("Nome e telefone são obrigatórios"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tutores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Tutor atualizado!");
      setModalOpen(false);
      fetchTutor();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!tutor) return <div className="text-center py-20 text-gray-400">Tutor não encontrado</div>;

  const { _stats: s } = tutor;
  const emDebito = s.saldoAberto > 0;
  const animaisAtivos   = tutor.animais.filter(a => a.ativo);
  const animaisInativos = tutor.animais.filter(a => !a.ativo);

  const proxAgendamentos = tutor.animais
    .flatMap(a => a.agendamentos.map(ag => ({ ...ag, animalNome: a.nome, animalId: a.id })))
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 6);

  const whatsappNum = (tutor.celular ?? tutor.telefone ?? "").replace(/\D/g, "");

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()}
          className="mt-1 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{tutor.nome}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cliente desde {formatDate(tutor.createdAt)}
            {tutor.cpf && <> &middot; CPF: {tutor.cpf}</>}
            {!tutor.ativo && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Inativo</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {whatsappNum && (
            <a href={`https://wa.me/55${whatsappNum}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition">
              <MessageCircle size={15} /> WhatsApp
            </a>
          )}
          <button onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition">
            <Edit size={15} /> Editar
          </button>
        </div>
      </div>

      {/* Grid 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── COLUNA ESQUERDA ── */}
        <div className="space-y-4">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-teal-600 font-semibold text-sm mb-4">Dados do responsável</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Nome</p>
                <p className="font-medium text-gray-900">{tutor.nome}</p>
              </div>
              {tutor.cpf && (
                <div>
                  <p className="text-xs text-gray-400">CPF</p>
                  <p className="text-gray-700">{tutor.cpf}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Cliente desde</p>
                <p className="text-gray-700">{formatDate(tutor.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-teal-600 font-semibold text-sm mb-4">Contatos</h2>
            <div className="space-y-3 text-sm">
              {tutor.celular && (
                <div>
                  <p className="text-xs text-gray-400">Celular</p>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Phone size={12} className="text-gray-400" />
                    {tutor.celular}
                    <span className="text-xs text-green-600">(WhatsApp)</span>
                  </div>
                </div>
              )}
              {tutor.telefone && (
                <div>
                  <p className="text-xs text-gray-400">Telefone</p>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Phone size={12} className="text-gray-400" />
                    {tutor.telefone}
                  </div>
                </div>
              )}
              {tutor.email && (
                <div>
                  <p className="text-xs text-gray-400">E-mail</p>
                  <div className="flex items-center gap-1.5 text-teal-600">
                    <Mail size={12} className="text-teal-400" />
                    <span className="truncate">{tutor.email}</span>
                  </div>
                </div>
              )}
              {!tutor.celular && !tutor.telefone && !tutor.email && (
                <p className="text-gray-400 text-xs">Nenhum contato cadastrado</p>
              )}
            </div>
          </div>

          {(tutor.logradouro || tutor.cep || tutor.cidade) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-teal-600 font-semibold text-sm mb-4">Endereço</h2>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {tutor.logradouro && (
                    <p>{tutor.logradouro}{tutor.numero ? `, ${tutor.numero}` : ""}</p>
                  )}
                  {tutor.bairro && <p>{tutor.bairro}</p>}
                  {tutor.cidade && (
                    <p>{tutor.cidade}{tutor.estado ? ` / ${tutor.estado}` : ""}</p>
                  )}
                  {tutor.cep && <p className="text-gray-400">CEP: {tutor.cep}</p>}
                </div>
              </div>
            </div>
          )}

          {tutor.obs && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-teal-600 font-semibold text-sm mb-3">Observações</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{tutor.obs}</p>
            </div>
          )}
        </div>

        {/* ── COLUNA CENTRAL ── */}
        <div className="space-y-4">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-teal-600 font-semibold text-sm mb-4">Saldo</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Saldo em aberto</p>
                <p className={`text-xl font-bold ${emDebito ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(s.saldoAberto)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Situação</p>
                {emDebito ? (
                  <span className="flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                    <AlertCircle size={12} /> Em débito
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                    <CheckCircle size={12} /> Em dia
                  </span>
                )}
              </div>
            </div>
            {s.qtdAbertas > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {s.qtdAbertas} venda{s.qtdAbertas > 1 ? "s" : ""} em aberto
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-teal-600 font-semibold text-sm mb-4">Vendas</h2>
            {s.qtdFechadas === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma compra realizada</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Total vendido</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(s.totalVendido)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ticket médio</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(s.ticketMedio)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Maior venda</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(s.maiorVenda)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Nº de compras</p>
                  <p className="font-semibold text-gray-900">{s.qtdFechadas}</p>
                </div>
                {s.primeiraVenda && (
                  <div>
                    <p className="text-xs text-gray-400">Primeira compra</p>
                    <p className="text-gray-700">{formatDate(s.primeiraVenda)}</p>
                  </div>
                )}
                {s.ultimaVenda && (
                  <div>
                    <p className="text-xs text-gray-400">Última compra</p>
                    <p className="text-gray-700">{formatDate(s.ultimaVenda)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {tutor.vendas.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag size={14} className="text-gray-400" />
                <h2 className="text-teal-600 font-semibold text-sm">Últimas vendas</h2>
              </div>
              <div className="space-y-1">
                {tutor.vendas.map(v => (
                  <div key={v.id}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{formatDate(v.createdAt)}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(v.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.status === "FECHADA"   ? "bg-emerald-100 text-emerald-700"
                      : v.status === "CANCELADA" ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-700"
                    }`}>
                      {v.status === "FECHADA" ? "Pago" : v.status === "CANCELADA" ? "Cancelada" : "Em aberto"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUNA DIREITA ── */}
        <div className="space-y-4">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-teal-600 font-semibold text-sm">Animais</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {animaisAtivos.length} ativo{animaisAtivos.length !== 1 ? "s" : ""}
              </span>
            </div>
            {animaisAtivos.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <PawPrint size={24} className="mx-auto mb-1 opacity-40" />
                <p className="text-sm">Nenhum animal cadastrado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {animaisAtivos.map(a => (
                  <Link key={a.id} href={`/animais/${a.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition group -mx-1">
                    <span className="text-2xl leading-none">{especieEmoji[a.especie] ?? "🐾"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-teal-700 text-sm">{a.nome}</p>
                      <p className="text-xs text-gray-400 truncate">{a.raca ?? "SRD"}</p>
                    </div>
                    {a.vacinas.some(v =>
                      v.dataVencimento && new Date(v.dataVencimento) < new Date(Date.now() + 30 * 86400000)
                    ) && (
                      <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        vacina
                      </span>
                    )}
                  </Link>
                ))}
                {animaisInativos.length > 0 && (
                  <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 mt-1">
                    +{animaisInativos.length} inativo{animaisInativos.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-gray-400" />
              <h2 className="text-teal-600 font-semibold text-sm">Agendamentos</h2>
            </div>
            {proxAgendamentos.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nenhum agendamento próximo programado.
              </p>
            ) : (
              <div className="space-y-3">
                {proxAgendamentos.map(ag => (
                  <div key={ag.id} className="flex items-start gap-2.5 text-sm">
                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar size={13} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 font-medium text-xs">
                        {new Date(ag.inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                        {" às "}
                        {new Date(ag.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <Link href={`/animais/${ag.animalId}`} className="text-xs text-teal-600 hover:underline truncate block">
                        {ag.animalNome}
                      </Link>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
                      ag.status === "CONFIRMADO" ? "bg-emerald-100 text-emerald-700"
                      : ag.status === "CANCELADO" ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600"
                    }`}>
                      {ag.status === "CONFIRMADO" ? "Conf." : ag.status === "CANCELADO" ? "Canc." : "Pend."}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edição */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar tutor" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome *" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="col-span-2" />
          <Input label="CPF" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <Input label="Telefone *" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(48) 3282-1627" />
          <Input label="Celular" value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} placeholder="(48) 98484-3282" />
          <Input label="CEP" value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} />
          <Input label="Logradouro" value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} className="col-span-2" />
          <Input label="Número" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
          <Input label="Bairro" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
          <Input label="Cidade" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
          <Select label="Estado" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
            <option value="">—</option>
            {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </Select>
          <Textarea label="Observações" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })} rows={2} className="col-span-2" />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
