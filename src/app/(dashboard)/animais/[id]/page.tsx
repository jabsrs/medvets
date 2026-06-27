"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Weight, Syringe, ClipboardList, BedDouble, Calendar, Edit } from "lucide-react";
import { especieEmoji, especieLabel, calcAge, formatDate, formatCurrency } from "@/lib/utils";

type Animal = {
  id: string; nome: string; especie: string; raca?: string; sexo: string;
  dataNasc?: string; peso?: number; cor?: string; castrado: boolean; microchip?: string; obs?: string;
  tutor: { id: string; nome: string; telefone: string; celular?: string; email?: string };
  atendimentos: {
    id: string; data: string; queixa?: string; diagnostico?: string; tratamento?: string;
    medico: { name: string }; receitas: { medicamento: string; dose?: string; frequencia?: string }[];
    exameClinico?: { peso?: number; temperatura?: number; freqCardiaca?: number };
  }[];
  vacinas: {
    id: string; dataAplicacao: string; dataVencimento?: string; lote?: string;
    vacina: { nome: string; fabricante?: string };
  }[];
  pesos: { id: string; data: string; peso: number }[];
  agendamentos: { id: string; inicio: string; status: string; tipo?: { nome: string; cor: string } }[];
};

const tabs = [
  { id: "consultas", label: "Consultas", icon: ClipboardList },
  { id: "vacinas", label: "Vacinas", icon: Syringe },
  { id: "peso", label: "Histórico de Peso", icon: Weight },
  { id: "agenda", label: "Agenda", icon: Calendar },
];

const statusLabel: Record<string, string> = {
  AGENDADO: "Agendado", CONFIRMADO: "Confirmado", EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído", CANCELADO: "Cancelado", FALTOU: "Faltou",
};
const statusColor: Record<string, string> = {
  AGENDADO: "bg-blue-100 text-blue-700", CONFIRMADO: "bg-emerald-100 text-emerald-700",
  EM_ATENDIMENTO: "bg-amber-100 text-amber-700", CONCLUIDO: "bg-gray-100 text-gray-600",
  CANCELADO: "bg-red-100 text-red-600", FALTOU: "bg-purple-100 text-purple-700",
};

