"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, Syringe, AlertTriangle, BookOpen, Edit, Trash2 } from "lucide-react";
import { formatDate, especieEmoji } from "@/lib/utils";

type VacinaAplicada = {
  id: string;
  dataAplicacao: string;
  dataVencimento?: string;
  lote?: string;
  animal: { id: string; nome: string; especie: string; tutor: { nome: string } };
  vacina: { nome: string };
};

type Vacina = {
  id: string;
  nome: string;
  fabricante?: string;
  intervaloDias: number;
  ativo: boolean;
};

type Animal = { id: string; nome: string; tutor: { nome: string } };

const emptyVacina = { nome: "", fabricante: "", intervaloDias: "365" };
const emptyAplicacao = { animalId: "", vacinaId: "", lote: "", dataAplicacao: "", dataVencimento: "", obs: "" };

export default function VacinasPage() {
  const [tab, setTab] = useState<"aplicacoes" | "catalogo">("aplicacoes");
  const [aplicacoes, setAplicacoes] = useState<VacinaAplicada[]>([]);
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Modal aplicação
  const [modalAplicOpen, setModalAplicOpen] = useState(false);
  const [formAplicacao, setFormAplicacao] = useState<Record<string, string>>({ ...emptyAplicacao });
  const [savingAplic, setSavingAplic] = useState(false);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animalQ, setAnimalQ] = useState("");

  // Modal catálogo
  const [modalCatOpen, setModalCatOpen] = useState(false);
  const [editVacinaId, setEditVacinaId] = useState<string | null>(null);
  const [formVacina, setFormVacina] = useState<Record<string, string>>({ ...emptyVacina });
  const [savingVac, setSavingVac] = useState(false);

  function loadData() {
    setLoading(true);
    fetch("/api/vacinas")
      .then((r) => r.json())
      .then((data) => {
        setAplicacoes(data.aplicacoes ?? []);
        setVacinas(data.vacinas ?? []);
        setLoading(false);
      });
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (animalQ.length >= 2) {
      fetch(`/api/animais?q=${encodeURIComponent(animalQ)}`).then((r) => r.json()).then(setAnimais);
    } else {
      setAnimais([]);
    }
  }, [animalQ]);

  // ── Aplicação ──────────────────────────────────────────────────────────────

  async function saveAplicacao() {
    if (!formAplicacao.animalId || !formAplicacao.vacinaId || !formAplicacao.dataAplicacao) {
      toast.error("Animal, vacina e data são obrigatórios");
      return;
    }
    setSavingAplic(true);
    try {
      // Auto-calcular vencimento se não preenchido
      let dataVencimento = formAplicacao.dataVencimento;
      if (!dataVencimento && formAplicacao.vacinaId) {
        const vacina = vacinas.find((v) => v.id === formAplicacao.vacinaId);
        if (vacina) {
          const dataAplic = new Date(formAplicacao.dataAplicacao);
          dataAplic.setDate(dataAplic.getDate() + vacina.intervaloDias);
          dataVencimento = dataAplic.toISOString().slice(0, 10);
        }
      }
      const res = await fetch("/api/vacinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formAplicacao, dataVencimento: dataVencimento || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Vacinação registrada!");
      setModalAplicOpen(false);
      setFormAplicacao({ ...emptyAplicacao });
      setAnimalQ("");
      loadData();
    } catch { toast.error("Erro ao registrar vacinação"); }
    finally { setSavingAplic(false); }
  }

  // ── Catálogo ───────────────────────────────────────────────────────────────

  function openNovaVacina() {
    setEditVacinaId(null);
    setFormVacina({ ...emptyVacina });
    setModalCatOpen(true);
  }

  function openEditVacina(v: Vacina) {
    setEditVacinaId(v.id);
    setFormVacina({
      nome: v.nome,
      fabricante: v.fabricante ?? "",
      intervaloDias: String(v.intervaloDias),
    });
    setModalCatOpen(true);
  }

  async function saveVacina() {
    if (!formVacina.nome) { toast.error("Nome é obrigatório"); return; }
    setSavingVac(true);
    try {
      const url = editVacinaId ? `/api/vacinas/catalogo/${editVacinaId}` : "/api/vacinas/catalogo";
      const method = editVacinaId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formVacina.nome,
          fabricante: formVacina.fabricante || null,
          intervaloDias: Number(formVacina.intervaloDias) || 365,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editVacinaId ? "Vacina atualizada!" : "Vacina cadastrada!");
      setModalCatOpen(false);
      loadData();
    } catch { toast.error("Erro ao salvar vacina"); }
    finally { setSavingVac(false); }
  }

  async function toggleVacina(v: Vacina) {
    await fetch(`/api/vacinas/catalogo/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !v.ativo }),
    });
    toast.success(v.ativo ? "Vacina desativada" : "Vacina ativada");
    loadData();
  }

  // ── Filtros e estatísticas ─────────────────────────────────────────────────

  const hoje = new Date();

  const filtradas = aplicacoes.filter(
    (a) =>
      !q ||
      a.animal.nome.toLowerCase().includes(q.toLowerCase()) ||
      a.animal.tutor.nome.toLowerCase().includes(q.toLowerCase()) ||
      a.vacina.nome.toLowerCase().includes(q.toLowerCase())
  );

  function vacinaStatus(dataVenc?: string): "success" | "warning" | "danger" | "default" {
    if (!dataVenc) return "default";
    const diff = (new Date(dataVenc).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "danger";
    if (diff < 30) return "warning";
    return "success";
  }

  function vacinaLabel(dataVenc?: string): string {
    if (!dataVenc) return "Sem vencimento";
    const diff = Math.floor((new Date(dataVenc).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `Vencida há ${Math.abs(diff)} dias`;
    if (diff === 0) return "Vence hoje!";
    if (diff < 30) return `Vence em ${diff} dias`;
    return `Válida até ${formatDate(dataVenc)}`;
  }

  const vencidas = aplicacoes.filter((a) => a.dataVencimento && new Date(a.dataVencimento) < hoje).length;
  const vencendo = aplicacoes.filter((a) => {
    if (!a.dataVencimento) return false;
    const diff = (new Date(a.dataVencimento).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff < 30;
  }).length;

  return (
    <div>
      <PageHeader
        title="Vacinas"
        description="Catálogo de vacinas e controle de aplicações"
        actions={
          <div className="flex gap-2">
            {tab === "aplicacoes" && (
              <Button onClick={() => setModalAplicOpen(true)}>
                <Plus size={16} /> Registrar vacinação
              </Button>
            )}
            {tab === "catalogo" && (
              <Button onClick={openNovaVacina}>
                <Plus size={16} /> Nova vacina
              </Button>
            )}
          </div>
        }
      />

      {/* Alertas */}
      {(vencidas > 0 || vencendo > 0) && (
        <div className="space-y-2 mb-4">
          {vencidas > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-800 font-medium">
                {vencidas} vacina(s) vencida(s) — contatar tutores
              </p>
            </div>
          )}
          {vencendo > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                {vencendo} vacina(s) vencem nos próximos 30 dias
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("aplicacoes")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "aplicacoes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2"><Syringe size={15} /> Aplicações ({aplicacoes.length})</span>
        </button>
        <button
          onClick={() => setTab("catalogo")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "catalogo" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2"><BookOpen size={15} /> Catálogo ({vacinas.length})</span>
        </button>
      </div>

      {/* ── Tab: Aplicações ── */}
      {tab === "aplicacoes" && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por animal, tutor ou vacina..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Animal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vacina</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aplicação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lote</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Validade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">Carregando...</td></tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      <Syringe size={32} className="mx-auto mb-2 opacity-40" />
                      <p>Nenhuma vacinação registrada</p>
                    </td>
                  </tr>
                ) : (
                  filtradas.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          {especieEmoji[a.animal.especie]} {a.animal.nome}
                        </p>
                        <p className="text-xs text-gray-500">{a.animal.tutor.nome}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.vacina.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(a.dataAplicacao)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{a.lote ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={vacinaStatus(a.dataVencimento)}>
                          {vacinaLabel(a.dataVencimento)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Tab: Catálogo ── */}
      {tab === "catalogo" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome da vacina</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fabricante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Intervalo de revacinação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Carregando...</td></tr>
              ) : vacinas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
                    <p>Nenhuma vacina no catálogo</p>
                    <p className="text-sm mt-1">Clique em "Nova vacina" para cadastrar</p>
                  </td>
                </tr>
              ) : (
                vacinas.map((v) => (
                  <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${!v.ativo ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{v.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{v.fabricante ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {v.intervaloDias === 365 ? "Anual (12 meses)"
                        : v.intervaloDias === 180 ? "Semestral (6 meses)"
                        : `${v.intervaloDias} dias`}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={v.ativo ? "success" : "default"}>
                        {v.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEditVacina(v)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => toggleVacina(v)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                          title={v.ativo ? "Desativar" : "Ativar"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal — registrar aplicação */}
      <Modal open={modalAplicOpen} onClose={() => setModalAplicOpen(false)} title="Registrar vacinação" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Animal *</label>
            <input
              value={animalQ}
              onChange={(e) => { setAnimalQ(e.target.value); setFormAplicacao({ ...formAplicacao, animalId: "" }); }}
              placeholder="Digite o nome do animal..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {animais.length > 0 && animalQ && !formAplicacao.animalId && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-32 overflow-y-auto shadow-sm">
                {animais.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setFormAplicacao({ ...formAplicacao, animalId: a.id });
                      setAnimalQ(`${a.nome} (${a.tutor.nome})`);
                      setAnimais([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {a.nome} — {a.tutor.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vacina *</label>
            <select
              value={formAplicacao.vacinaId}
              onChange={(e) => setFormAplicacao({ ...formAplicacao, vacinaId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecione a vacina...</option>
              {vacinas.filter((v) => v.ativo).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome} {v.fabricante ? `(${v.fabricante})` : ""} — {v.intervaloDias === 365 ? "Anual" : `${v.intervaloDias}d`}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Data de aplicação *"
            type="date"
            value={formAplicacao.dataAplicacao}
            onChange={(e) => setFormAplicacao({ ...formAplicacao, dataAplicacao: e.target.value })}
          />
          <Input
            label="Data de vencimento (calculada automaticamente se vazio)"
            type="date"
            value={formAplicacao.dataVencimento}
            onChange={(e) => setFormAplicacao({ ...formAplicacao, dataVencimento: e.target.value })}
          />
          <Input
            label="Lote"
            value={formAplicacao.lote}
            onChange={(e) => setFormAplicacao({ ...formAplicacao, lote: e.target.value })}
            placeholder="Número do lote"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalAplicOpen(false)}>Cancelar</Button>
          <Button onClick={saveAplicacao} loading={savingAplic}>Registrar</Button>
        </div>
      </Modal>

      {/* Modal — catálogo vacina */}
      <Modal open={modalCatOpen} onClose={() => setModalCatOpen(false)} title={editVacinaId ? "Editar vacina" : "Nova vacina no catálogo"} size="sm">
        <div className="space-y-4">
          <Input
            label="Nome da vacina *"
            value={formVacina.nome}
            onChange={(e) => setFormVacina({ ...formVacina, nome: e.target.value })}
            placeholder="Ex: V10, Antirrábica, FeLV..."
          />
          <Input
            label="Fabricante"
            value={formVacina.fabricante}
            onChange={(e) => setFormVacina({ ...formVacina, fabricante: e.target.value })}
            placeholder="Ex: Zoetis, MSD, Ourofino..."
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervalo de revacinação</label>
            <select
              value={formVacina.intervaloDias}
              onChange={(e) => setFormVacina({ ...formVacina, intervaloDias: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="365">Anual (12 meses)</option>
              <option value="180">Semestral (6 meses)</option>
              <option value="90">Trimestral (3 meses)</option>
              <option value="30">Mensal (30 dias)</option>
              <option value="21">21 dias</option>
              <option value="custom">Outro...</option>
            </select>
            {formVacina.intervaloDias === "custom" && (
              <Input
                className="mt-2"
                type="number"
                placeholder="Número de dias"
                value=""
                onChange={(e) => setFormVacina({ ...formVacina, intervaloDias: e.target.value })}
              />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalCatOpen(false)}>Cancelar</Button>
          <Button onClick={saveVacina} loading={savingVac}>Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
