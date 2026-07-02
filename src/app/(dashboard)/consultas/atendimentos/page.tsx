"use client";
import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Stethoscope, RotateCcw, Dog, Cat, Bird, Rabbit, Fish, PawPrint,
} from "lucide-react";
import { especieEmoji } from "@/lib/utils";

type Medico   = { id: string; name: string };
type Tutor    = { id: string; nome: string; telefone: string };
type Animal   = { id: string; nome: string; especie: string; raca: string | null; tutor: Tutor };
type Atendimento = {
  id:          string;
  data:        string;
  queixa:      string | null;
  diagnostico: string | null;
  tratamento:  string | null;
  retorno:     string | null;
  animal:      Animal;
  medico:      Medico;
};

const ESPECIES = ["CACHORRO", "GATO", "PASSARO", "ROEDOR", "PEIXE", "OUTRO"];
const ESPECIE_ICONES: Record<string, React.ElementType> = {
  CACHORRO: Dog, GATO: Cat, PASSARO: Bird, ROEDOR: Rabbit, PEIXE: Fish,
};
const ESPECIE_LABEL: Record<string, string> = {
  CACHORRO: "Cão", GATO: "Gato", PASSARO: "Pássaro", ROEDOR: "Roedor", PEIXE: "Peixe", OUTRO: "Outro",
};

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function mesAtual() {
  const hoje = new Date();
  return {
    de:  isoDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
    ate: isoDate(hoje),
  };
}

