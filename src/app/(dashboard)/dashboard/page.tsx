import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Calendar, Users, PawPrint, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDateTime, statusAgendamentoLabel, statusAgendamentoCor, especieEmoji } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [
    totalTutores,
    totalAnimais,
    agendamentosHoje,
    agendamentosProximos,
    receitaMes,
    estoqueMinimo,
  ] = await Promise.all([
    prisma.tutor.count({ where: { ativo: true } }),
    prisma.animal.count({ where: { ativo: true } }),
    prisma.agendamento.findMany({
      where: { inicio: { gte: startOfDay, lte: endOfDay } },
      include: { animal: { include: { tutor: true } }, medico: true, tipo: true },
      orderBy: { inicio: "asc" },
    }),
    prisma.agendamento.count({
      where: { inicio: { gt: endOfDay }, status: "AGENDADO" },
    }),
    prisma.venda.aggregate({
      where: {
        status: "FECHADA",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { total: true },
    }),
    prisma.produto.count({
      where: { estoque: { lte: prisma.produto.fields.estoqueMin } },
    }),
  ]);

  const statusColor: Record<string, string> = {
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
        title={`Bom dia! 👋`}
        description={`${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}`}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Tutores ativos" value={totalTutores} icon={Users} color="blue" />
        <StatCard title="Animais ativos" value={totalAnimais} icon={PawPrint} color="emerald" />
        <StatCard title="Consultas hoje" value={agendamentosHoje.length} icon={Calendar} color="amber" />
        <StatCard
          title="Receita do mês"
          value={formatCurrency(receitaMes._sum.total ?? 0)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Alertas */}
      {estoqueMinimo > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {estoqueMinimo} produto(s) com estoque abaixo do mínimo
            </p>
            <Link href="/estoque" className="text-xs text-amber-600 hover:underline">
              Ver estoque →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agenda de hoje */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Agenda de hoje</h2>
            <Link href="/agenda" className="text-sm text-emerald-600 hover:underline">
              Ver agenda →
            </Link>
          </div>
          {agendamentosHoje.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma consulta hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agendamentosHoje.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="text-2xl">{especieEmoji[a.animal.especie]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{a.animal.nome}</p>
                    <p className="text-xs text-gray-500">{a.animal.tutor.nome} • {a.tipo?.nome ?? "Consulta"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-700">
                      {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[a.status]}`}>
                      {statusAgendamentoLabel[a.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas consultas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Próximas consultas</h2>
            <span className="text-sm text-gray-500">{agendamentosProximos} no total</span>
          </div>
          <div className="text-center py-8 text-gray-400">
            <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{agendamentosProximos} consultas futuras agendadas</p>
            <Link href="/agenda" className="text-sm text-emerald-600 hover:underline mt-2 block">
              Ver agenda completa →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
