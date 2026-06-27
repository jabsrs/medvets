"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

type Log = {
  id: string; userId?: string; userName?: string;
  acao: string; entidade: string; entidadeId?: string;
  descricao: string; ip?: string; createdAt: string;
};

const acaoCor: Record<string, "success" | "warning" | "danger" | "default"> = {
  LOGIN: "success", CREATE: "success", CREATE_USER: "success",
  UPDATE: "default", UPDATE_USER: "default", PAGAR: "success",
  DESATIVAR: "warning", DESATIVAR_USER: "warning", CANCELAR: "warning",
  LOGIN_FALHOU: "danger", BLOQUEIO: "danger",
};

const entidades = ["", "Animal", "Tutor", "Atendimento", "Lancamento", "User"];
const acoes = ["", "LOGIN", "LOGIN_FALHOU", "BLOQUEIO", "CREATE", "UPDATE", "DESATIVAR",
  "CREATE_USER", "UPDATE_USER", "DESATIVAR_USER", "PAGAR", "CANCELAR"];

export default function AuditoriaPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroEntidade, setFiltroEntidade] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filtroEntidade) params.set("entidade", filtroEntidade);
    if (filtroAcao) params.set("acao", filtroAcao);
    const res = await fetch(`/api/auditoria?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, filtroEntidade, filtroAcao]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <ShieldCheck size={48} className="mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Acesso restrito a administradores</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 50);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      <PageHeader
        title="Log de Auditoria"
        description={`${total} registro(s) — quem fez o quê e quando`}
      />

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filtroEntidade} onChange={e => { setFiltroEntidade(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todos os módulos</option>
          {entidades.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filtroAcao} onChange={e => { setFiltroAcao(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Todas as ações</option>
          {acoes.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(filtroEntidade || filtroAcao) && (
          <button onClick={() => { setFiltroEntidade(""); setFiltroAcao(""); setPage(1); }}
            className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2">
            Limpar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data/Hora</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ação</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Módulo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum registro encontrado</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{log.userName ?? <span className="text-gray-400 italic">Sistema</span>}</td>
                <td className="px-4 py-3">
                  <Badge variant={acaoCor[log.acao] ?? "default"}>{log.acao}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{log.entidade}</td>
                <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={log.descricao}>{log.descricao}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Página {page} de {totalPages} ({total} registros)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
              <ChevronLeft size={14} /> Anterior
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:bg-gray-50">
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
