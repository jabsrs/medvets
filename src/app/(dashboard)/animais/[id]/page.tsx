"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Stethoscope, Weight, Syringe, Calendar, Phone, Mail, Plus, FlaskConical, FileText, Printer, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle } from "lucide-react";
import { especieEmoji, calcAge, formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Atendimento = {
  id: string; data: string; queixa?: string; diagnostico?: string; tratamento?: string;
  medico: { name: string };
  receitas: { medicamento: string; dose?: string; frequencia?: string }[];
  exameClinico?: { peso?: number; temperatura?: number; freqCardiaca?: number };
};
type Vacina = {
  id: string; dataAplicacao: string; dataVencimento?: string; lote?: string;
  vacina: { nome: string; fabricante?: string };
};
type CatalogoVacina = { id: string; nome: string; fabricante?: string; intervaloDias: number };
type Peso = { id: string; data: string; peso: number };
type Agendamento = { id: string; inicio: string; status: string; tipo?: { nome: string; cor: string } };
type Animal = {
  id: string; nome: string; especie: string; raca?: string; sexo: string;
  dataNasc?: string; peso?: number; cor?: string; castrado: boolean; microchip?: string; obs?: string;
  tutor: { id: string; nome: string; telefone: string; celular?: string; email?: string };
  atendimentos: Atendimento[];
  vacinas: Vacina[];
  pesos: Peso[];
  agendamentos: Agendamento[];
};
type PropostaItemForm = {
  produtoId: string; nomeProduto: string; unidade: string;
  quantidade: number; preco: number; desconto: number;
};
type PropostaDB = {
  id: string; status: string; validade: string; obs?: string; total: number; createdAt: string;
  user: { name: string };
  itens: { id: string; produtoId: string; quantidade: number; preco: number; desconto: number; subtotal: number; produto: { id: string; nome: string; tipo: string; unidade: string } }[];
};
type ProdutoBusca = { id: string; nome: string; preco: number; unidade: string; tipo: string };

const statusColor: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-700", CONFIRMADO: "bg-emerald-100 text-emerald-700",
  EM_ATENDIMENTO: "bg-amber-100 text-amber-700", CONCLUIDO: "bg-gray-100 text-gray-600",
  CANCELADO: "bg-red-100 text-red-600", FALTOU: "bg-purple-100 text-purple-700",
};
const statusLabel: Record<string, string> = {
  AGENDADO: "Agendado", CONFIRMADO: "Confirmado", EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído", CANCELADO: "Cancelado", FALTOU: "Faltou",
};

const emptyExame = { peso: "", temperatura: "", freqCardiaca: "", freqResp: "", tpc: "", hidratacao: "", mucosas: "", linfonodos: "" };
const emptyForm  = { medicoId: "", queixa: "", diagnostico: "", tratamento: "", retorno: "", obs: "" };