export default function AnimalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("consultas");

  useEffect(() => {
    fetch(`/api/animais/${id}`)
      .then(r => r.json())
      .then(d => { setAnimal(d); setLoading(false); })
      .catch(() => { toast.error("Erro ao carregar animal"); setLoading(false); });
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Carregando...</div>;
  if (!animal) return <div className="text-center py-20 text-gray-400">Animal não encontrado</div>;

  const vencidas = animal.vacinas.filter(v => v.dataVencimento && new Date(v.dataVencimento) < new Date());
  const pesoAtual = animal.pesos[0]?.peso ?? animal.peso;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Voltar */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition">
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Header do animal */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-4xl">
              {especieEmoji[animal.especie]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{animal.nome}</h1>
              <p className="text-gray-500">{especieLabel[animal.especie]}{animal.raca ? ` · ${animal.raca}` : ""}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-gray-600">{animal.sexo === "MACHO" ? "♂ Macho" : "♀ Fêmea"}</span>
                {animal.castrado && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Castrado(a)</span>}
                {animal.dataNasc && <span className="text-sm text-gray-600">{calcAge(animal.dataNasc)}</span>}
                {pesoAtual && <span className="text-sm text-gray-600">{pesoAtual} kg</span>}
                {vencidas.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {vencidas.length} vacina(s) vencida(s)
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link href={`/prontuario?animalId=${animal.id}`}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
            <Edit size={16} /> Novo atendimento
          </Link>
        </div>

        {/* Info do tutor */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Tutor</p>
            <Link href={`/tutores/${animal.tutor.id}`} className="text-sm font-medium text-gray-900 hover:text-emerald-600">
              {animal.tutor.nome}
            </Link>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Telefone</p>
            <p className="text-sm text-gray-700">{animal.tutor.telefone}</p>
          </div>
          {animal.tutor.celular && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Celular</p>
              <p className="text-sm text-gray-700">{animal.tutor.celular}</p>
            </div>
          )}
          {animal.microchip && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Microchip</p>
              <p className="text-sm text-gray-700">{animal.microchip}</p>
            </div>
          )}
          {animal.cor && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cor / Pelagem</p>
              <p className="text-sm text-gray-700">{animal.cor}</p>
            </div>
          )}
        </div>
        {animal.obs && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800 border border-amber-100">
            📝 {animal.obs}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Consultas */}
      {tab === "consultas" && (
        <div className="space-y-3">
          {animal.atendimentos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Nenhuma consulta registrada
            </div>
          ) : animal.atendimentos.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{new Date(a.data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
                  <p className="text-sm text-gray-500">👩‍⚕️ {a.medico.name}</p>
                </div>
                {a.exameClinico && (
                  <div className="flex gap-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                    {a.exameClinico.peso && <span>⚖️ {a.exameClinico.peso}kg</span>}
                    {a.exameClinico.temperatura && <span>🌡️ {a.exameClinico.temperatura}°C</span>}
                    {a.exameClinico.freqCardiaca && <span>❤️ {a.exameClinico.freqCardiaca}bpm</span>}
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {a.queixa && <div><span className="font-medium text-gray-700">Queixa:</span> <span className="text-gray-600">{a.queixa}</span></div>}
                {a.diagnostico && <div><span className="font-medium text-gray-700">Diagnóstico:</span> <span className="text-gray-600">{a.diagnostico}</span></div>}
                {a.tratamento && <div><span className="font-medium text-gray-700">Tratamento:</span> <span className="text-gray-600">{a.tratamento}</span></div>}
              </div>
              {a.receitas.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">RECEITUÁRIO</p>
                  <div className="space-y-1">
                    {a.receitas.map((r, i) => (
                      <p key={i} className="text-sm text-gray-700">
                        💊 <strong>{r.medicamento}</strong>
                        {r.dose && ` — ${r.dose}`}
                        {r.frequencia && ` · ${r.frequencia}`}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Vacinas */}
      {tab === "vacinas" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {animal.vacinas.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Nenhuma vacina registrada</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vacina</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Aplicação</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lote</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {animal.vacinas.map(v => {
                  const vencida = v.dataVencimento && new Date(v.dataVencimento) < new Date();
                  const vencendo = v.dataVencimento && !vencida &&
                    new Date(v.dataVencimento) < new Date(Date.now() + 30 * 86400000);
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{v.vacina.nome}</p>
                        {v.vacina.fabricante && <p className="text-xs text-gray-400">{v.vacina.fabricante}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(v.dataAplicacao)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.dataVencimento ? formatDate(v.dataVencimento) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{v.lote || "—"}</td>
                      <td className="px-4 py-3">
                        {vencida ? <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Vencida</span>
                          : vencendo ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Vence em breve</span>
                          : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Em dia</span>}
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
            <div className="p-12 text-center text-gray-400">Nenhum registro de peso</div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-100 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">Peso atual</p>
                  <p className="text-2xl font-bold text-emerald-600">{animal.pesos[0].peso} kg</p>
                </div>
                {animal.pesos.length > 1 && (
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Variação</p>
                    {(() => {
                      const diff = animal.pesos[0].peso - animal.pesos[1].peso;
                      return <p className={`text-lg font-semibold ${diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-gray-500"}`}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(2)} kg
                      </p>;
                    })()}
                  </div>
                )}
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {animal.pesos.map((p, i) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.data)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{p.peso} kg</span>
                        {i < animal.pesos.length - 1 && (() => {
                          const diff = p.peso - animal.pesos[i + 1].peso;
                          return diff !== 0 ? (
                            <span className={`ml-2 text-xs ${diff > 0 ? "text-red-500" : "text-emerald-500"}`}>
                              {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(2)}
                            </span>
                          ) : null;
                        })()}
                      </td>
                    </tr>
                  ))}
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
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Nenhum agendamento registrado
            </div>
          ) : animal.agendamentos.map(ag => (
            <div key={ag.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {ag.tipo && (
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ag.tipo.cor }} />
                )}
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
    </div>
  );
}
