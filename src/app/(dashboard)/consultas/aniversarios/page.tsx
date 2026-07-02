"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { Cake, Phone, Dog, Cat, Bird, Rabbit, Fish, PawPrint, Clock, User } from "lucide-react";

type AnimalAniversario = {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  dataNasc: string;
  idade: number;
  foto: string | null;
  ultimaVisita: string | null;
  tutor: { id: string; nome: string; telefone: string; celular: string | null };
};

type TutorAniversario = {
  id: string;
  nome: string;
  dataNasc: string;
  idade: number;
  telefone: string;
  celular: string | null;
  email: string | null;
  animais: { id: string; nome: string; especie: string }[];
};

type Periodo = "hoje" | "semana" | "mes";

const PERIODO_LABEL: Record<Periodo, string> = {
  hoje:   "Hoje",
  semana: "Próximos 7 dias",
  mes:    "Este mês",
};

const ULTIMA_VISITA_OPTS = [
  { value: "0",  label: "Todos"          },
  { value: "3",  label: "Sem visita há +3 meses"  },
  { value: "6",  label: "Sem visita há +6 meses"  },
  { value: "12", label: "Sem visita há +1 ano"    },
];

const ESPECIE_ICONES: Record<string, React.ElementType> = {
  CACHORRO: Dog,
  GATO:     Cat,
  PASSARO:  Bird,
  ROEDOR:   Rabbit,
  PEIXE:    Fish,
};

function fmtData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function fmtDataCompleta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function diasParaAniversario(dataNasc: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // comparar só datas, sem horário
  const d    = new Date(dataNasc);
  const prox = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
  if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1);
  return Math.round((prox.getTime() - hoje.getTime()) / 86400000);
}

