"use client";
import { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import type { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import { statusAgendamentoCor, statusAgendamentoLabel } from "@/lib/utils";

type Agendamento = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  obs?: string;
  animal: { id: string; nome: string; especie: string; tutor: { nome: string; telefone: string } };
  medico?: { id: string; name: string };
  tipo?: { id: string; nome: string; cor: string };
};

type Veterinario = { id: string; name: string };
type TipoAtend = { id: string; nome: string; cor: string; duracaoMin: number };
type Animal = { id: string; nome: string; tutor: { nome: string } };

const emptyForm = { animalId: "", medicoId: "", tipoId: "", inicio: "", fim: "", obs: "", status: "AGENDADO" };

const VET_COLORS = [
  "#2563eb", // azul
  "#7c3aed", // roxo
  "#059669", // verde
  "#dc2626", // vermelho
  "#d97706", // laranja
];

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Agendamento | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [vets, setVets] = useState<Veterinario[]>([]);
  const [tipos, setTipos] = useState<TipoAtend[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animalQ, setAnimalQ] = useState("");
  const [filtroMedico, setFiltroMedico] = useState<string>("todos");
  const calRef = useRef<FullCalendar>(null);

  const vetColorMap = (vetId: string) => {
    const idx = vets.findIndex(v => v.id === vetId);
    return VET_COLORS[idx % VET_COLORS.length] ?? "#6b7280";
  };

  useEffect(() => {
    fetch("/api/usuarios?role=VETERINARIO").then((r) => r.json()).then(setVets);
    fetch("/api/tipos-atendimento").then((r) => r.json()).then(setTipos);
  }, []);

  async function loadEvents(start: Date, end: Date) {
    const url = `/api/agendamentos?start=${start.toISOString()}&end=${end.toISOString()}`;
    const res = await fetch(url);
    const data = await res.json();
    setAgendamentos(data);
  }

  const agendamentosFiltrados = filtroMedico === "todos"
    ? agendamentos
    : agendamentos.filter(a => a.medico?.id === filtroMedico);

  const events = agendamentosFiltrados.map((a) => {
    const cor = filtroMedico === "todos" && a.medico
      ? vetColorMap(a.medico.id)
      : (a.tipo?.cor ?? statusAgendamentoCor[a.status]);
    const vetName = filtroMedico === "todos" && a.medico ? ` · ${a.medico.name.split(" ")[0]}` : "";
    return {
      id: a.id,
      title: `${a.animal.nome} — ${a.animal.tutor.nome}${vetName}`,
      start: a.inicio,
      end: a.fim,
      backgroundColor: cor,
      borderColor: cor,
      extendedProps: { agendamento: a },
    };
  });

  function openNew(start?: string, end?: string) {
    setForm({ ...emptyForm, inicio: start ?? "", fim: end ?? "", medicoId: filtroMedico !== "todos" ? filtroMedico : "" });
    setModalOpen(true);
  }

  function handleDateSelect(arg: DateSelectArg) {
    openNew(arg.startStr.slice(0, 16), arg.endStr.slice(0, 16));
  }

  function handleEventClick(arg: EventClickArg) {
    const ag = arg.event.extendedProps.agendamento as Agendamento;
    setSelected(ag);
    setDetailOpen(true);
  }

  async function handleEventDrop(arg: EventDropArg) {
    const id = arg.event.id;
    const inicio = arg.event.startStr;
    const fim = arg.event.endStr ?? arg.event.startStr;
    await fetch(`/api/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inicio, fim }),
    });
    toast.success("Agendamento reagendado!");
    calRef.current?.getApi().refetchEvents();
  }

  async function save() {
    if (!form.animalId || !form.inicio || !form.fim) { toast.error("Animal, início e fim são obrigatórios"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Agendamento criado!");
      setModalOpen(false);
      calRef.current?.getApi().refetchEvents();
    } catch { toast.error("Erro ao criar agendamento"); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/agendamentos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast.success("Status atualizado!");
    setDetailOpen(false);
    calRef.current?.getApi().refetchEvents();
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar este agendamento?")) return;
    await fetch(`/api/agendamentos/${id}`, { method: "DELETE" });
    toast.success("Agendamento cancelado!");
    setDetailOpen(false);
    calRef.current?.getApi().refetchEvents();
  }

  const statusBadge: Record<string, string> = {
    AGENDADO: "bg-blue-100 text-blue-700",
    CONFIRMADO: "bg-emerald-100 text-emerald-700",
    EM_ATENDIMENTO: "bg-amber-100 text-amber-700",
    CONCLUIDO: "bg-gray-100 text-gray-600",
    CANCELADO: "bg-red-100 text-red-600",
    FALTOU: "bg-purple-100 text-purple-700",
  };

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Gerencie os agendamentos da clínica"
        actions={<Button onClick={() => openNew()}><Plus size={16} /> Novo agendamento</Button>}
      />

      {/* Filtro por médica */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 font-medium mr-1">Visualizar:</span>
        <button
          onClick={() => setFiltroMedico("todos")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            filtroMedico === "todos"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Todas as médicas
        </button>
        {vets.map((v, i) => {
          const cor = VET_COLORS[i % VET_COLORS.length];
          const ativo = filtroMedico === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setFiltroMedico(v.id)}
              style={ativo ? { backgroundColor: cor, borderColor: cor, color: "#fff" } : { borderColor: cor, color: cor }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border bg-white`}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: ativo ? "#fff" : cor }} />
              {v.name.split(" ")[0]}
            </button>
          );
        })}

        {/* Legenda na visão geral */}
        {filtroMedico === "todos" && vets.length > 0 && (
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            {vets.map((v, i) => (
              <span key={v.id} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: VET_COLORS[i % VET_COLORS.length] }} />
                {v.name.split(" ")[0]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale={ptBrLocale}
          initialView="timeGridWeek"
          events={events}
          selectable
          editable
          selectMirror
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          datesSet={(info) => loadEvents(info.start, info.end)}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          height="calc(100vh - 280px)"
          eventContent={(arg) => {
            const ag = arg.event.extendedProps.agendamento as Agendamento;
            return (
              <div className="text-xs p-0.5 overflow-hidden">
                <p className="font-medium truncate">{ag.animal.nome} — {ag.animal.tutor.nome}</p>
                <p className="truncate opacity-80">
                  {ag.tipo?.nome ?? ""}
                  {filtroMedico === "todos" && ag.medico ? ` · ${ag.medico.name.split(" ")[0]}` : ""}
                </p>
              </div>
            );
          }}
        />
      </div>

      {/* Modal novo agendamento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo agendamento" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Animal *</label>
            <input
              value={animalQ}
              onChange={(e) => setAnimalQ(e.target.value)}
              placeholder="Digite o nome do animal..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {animais.length > 0 && animalQ && !form.animalId && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                {animais.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setForm({ ...form, animalId: a.id }); setAnimalQ(`${a.nome} (${a.tutor.nome})`); setAnimais([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {a.nome} — {a.tutor.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Select label="Veterinário(a)" value={form.medicoId} onChange={(e) => setForm({ ...form, medicoId: e.target.value })}>
            <option value="">Selecione...</option>
            {vets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <Select label="Tipo de atendimento" value={form.tipoId} onChange={(e) => {
            const tipo = tipos.find((t) => t.id === e.target.value);
            const fim = form.inicio && tipo ? new Date(new Date(form.inicio).getTime() + tipo.duracaoMin * 60000).toISOString().slice(0, 16) : form.fim;
            setForm({ ...form, tipoId: e.target.value, fim });
          }}>
            <option value="">Selecione...</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Início *" type="datetime-local" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
            <Input label="Fim *" type="datetime-local" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </div>
      </Modal>

      {/* Modal detalhe */}
      {selected && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Detalhes do agendamento" size="md">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[selected.status]}`}>
                {statusAgendamentoLabel[selected.status]}
              </span>
              {selected.tipo && (
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: selected.tipo.cor + "20", color: selected.tipo.cor }}>
                  {selected.tipo.nome}
                </span>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-gray-900">{selected.animal.nome}</p>
              <p className="text-sm text-gray-600">Tutor: {selected.animal.tutor.nome}</p>
              <p className="text-sm text-gray-600">Tel: {selected.animal.tutor.telefone}</p>
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <p>📅 {new Date(selected.inicio).toLocaleString("pt-BR")}</p>
              {selected.medico && <p>👩‍⚕️ {selected.medico.name}</p>}
              {selected.obs && <p>📝 {selected.obs}</p>}
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {selected.status === "AGENDADO" && (
                <Button size="sm" variant="secondary" onClick={() => updateStatus(selected.id, "CONFIRMADO")}>Confirmar</Button>
              )}
              {(selected.status === "AGENDADO" || selected.status === "CONFIRMADO") && (
                <Button size="sm" onClick={() => updateStatus(selected.id, "EM_ATENDIMENTO")}>Iniciar atendimento</Button>
              )}
              {selected.status === "EM_ATENDIMENTO" && (
                <Button size="sm" variant="secondary" onClick={() => updateStatus(selected.id, "CONCLUIDO")}>Concluir</Button>
              )}
              <Button size="sm" variant="danger" onClick={() => cancelar(selected.id)}>Cancelar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