function truncar(s: string | null, n = 60) {
  if (!s) return null;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function ConsultaAtendimentosPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [total,  setTotal]   = useState(0);
  const [pages,  setPages]   = useState(1);
  const [page,   setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [q,           setQ]           = useState("");
  const [qInput,      setQInput]      = useState("");
  const [de,          setDe]          = useState(mesAtual().de);
  const [ate,         setAte]         = useState(mesAtual().ate);
  const [medicoId,    setMedicoId]    = useState("");
  const [especie,     setEspecie]     = useState("");
  const [medicos,     setMedicos]     = useState<Medico[]>([]);

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    fetch("/api/usuarios").then(r => r.json()).then(data => {
      const lista = Array.isArray(data) ? data : (data.usuarios ?? []);
      setMedicos(lista.filter((u: { role: string }) => ["VETERINARIO", "ADMIN"].includes(u.role)));
    });
  }, []);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (q)        params.set("q",        q);
    if (de)       params.set("de",       de);
    if (ate)      params.set("ate",      ate);
    if (medicoId) params.set("medicoId", medicoId);
    if (especie)  params.set("especie",  especie);
    const res  = await fetch(`/api/atendimentos?${params}`);
    const data = await res.json();
    setAtendimentos(data.atendimentos ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [q, de, ate, medicoId, especie, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function resetFiltros() {
    const m = mesAtual();
    setQInput(""); setQ("");
    setDe(m.de); setAte(m.ate);
    setMedicoId(""); setEspecie("");
    setPage(1);
  }

  const temFiltro = q || medicoId || especie;

  return (
    <div>
      <PageHeader
        title="Consulta de atendimentos"
        description="Histórico global de consultas e atendimentos clínicos"
      />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Filtros</span>
          {(temFiltro) && (
            <button onClick={resetFiltros}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RotateCcw size={11} /> Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={qInput} onChange={e => setQInput(e.target.value)}
              placeholder="Buscar por animal, tutor, queixa ou diagnóstico..."
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          {/* Veterinário */}
          <select value={medicoId} onChange={e => { setMedicoId(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Todos os veterinários</option>
            {medicos.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          {/* Espécie */}
          <select value={especie} onChange={e => { setEspecie(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Todas as espécies</option>
            {ESPECIES.map(e => (
              <option key={e} value={e}>{especieEmoji[e] ?? "🐾"} {ESPECIE_LABEL[e]}</option>
            ))}
          </select>

          {/* Período */}
          <input type="date" value={de} onChange={e => { setDe(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input type="date" value={ate} onChange={e => { setAte(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />

          {/* Atalhos período */}
          <div className="flex gap-2 col-span-1 sm:col-span-2">
            {[
              { label: "Hoje",      de: isoDate(new Date()), ate: isoDate(new Date()) },
              { label: "Esta semana",
                de:  isoDate(new Date(new Date().setDate(new Date().getDate() - new Date().getDay()))),
                ate: isoDate(new Date()) },
              { label: "Este mês",  de: mesAtual().de, ate: mesAtual().ate },
              { label: "Tudo",      de: "2000-01-01",   ate: isoDate(new Date()) },
            ].map(s => (
              <button key={s.label} onClick={() => { setDe(s.de); setAte(s.ate); setPage(1); }}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                  de === s.de && ate === s.ate
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-gray-200 text-gray-500 hover:border-teal-400 hover:text-teal-700"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contagem + paginação topo */}
      <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
        <span>
          {loading ? "Carregando…" : (
            <>{total.toLocaleString("pt-BR")} atendimento(s){" "}
              {page > 1 && <span className="text-gray-400">— página {page} de {pages}</span>}
            </>
          )}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Animal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tutor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Veterinário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Queixa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Diagnóstico</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retorno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                <Stethoscope size={28} className="mx-auto mb-2 opacity-30" />
                Carregando...
              </td></tr>
            ) : atendimentos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                <Stethoscope size={28} className="mx-auto mb-2 opacity-30" />
                Nenhum atendimento encontrado
              </td></tr>
            ) : atendimentos.map(a => {
              const EspecieIcon = ESPECIE_ICONES[a.animal.especie] ?? PawPrint;
              const dataLocal   = new Date(a.data).toLocaleDateString("pt-BR");
              const horaLocal   = new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const temRetorno  = !!a.retorno;
              const retornoPassou = temRetorno && new Date(a.retorno!) < new Date();
              return (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
                  {/* Data */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-medium text-gray-800">{dataLocal}</p>
                    <p className="text-xs text-gray-400">{horaLocal}</p>
                  </td>

                  {/* Animal */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <EspecieIcon size={15} className="text-teal-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <Link href={`/animais/${a.animal.id}`}
                          className="font-medium text-gray-900 hover:text-teal-700 transition group-hover:underline truncate block max-w-[120px]">
                          {a.animal.nome}
                        </Link>
                        <p className="text-xs text-gray-400 truncate max-w-[120px]">
                          {a.animal.raca ?? ESPECIE_LABEL[a.animal.especie] ?? a.animal.especie}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Tutor */}
                  <td className="px-4 py-3">
                    <Link href={`/tutores/${a.animal.tutor.id}`}
                      className="text-gray-700 hover:text-teal-700 transition truncate block max-w-[140px]">
                      {a.animal.tutor.nome}
                    </Link>
                    <p className="text-xs text-gray-400">{a.animal.tutor.telefone}</p>
                  </td>

                  {/* Veterinário */}
                  <td className="px-4 py-3">
                    <span className="text-gray-700 truncate block max-w-[120px]">
                      {a.medico.name.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </td>

                  {/* Queixa */}
                  <td className="px-4 py-3 max-w-[180px]">
                    {a.queixa ? (
                      <span className="text-gray-700 text-xs leading-relaxed line-clamp-2" title={a.queixa}>
                        {truncar(a.queixa, 80)}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Diagnóstico */}
                  <td className="px-4 py-3 max-w-[180px]">
                    {a.diagnostico ? (
                      <span className="text-gray-700 text-xs leading-relaxed line-clamp-2" title={a.diagnostico}>
                        {truncar(a.diagnostico, 80)}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Retorno */}
                  <td className="px-4 py-3 text-center">
                    {temRetorno ? (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                        retornoPassou
                          ? "bg-red-100 text-red-700"
                          : "bg-teal-100 text-teal-700"
                      }`}>
                        {new Date(a.retorno!).toLocaleDateString("pt-BR")}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação rodapé */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <span>Página {page} de {pages} · {total.toLocaleString("pt-BR")} registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition text-xs">
              Primeira
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setPage(pages)} disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition text-xs">
              Última
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