function badgeDias(dias: number) {
  if (dias === 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">🎂 Hoje!</span>;
  if (dias === 1) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Amanhã</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">em {dias} dias</span>;
}

function tempoSemVisita(ultimaVisita: string | null): string {
  if (!ultimaVisita) return "Nunca atendido";
  const meses = Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (meses === 0) return "Atendido este mês";
  if (meses === 1) return "Há 1 mês";
  return `Há ${meses} meses`;
}

function corUltimaVisita(ultimaVisita: string | null): string {
  if (!ultimaVisita) return "text-red-500";
  const meses = Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (meses >= 12) return "text-red-500";
  if (meses >= 6)  return "text-amber-500";
  if (meses >= 3)  return "text-yellow-600";
  return "text-green-600";
}

export default function AniversariosPage() {
  const [periodo, setPeriodo]           = useState<Periodo>("mes");
  const [ultimaVisita, setUltimaVisita] = useState("0");
  const [aba, setAba]                   = useState<"animais" | "tutores">("animais");
  const [animais, setAnimais]           = useState<AnimalAniversario[]>([]);
  const [tutores, setTutores]           = useState<TutorAniversario[]>([]);
  const [loading, setLoading]           = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ periodo, ultimaVisitaMeses: ultimaVisita });
    const res = await fetch(`/api/aniversarios?${params}`);
    const data = await res.json();
    setAnimais(data.animais ?? []);
    setTutores(data.tutores ?? []);
    setLoading(false);
  }, [periodo, ultimaVisita]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div>
      <PageHeader
        title="Aniversários"
        description="Animais e tutores fazendo aniversário no período selecionado"
      />

      {/* Controles */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Período */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["hoje", "semana", "mes"] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                periodo === p ? "bg-white shadow-sm text-teal-700" : "text-gray-500 hover:text-gray-700"
              }`}>
              {PERIODO_LABEL[p]}
            </button>
          ))}
        </div>

        {/* Filtro última visita — só para animais */}
        {aba === "animais" && (
          <select value={ultimaVisita} onChange={e => setUltimaVisita(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {ULTIMA_VISITA_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        <span className="text-sm text-gray-400 ml-auto">
          {aba === "animais" ? animais.length : tutores.length} resultado(s)
        </span>
      </div>

      {/* Abas */}
      <div className="flex gap-4 border-b border-gray-200 mb-5">
        <button onClick={() => setAba("animais")}
          className={`pb-2.5 text-sm font-medium border-b-2 transition ${
            aba === "animais" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}>
          <PawPrint size={14} className="inline mr-1.5" />
          Animais ({animais.length})
        </button>
        <button onClick={() => setAba("tutores")}
          className={`pb-2.5 text-sm font-medium border-b-2 transition ${
            aba === "tutores" ? "border-teal-600 text-teal-700" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}>
          <User size={14} className="inline mr-1.5" />
          Tutores ({tutores.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* ── Animais ─────────────────────────────────────────── */}
          {aba === "animais" && (
            animais.length === 0 ? (
              <div className="text-center py-16">
                <Cake size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">Nenhum aniversário no período</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {animais.map(a => {
                  const Icon = ESPECIE_ICONES[a.especie] ?? PawPrint;
                  const dias = diasParaAniversario(a.dataNasc);
                  return (
                    <div key={a.id}
                      className={`bg-white rounded-xl border overflow-hidden transition hover:shadow-md ${
                        dias === 0 ? "border-pink-300 shadow-pink-50 shadow-sm" : "border-gray-200"
                      }`}>
                      {/* Header colorido quando é hoje */}
                      {dias === 0 && (
                        <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-4 py-1.5 text-xs font-semibold text-white text-center tracking-wide">
                          🎂 ANIVERSÁRIO HOJE!
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                            {a.foto
                              ? <img src={a.foto} alt={a.nome} className="w-12 h-12 rounded-xl object-cover" />
                              : <Icon size={22} className="text-teal-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/animais/${a.id}`}
                                className="font-semibold text-gray-900 hover:text-teal-600 transition">
                                {a.nome}
                              </Link>
                              {badgeDias(dias)}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {a.raca ?? a.especie} · {a.idade} ano(s) · nascido em {fmtDataCompleta(a.dataNasc)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                          {/* Tutor */}
                          <Link href={`/tutores/${a.tutor.id}`}
                            className="flex items-center gap-2 text-sm text-gray-700 hover:text-teal-600 transition">
                            <User size={13} className="text-gray-400 flex-shrink-0" />
                            {a.tutor.nome}
                          </Link>
                          {/* Telefone */}
                          <a href={`tel:${a.tutor.celular ?? a.tutor.telefone}`}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition">
                            <Phone size={13} className="text-gray-400 flex-shrink-0" />
                            {a.tutor.celular ?? a.tutor.telefone}
                          </a>
                          {/* Última visita */}
                          <div className="flex items-center gap-2 text-sm">
                            <Clock size={13} className="text-gray-400 flex-shrink-0" />
                            <span className={corUltimaVisita(a.ultimaVisita)}>
                              {tempoSemVisita(a.ultimaVisita)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Tutores ─────────────────────────────────────────── */}
          {aba === "tutores" && (
            tutores.length === 0 ? (
              <div className="text-center py-16">
                <Cake size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">Nenhum tutor com aniversário no período</p>
                <p className="text-xs text-gray-400 mt-1">
                  (Preencha a data de nascimento dos tutores no cadastro para aparecerem aqui)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tutores.map(t => {
                  const dias = diasParaAniversario(t.dataNasc);
                  return (
                    <div key={t.id}
                      className={`bg-white rounded-xl border overflow-hidden transition hover:shadow-md ${
                        dias === 0 ? "border-pink-300 shadow-pink-50 shadow-sm" : "border-gray-200"
                      }`}>
                      {dias === 0 && (
                        <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-4 py-1.5 text-xs font-semibold text-white text-center tracking-wide">
                          🎂 ANIVERSÁRIO HOJE!
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <User size={22} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/tutores/${t.id}`}
                                className="font-semibold text-gray-900 hover:text-teal-600 transition">
                                {t.nome}
                              </Link>
                              {badgeDias(dias)}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {t.idade} ano(s) · nascido(a) em {fmtDataCompleta(t.dataNasc)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                          <a href={`tel:${t.celular ?? t.telefone}`}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-teal-600 transition">
                            <Phone size={13} className="text-gray-400 flex-shrink-0" />
                            {t.celular ?? t.telefone}
                          </a>
                          {t.email && (
                            <p className="text-xs text-gray-400 truncate pl-5">{t.email}</p>
                          )}
                          {t.animais.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {t.animais.map(a => {
                                const Icon = ESPECIE_ICONES[a.especie] ?? PawPrint;
                                return (
                                  <span key={a.id}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                    <Icon size={10} />
                                    {a.nome}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