export default function AnimalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [animal, setAnimal]   = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("historico");

  // modals
  const [modalAtend, setModalAtend] = useState(false);
  const [modalPeso, setModalPeso]   = useState(false);
  const [form, setForm]             = useState<Record<string, string>>({ ...emptyForm });
  const [exame, setExame]           = useState<Record<string, string>>({ ...emptyExame });
  const [receitas, setReceitas]     = useState([{ medicamento: "", dose: "", frequencia: "", duracao: "" }]);
  const [novoPeso, setNovoPeso]     = useState("");
  const [vets, setVets]             = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]         = useState(false);

  // Vacina modal
  const [modalVacina, setModalVacina] = useState(false);
  const [catalogo, setCatalogo]       = useState<CatalogoVacina[]>([]);
  const [vacinaForm, setVacinaForm]   = useState({ vacinaId: "", nomeCustom: "", lote: "", dataAplicacao: new Date().toISOString().slice(0,10), dataVencimento: "" });

  // Exame modal
  const [modalExame, setModalExame] = useState(false);
  const [exameForm, setExameForm]   = useState({ nome: "", tipo: "LABORATORIAL", obs: "" });

  // Orçamentos (propostas)
  const [propostas, setPropostas]         = useState<PropostaDB[]>([]);
  const [loadingPropostas, setLoadingPropostas] = useState(false);
  const [propostasCarregadas, setPropostasCarregadas] = useState(false);
  const [modalProposta, setModalProposta] = useState(false);
  const [editingProposta, setEditingProposta] = useState<PropostaDB | null>(null);
  const [propostaForm, setPropostaForm]   = useState({ validade: "", obs: "" });
  const [propostaItens, setPropostaItens] = useState<PropostaItemForm[]>([]);
  const [expandedProposta, setExpandedProposta] = useState<string | null>(null);
  const [produtoBusca, setProdutoBusca]   = useState("");
  const [produtoResults, setProdutoResults] = useState<ProdutoBusca[]>([]);
  const [buscandoProduto, setBuscandoProduto] = useState(false);

  const fetchAnimal = useCallback(async () => {
    const res = await fetch(`/api/animais/${id}`);
    if (res.ok) setAnimal(await res.json());
    setLoading(false);
  }, [id]);

  const fetchPropostas = useCallback(async () => {
    setLoadingPropostas(true);
    const res = await fetch(`/api/propostas?animalId=${id}`);
    if (res.ok) setPropostas(await res.json());
    setLoadingPropostas(false);
    setPropostasCarregadas(true);
  }, [id]);

  useEffect(() => { fetchAnimal(); }, [fetchAnimal]);
  useEffect(() => {
    fetch("/api/usuarios?role=VETERINARIO").then(r => r.json()).then(setVets);
    fetch("/api/vacinas/catalogo").then(r => r.json()).then(setCatalogo);
  }, []);

  async function saveAtendimento() {
    if (!form.medicoId) { toast.error("Selecione a veterinária"); return; }
    setSaving(true);
    try {
      const payload = {
        animalId: id, ...form,
        exameClinico: Object.values(exame).some(Boolean) ? exame : undefined,
        receitas: receitas.filter(r => r.medicamento),
      };
      const res = await fetch("/api/atendimentos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Atendimento registrado!");
      setModalAtend(false);
      setForm({ ...emptyForm }); setExame({ ...emptyExame });
      setReceitas([{ medicamento: "", dose: "", frequencia: "", duracao: "" }]);
      fetchAnimal();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function savePeso() {
    if (!novoPeso) { toast.error("Informe o peso"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/animais/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peso: Number(novoPeso) }),
      });
      await fetch("/api/pesos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId: id, peso: Number(novoPeso) }),
      }).catch(() => null); // ok se não tiver rota dedicada
      if (!res.ok) throw new Error();
      toast.success("Peso registrado!");
      setModalPeso(false); setNovoPeso("");
      fetchAnimal();
    } catch { toast.error("Erro ao salvar peso"); }
    finally { setSaving(false); }
  }

  async function saveVacina() {
    const vacinaId = vacinaForm.vacinaId;
    const nomeCustom = vacinaForm.nomeCustom.trim();
    if (!vacinaId && !nomeCustom) { toast.error("Selecione ou informe a vacina"); return; }
    if (!vacinaForm.dataAplicacao) { toast.error("Informe a data de aplicação"); return; }
    setSaving(true);
    try {
      let finalVacinaId = vacinaId;
      if (!vacinaId && nomeCustom) {
        const res = await fetch("/api/vacinas/catalogo", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: nomeCustom }),
        });
        const nova = await res.json();
        finalVacinaId = nova.id;
      }
      const res = await fetch("/api/vacinas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalId: id,
          vacinaId: finalVacinaId,
          lote: vacinaForm.lote || null,
          dataAplicacao: new Date(vacinaForm.dataAplicacao + "T12:00:00"),
          dataVencimento: vacinaForm.dataVencimento ? new Date(vacinaForm.dataVencimento + "T12:00:00") : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Vacina registrada!");
      setModalVacina(false);
      setVacinaForm({ vacinaId: "", nomeCustom: "", lote: "", dataAplicacao: new Date().toISOString().slice(0,10), dataVencimento: "" });
      fetchAnimal();
      fetch("/api/vacinas/catalogo").then(r => r.json()).then(setCatalogo);
    } catch { toast.error("Erro ao salvar vacina"); }
    finally { setSaving(false); }
  }

  async function buscarProdutos(q: string) {
    if (!q.trim()) { setProdutoResults([]); return; }
    setBuscandoProduto(true);
    const res = await fetch(`/api/produtos?q=${encodeURIComponent(q)}&limit=8`);
    if (res.ok) setProdutoResults(await res.json());
    setBuscandoProduto(false);
  }

  function adicionarItem(produto: ProdutoBusca) {
    const jaExiste = propostaItens.find(i => i.produtoId === produto.id);
    if (jaExiste) {
      setPropostaItens(propostaItens.map(i =>
        i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ));
    } else {
      setPropostaItens([...propostaItens, {
        produtoId: produto.id, nomeProduto: produto.nome,
        unidade: produto.unidade, quantidade: 1, preco: produto.preco, desconto: 0,
      }]);
    }
    setProdutoBusca(""); setProdutoResults([]);
  }

  function removerItem(idx: number) {
    setPropostaItens(propostaItens.filter((_, i) => i !== idx));
  }

  function abrirNovaProposta() {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 3);
    setEditingProposta(null);
    setPropostaItens([]);
    setPropostaForm({ validade: hoje.toISOString().slice(0, 10), obs: "" });
    setProdutoBusca(""); setProdutoResults([]);
    setModalProposta(true);
  }

  function abrirEditarProposta(p: PropostaDB) {
    setEditingProposta(p);
    setPropostaItens(p.itens.map(i => ({
      produtoId: i.produtoId, nomeProduto: i.produto.nome,
      unidade: i.produto.unidade, quantidade: i.quantidade, preco: i.preco, desconto: i.desconto,
    })));
    setPropostaForm({
      validade: p.validade.slice(0, 10),
      obs: p.obs ?? "",
    });
    setProdutoBusca(""); setProdutoResults([]);
    setModalProposta(true);
  }

  async function saveProposta() {
    if (propostaItens.length === 0) { toast.error("Adicione ao menos um item"); return; }
    setSaving(true);
    try {
      const payload = {
        animalId: id, tutorId: animal?.tutor.id,
        validade: propostaForm.validade, obs: propostaForm.obs,
        itens: propostaItens,
      };
      const url  = editingProposta ? `/api/propostas/${editingProposta.id}` : "/api/propostas";
      const meth = editingProposta ? "PATCH" : "POST";
      const res  = await fetch(url, {
        method: meth, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success(editingProposta ? "Orçamento atualizado!" : "Orçamento criado!");
      setModalProposta(false);
      fetchPropostas();
    } catch { toast.error("Erro ao salvar orçamento"); }
    finally { setSaving(false); }
  }

  async function alterarStatusProposta(propostaId: string, status: string) {
    const res = await fetch(`/api/propostas/${propostaId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated: PropostaDB = await res.json();
      setPropostas(propostas.map(p => p.id === propostaId ? updated : p));
      toast.success("Status atualizado!");
    } else {
      toast.error("Erro ao alterar status");
    }
  }

  async function deletarProposta(propostaId: string) {
    if (!confirm("Excluir este orçamento?")) return;
    const res = await fetch(`/api/propostas/${propostaId}`, { method: "DELETE" });
    if (res.ok) {
      setPropostas(propostas.filter(p => p.id !== propostaId));
      toast.success("Orçamento excluído");
    } else {
      toast.error("Erro ao excluir");
    }
  }

  function imprimirProposta(p: PropostaDB, animalData: Animal) {
    const linhas = p.itens.map(i =>
      `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 8px">${i.produto.nome}</td>
        <td style="padding:6px 8px;text-align:center">${i.quantidade} ${i.produto.unidade}</td>
        <td style="padding:6px 8px;text-align:right">R$ ${i.preco.toFixed(2)}</td>
        <td style="padding:6px 8px;text-align:center">${i.desconto > 0 ? i.desconto + "%" : "—"}</td>
        <td style="padding:6px 8px;text-align:right">R$ ${i.subtotal.toFixed(2)}</td>
      </tr>`
    ).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orçamento</title>
    <style>body{font-family:Arial,sans-serif;margin:32px;color:#222}h1{font-size:20px;margin:0}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#f5f5f5;padding:8px;text-align:left;font-size:12px;border-bottom:2px solid #ddd}
    .total{text-align:right;font-size:16px;font-weight:bold;margin-top:12px}
    .footer{margin-top:32px;font-size:12px;color:#666}
    @media print{.no-print{display:none}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><h1>MedVets — Orçamento</h1><p style="color:#666;font-size:13px;margin:4px 0">CRMV/SC 14192</p></div>
      <div style="text-align:right;font-size:13px">
        <p>Data: ${new Date(p.createdAt).toLocaleDateString("pt-BR")}</p>
        <p>Válido até: ${new Date(p.validade).toLocaleDateString("pt-BR")}</p>
      </div>
    </div>
    <hr style="margin:16px 0;border:none;border-top:1px solid #ddd">
    <p><strong>Paciente:</strong> ${animalData.nome} (${animalData.especie.toLowerCase()}, ${animalData.raca ?? "SRD"})</p>
    <p><strong>Tutor:</strong> ${animalData.tutor.nome}</p>
    ${p.obs ? `<p><strong>Obs:</strong> ${p.obs}</p>` : ""}
    <table>
      <thead><tr>
        <th>Produto / Serviço</th><th style="text-align:center">Qtd</th>
        <th style="text-align:right">Preço</th><th style="text-align:center">Desconto</th>
        <th style="text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p class="total">Total: R$ ${p.total.toFixed(2)}</p>
    <div class="footer">
      <p>Profissional responsável: ${p.user.name}</p>
      <p>Este orçamento não constitui nota fiscal.</p>
    </div>
    <div class="no-print" style="margin-top:24px;text-align:center">
      <button onclick="window.print()" style="padding:10px 24px;background:#0d9488;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir</button>
    </div>
    </body></html>`;
    const win = window.open("", "_blank", "width=800,height=600");
    if (win) { win.document.write(html); win.document.close(); }
  }

  async function saveExame() {
    if (!exameForm.nome.trim()) { toast.error("Informe o nome do exame"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/exames", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId: id, nome: exameForm.nome, tipo: exameForm.tipo, obs: exameForm.obs || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Exame solicitado!");
      setModalExame(false);
      setExameForm({ nome: "", tipo: "LABORATORIAL", obs: "" });
    } catch { toast.error("Erro ao salvar exame"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!animal) return <div className="text-center py-20 text-gray-400">Animal não encontrado</div>;

  const vencidas   = animal.vacinas.filter(v => v.dataVencimento && new Date(v.dataVencimento) < new Date());
  const pesoAtual  = animal.pesos[0]?.peso ?? animal.peso;

  // group atendimentos by year
  const byYear = animal.atendimentos.reduce<Record<string, Atendimento[]>>((acc, a) => {
    const y = new Date(a.data).getFullYear().toString();
    if (!acc[y]) acc[y] = [];
    acc[y].push(a);
    return acc;
  }, {});

  return (
    // Break out of the p-6 wrapper to achieve full-height split
    <div className="-mx-6 -my-6 flex" style={{ minHeight: "calc(100vh - 64px)" }}>

      {/* ── LEFT: Tutor panel ────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
        <div className="p-5 flex-1">
          {/* Tutor name */}
          <Link href={`/tutores/${animal.tutor.id}`}
            className="block text-xl font-bold text-gray-900 hover:text-teal-600 transition leading-tight mb-1">
            {animal.tutor.nome}
          </Link>

          {/* Contatos */}
          <div className="space-y-1.5 mt-3">
            {animal.tutor.celular && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                <span>{animal.tutor.celular} — Celular</span>
              </div>
            )}
            {animal.tutor.telefone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                <span>{animal.tutor.telefone}</span>
              </div>
            )}
            {animal.tutor.email && (
              <div className="flex items-center gap-2 text-sm text-teal-600">
                <Mail size={13} className="text-teal-400 flex-shrink-0" />
                <span>{animal.tutor.email}</span>
              </div>
            )}
          </div>

          {/* Outros animais do tutor — placeholder para expansão futura */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link href={`/tutores/${animal.tutor.id}`}
              className="text-xs text-teal-600 hover:underline">
              Ver perfil completo →
            </Link>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Animal panel ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-gray-50">

        {/* Animal header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {especieEmoji[animal.especie] ?? "🐾"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">{animal.nome}</h2>
                {vencidas.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {vencidas.length} vacina(s) vencida(s)
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {animal.raca ?? "SRD"}
                {animal.cor ? `, ${animal.cor}` : ""}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-600">
                <span>{animal.sexo === "MACHO" ? "Macho" : "Fêmea"}{animal.castrado ? ", Castrado(a)" : ""}</span>
                {pesoAtual ? <span>{pesoAtual} kg</span> : <span className="text-gray-400">Peso não informado</span>}
                {animal.dataNasc && <span>{calcAge(animal.dataNasc)}</span>}
              </div>
            </div>
          </div>
          {/* Species photo placeholder */}
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
            {especieEmoji[animal.especie] ?? "🐾"}
          </div>
        </div>

        {/* Obs */}
        {animal.obs && (
          <div className="mx-6 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-800">
            📝 {animal.obs}
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 mt-4">
          <div className="flex border-b border-gray-200 gap-1">
            {[
              { id: "historico",  label: "Histórico",  icon: Stethoscope },
              { id: "vacinas",    label: "Vacinas",    icon: Syringe },
              { id: "peso",       label: "Peso",       icon: Weight },
              { id: "agenda",     label: "Agenda",     icon: Calendar },
              { id: "orcamentos", label: "Orçamentos", icon: FileText },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "orcamentos" && !propostasCarregadas) fetchPropostas(); }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.id
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Adicionar buttons (sempre visíveis, estilo SimplesVet) ── */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adicionar</p>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Atendimento", color: "#0d9488", icon: "🩺", action: () => setModalAtend(true) },
              { label: "Peso",        color: "#d97706", icon: "⚖️",  action: () => setModalPeso(true) },
              { label: "Vacina",      color: "#7c3aed", icon: "💉",  action: () => { setTab("vacinas"); setModalVacina(true); } },
              { label: "Exame",       color: "#dc2626", icon: "🔬",  action: () => setModalExame(true) },
            { label: "Orçamento",   color: "#0891b2", icon: "📋",  action: () => { setTab("orcamentos"); if (!propostasCarregadas) fetchPropostas(); abrirNovaProposta(); } },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-white text-sm font-medium hover:opacity-90 transition shadow-sm"
                style={{ backgroundColor: btn.color }}>
                <span className="text-2xl">{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-6 pb-8">

          {/* Histórico */}
          {tab === "historico" && (
            <div>
              {animal.atendimentos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                  Nenhum atendimento registrado. Clique em &quot;Atendimento&quot; acima para adicionar.
                </div>
              ) : Object.entries(byYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, ats]) => (
                <div key={year} className="mb-6">
                  <h3 className="text-base font-bold text-gray-700 mb-3">{year}</h3>
                  <div className="space-y-0 border-l-2 border-gray-200 pl-4 ml-1">
                    {ats.map(a => (
                      <div key={a.id} className="relative pb-5">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-xs text-gray-400">
                                {new Date(a.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                {" às "}
                                {new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <p className="text-xs font-medium text-teal-600 mt-0.5">Atendimento</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                                {a.medico.name[0]}
                              </div>
                              <span className="text-xs text-gray-500">{a.medico.name}</span>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            {a.queixa && <p><span className="font-medium text-gray-700">Queixa:</span> <span className="text-gray-600">{a.queixa}</span></p>}
                            {a.diagnostico && <p><span className="font-medium text-gray-700">Diagnóstico:</span> <span className="text-gray-600">{a.diagnostico}</span></p>}
                            {a.tratamento && <p><span className="font-medium text-gray-700">Tratamento:</span> <span className="text-gray-600">{a.tratamento}</span></p>}
                            {a.exameClinico && (a.exameClinico.peso || a.exameClinico.temperatura || a.exameClinico.freqCardiaca) && (
                              <div className="flex gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                {a.exameClinico.peso && <span>⚖️ {a.exameClinico.peso} kg</span>}
                                {a.exameClinico.temperatura && <span>🌡️ {a.exameClinico.temperatura}°C</span>}
                                {a.exameClinico.freqCardiaca && <span>❤️ {a.exameClinico.freqCardiaca} bpm</span>}
                              </div>
                            )}
                          </div>
                          {a.receitas.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs font-medium text-gray-500 mb-1">Receituário</p>
                              {a.receitas.map((r, i) => (
                                <p key={i} className="text-xs text-gray-600">
                                  💊 {r.medicamento}{r.dose ? ` — ${r.dose}` : ""}{r.frequencia ? ` · ${r.frequencia}` : ""}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vacinas */}
          {tab === "vacinas" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {animal.vacinas.length === 0 ? (
                <div className="p-10 text-center text-gray-400">Nenhuma vacina registrada</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vacina</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aplicação</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {animal.vacinas.map(v => {
                      const vencida  = v.dataVencimento && new Date(v.dataVencimento) < new Date();
                      const vencendo = v.dataVencimento && !vencida && new Date(v.dataVencimento) < new Date(Date.now() + 30 * 86400000);
                      return (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{v.vacina.nome}</p>
                            {v.vacina.fabricante && <p className="text-xs text-gray-400">{v.vacina.fabricante}</p>}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(v.dataAplicacao)}</td>
                          <td className="px-4 py-3 text-gray-600">{v.dataVencimento ? formatDate(v.dataVencimento) : "—"}</td>
                          <td className="px-4 py-3">
                            {vencida  ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Vencida</span>
                            : vencendo ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Vence em breve</span>
                            : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Em dia</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Peso */}
          {tab === "peso" && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {animal.pesos.length === 0 ? (
                <div className="p-10 text-center text-gray-400">Nenhum registro. Clique em &quot;Peso&quot; acima para registrar.</div>
              ) : (
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center gap-6">
                    <div>
                      <p className="text-xs text-gray-400">Peso atual</p>
                      <p className="text-2xl font-bold text-teal-600">{animal.pesos[0].peso} kg</p>
                    </div>
                    {animal.pesos.length > 1 && (() => {
                      const diff = animal.pesos[0].peso - animal.pesos[1].peso;
                      return (
                        <div>
                          <p className="text-xs text-gray-400">Variação</p>
                          <p className={`text-lg font-semibold ${diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-gray-400"}`}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)} kg
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Peso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {animal.pesos.map((p, i) => {
                        const diff = i < animal.pesos.length - 1 ? p.peso - animal.pesos[i + 1].peso : 0;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">{formatDate(p.data)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-semibold text-gray-900">{p.peso} kg</span>
                              {diff !== 0 && (
                                <span className={`ml-2 text-xs ${diff > 0 ? "text-red-500" : "text-emerald-500"}`}>
                                  {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* Agenda */}
          {tab === "agenda" && (
            <div className="space-y-2">
              {animal.agendamentos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">Nenhum agendamento registrado</div>
              ) : animal.agendamentos.map(ag => (
                <div key={ag.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {ag.tipo && <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ag.tipo.cor }} />}
                    <div>
                      <p className="font-medium text-gray-900">{ag.tipo?.nome ?? "Agendamento"}</p>
                      <p className="text-sm text-gray-500">{new Date(ag.inicio).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[ag.status]}`}>
                    {statusLabel[ag.status]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Orçamentos */}
          {tab === "orcamentos" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600">
                  {propostas.length} orçamento(s)
                </p>
                <Button onClick={abrirNovaProposta}>
                  <Plus size={14} /> Novo orçamento
                </Button>
              </div>

              {loadingPropostas && (
                <div className="text-center py-10 text-gray-400">Carregando...</div>
              )}

              {!loadingPropostas && propostas.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                  Nenhum orçamento. Clique em &quot;Novo orçamento&quot; para criar.
                </div>
              )}

              <div className="space-y-3">
                {propostas.map(p => {
                  const statusCores: Record<string, string> = {
                    PENDENTE:  "bg-amber-100 text-amber-700",
                    APROVADO:  "bg-emerald-100 text-emerald-700",
                    RECUSADO:  "bg-red-100 text-red-600",
                    EXPIRADO:  "bg-gray-100 text-gray-500",
                  };
                  const statusLabels: Record<string, string> = {
                    PENDENTE: "Pendente", APROVADO: "Aprovado",
                    RECUSADO: "Recusado", EXPIRADO: "Expirado",
                  };
                  const vencido = new Date(p.validade) < new Date() && p.status === "PENDENTE";
                  const expanded = expandedProposta === p.id;

                  return (
                    <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Header */}
                      <div className="p-4 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCores[p.status]}`}>
                              {statusLabels[p.status]}
                            </span>
                            {vencido && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Vencido</span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(p.createdAt).toLocaleDateString("pt-BR")} · {p.itens.length} item(ns)
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            Válido até {new Date(p.validade).toLocaleDateString("pt-BR")} · por {p.user.name}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-gray-900 mr-2">
                          R$ {p.total.toFixed(2).replace(".", ",")}
                        </p>
                        <div className="flex items-center gap-1">
                          {p.status === "PENDENTE" && (
                            <>
                              <button onClick={() => alterarStatusProposta(p.id, "APROVADO")}
                                title="Aprovar"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition">
                                <CheckCircle size={16} />
                              </button>
                              <button onClick={() => alterarStatusProposta(p.id, "RECUSADO")}
                                title="Recusar"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          <button onClick={() => imprimirProposta(p, animal)}
                            title="Imprimir"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                            <Printer size={16} />
                          </button>
                          {p.status === "PENDENTE" && (
                            <button onClick={() => abrirEditarProposta(p)}
                              title="Editar"
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition text-xs font-medium">
                              Editar
                            </button>
                          )}
                          <button onClick={() => deletarProposta(p.id)}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                            <Trash2 size={15} />
                          </button>
                          <button onClick={() => setExpandedProposta(expanded ? null : p.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition">
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded items */}
                      {expanded && (
                        <div className="border-t border-gray-100">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Produto / Serviço</th>
                                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Qtd</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Preço</th>
                                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Desc.</th>
                                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {p.itens.map(i => (
                                <tr key={i.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-900">{i.produto.nome}</td>
                                  <td className="px-4 py-2 text-center text-gray-600">{i.quantidade} {i.produto.unidade}</td>
                                  <td className="px-4 py-2 text-right text-gray-600">R$ {i.preco.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-center text-gray-500">{i.desconto > 0 ? `${i.desconto}%` : "—"}</td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-900">R$ {i.subtotal.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50">
                                <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-700 text-right">Total</td>
                                <td className="px-4 py-2 text-right font-bold text-gray-900">R$ {p.total.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          </table>
                          {p.obs && (
                            <p className="px-4 py-3 text-sm text-gray-500 border-t border-gray-100">
                              📝 {p.obs}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo atendimento */}
      <Modal open={modalAtend} onClose={() => setModalAtend(false)} title={`Novo atendimento — ${animal.nome}`} size="xl">
        <div className="space-y-5">
          <Select label="Veterinária *" value={form.medicoId} onChange={e => setForm({ ...form, medicoId: e.target.value })}>
            <option value="">Selecione...</option>
            {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Textarea label="Queixa principal" value={form.queixa} onChange={e => setForm({ ...form, queixa: e.target.value })} placeholder="Motivo da consulta..." rows={2} />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Stethoscope size={14} /> Exame físico</p>
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl">
              <Input label="Peso (kg)" type="number" step="0.01" value={exame.peso} onChange={e => setExame({ ...exame, peso: e.target.value })} />
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
              <p className="text-sm font-medium text-gray-700">Receitas</p>
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
          <Button variant="outline" onClick={() => setModalAtend(false)}>Cancelar</Button>
          <Button onClick={saveAtendimento} loading={saving}>Salvar atendimento</Button>
        </div>
      </Modal>

      {/* Modal: Registrar peso */}
      <Modal open={modalPeso} onClose={() => setModalPeso(false)} title={`Registrar peso — ${animal.nome}`} size="sm">
        <div className="space-y-4">
          {pesoAtual && <p className="text-sm text-gray-500">Peso atual: <strong>{pesoAtual} kg</strong></p>}
          <Input label="Novo peso (kg) *" type="number" step="0.01" value={novoPeso}
            onChange={e => setNovoPeso(e.target.value)} placeholder="Ex: 4.5" autoFocus />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalPeso(false)}>Cancelar</Button>
          <Button onClick={savePeso} loading={saving}>Salvar</Button>
        </div>
      </Modal>

      {/* Modal: Registrar vacina */}
      <Modal open={modalVacina} onClose={() => setModalVacina(false)} title={`Registrar vacina — ${animal.nome}`} size="md">
        <div className="space-y-4">
          <div>
            <Select label="Vacina do catálogo" value={vacinaForm.vacinaId}
              onChange={e => setVacinaForm({ ...vacinaForm, vacinaId: e.target.value, nomeCustom: "" })}>
              <option value="">— Selecione ou informe abaixo —</option>
              {catalogo.map(v => <option key={v.id} value={v.id}>{v.nome}{v.fabricante ? ` (${v.fabricante})` : ""}</option>)}
            </Select>
            {!vacinaForm.vacinaId && (
              <Input className="mt-2" placeholder="Ou informe o nome da vacina..." value={vacinaForm.nomeCustom}
                onChange={e => setVacinaForm({ ...vacinaForm, nomeCustom: e.target.value })} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de aplicação *" type="date" value={vacinaForm.dataAplicacao}
              onChange={e => setVacinaForm({ ...vacinaForm, dataAplicacao: e.target.value })} />
            <Input label="Data de vencimento" type="date" value={vacinaForm.dataVencimento}
              onChange={e => setVacinaForm({ ...vacinaForm, dataVencimento: e.target.value })} />
          </div>
          <Input label="Lote" value={vacinaForm.lote}
            onChange={e => setVacinaForm({ ...vacinaForm, lote: e.target.value })} placeholder="Ex: A12345" />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalVacina(false)}>Cancelar</Button>
          <Button onClick={saveVacina} loading={saving}><Syringe size={15} /> Registrar</Button>
        </div>
      </Modal>

      {/* Modal: Orçamento */}
      <Modal open={modalProposta} onClose={() => setModalProposta(false)}
        title={editingProposta ? `Editar orçamento — ${animal.nome}` : `Novo orçamento — ${animal.nome}`}
        size="xl">
        <div className="space-y-5">
          {/* Product search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar produto / serviço</label>
            <div className="relative">
              <input
                type="text"
                value={produtoBusca}
                onChange={e => { setProdutoBusca(e.target.value); buscarProdutos(e.target.value); }}
                placeholder="Digite o nome..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {buscandoProduto && (
                <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
              )}
              {produtoResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {produtoResults.map(p => (
                    <button key={p.id} onClick={() => adicionarItem(p)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                      <span className="font-medium text-gray-900">{p.nome}
                        <span className="ml-2 text-xs text-gray-400 font-normal">{p.tipo === "SERVICO" ? "Serviço" : "Produto"}</span>
                      </span>
                      <span className="text-teal-700 font-semibold">R$ {p.preco.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          {propostaItens.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Produto</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Qtd</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Preço</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Desc.%</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {propostaItens.map((item, idx) => {
                    const sub = item.quantidade * item.preco * (1 - item.desconto / 100);
                    return (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-900">{item.nomeProduto}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" min="0.01" step="0.01" value={item.quantidade}
                            onChange={e => {
                              const u = [...propostaItens];
                              u[idx] = { ...u[idx], quantidade: Number(e.target.value) };
                              setPropostaItens(u);
                            }}
                            className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min="0" step="0.01" value={item.preco}
                            onChange={e => {
                              const u = [...propostaItens];
                              u[idx] = { ...u[idx], preco: Number(e.target.value) };
                              setPropostaItens(u);
                            }}
                            className="w-20 text-right border border-gray-200 rounded px-1 py-0.5 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" min="0" max="100" step="1" value={item.desconto}
                            onChange={e => {
                              const u = [...propostaItens];
                              u[idx] = { ...u[idx], desconto: Number(e.target.value) };
                              setPropostaItens(u);
                            }}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-sm" />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">R$ {sub.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removerItem(idx)} className="text-red-400 hover:text-red-600 transition">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={4} className="px-3 py-2 text-sm font-semibold text-gray-700 text-right">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-teal-700 text-base">
                      R$ {propostaItens.reduce((s, i) => s + i.quantidade * i.preco * (1 - i.desconto / 100), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Válido até *" type="date" value={propostaForm.validade}
              onChange={e => setPropostaForm({ ...propostaForm, validade: e.target.value })} />
            <Textarea label="Observações" value={propostaForm.obs}
              onChange={e => setPropostaForm({ ...propostaForm, obs: e.target.value })}
              rows={2} placeholder="Condições, prazo de entrega..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalProposta(false)}>Cancelar</Button>
          <Button onClick={saveProposta} loading={saving}>
            <FileText size={14} /> {editingProposta ? "Atualizar" : "Criar orçamento"}
          </Button>
        </div>
      </Modal>

      {/* Modal: Solicitar exame */}
      <Modal open={modalExame} onClose={() => setModalExame(false)} title={`Solicitar exame — ${animal.nome}`} size="md">
        <div className="space-y-4">
          <Input label="Nome do exame *" value={exameForm.nome}
            onChange={e => setExameForm({ ...exameForm, nome: e.target.value })}
            placeholder="Ex: Hemograma completo, Raio-X tórax..." autoFocus />
          <Select label="Tipo" value={exameForm.tipo}
            onChange={e => setExameForm({ ...exameForm, tipo: e.target.value })}>
            <option value="LABORATORIAL">Laboratorial</option>
            <option value="IMAGEM">Imagem</option>
            <option value="OUTRO">Outro</option>
          </Select>
          <Textarea label="Observações" value={exameForm.obs}
            onChange={e => setExameForm({ ...exameForm, obs: e.target.value })}
            placeholder="Instruções ou informações adicionais..." rows={3} />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalExame(false)}>Cancelar</Button>
          <Button onClick={saveExame} loading={saving}><FlaskConical size={15} /> Solicitar</Button>
        </div>
      </Modal>
    </div>
  );
}
