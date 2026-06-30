import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/StatCard";
import {
  Calendar, Users, PawPrint, TrendingUp, AlertTriangle,
  Clock, Syringe, DollarSign,
} from "lucide-react";
import { formatCurrency, especieEmoji } from "@/lib/utils";
import Link from "next/link";

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  await getServerSession(authOptions);

  const now        = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const em7dias    = new Date(now); em7dias.setDate(em7dias.getDate() + 7);
  const em30dias   = new Date(now); em30dias.setDate(em30dias.getDate() + 30);
  const startOfMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalTutores,
    totalAnimais,
    agendamentosHoje,
    proximosAgendamentos,
    receitaMes,
    lancamentosVencidos,
    vacinasVencidas,
    vacinasPraVencer,
  ] = await Promise.all([
    prisma.tutor.count({ where: { ativo: true } }),

    prisma.animal.count({ where: { ativo: true } }),

    prisma.agendamento.findMany({
      where: { inicio: { gte: startOfDay, lte: endOfDay } },
      include: {
        animal: { include: { tutor: { select: { nome: true } } } },
        medico: { select: { name: true } },
        tipo: { select: { nome: true, cor: true } },
      },
      orderBy: { inicio: "asc" },
    }),

    prisma.agendamento.findMany({
      where: {
        inicio: { gt: endOfDay, lte: em7dias },
        status: { in: ["AGENDADO", "CONFIRMADO"] },
      },
      include: {
        animal: { include: { tutor: { select: { nome: true } } } },
        medico: { select: { name: true } },
        tipo: { select: { nome: true, cor: true } },
      },
      orderBy: { inicio: "asc" },
      take: 8,
    }),

    prisma.lancamento.aggregate({
      where: { tipo: "RECEITA", status: "PAGO", pagamento: { gte: startOfMes } },
      _sum: { valor: true },
    }),

    prisma.lancamento.count({
      where: { status: "PENDENTE", vencimento: { lt: startOfDay } },
    }),

    prisma.vacinaAplicada.findMany({
      where: { dataVencimento: { lt: now } },
      include: {
        animal: { select: { id: true, nome: true, especie: true } },
        vacina: { select: { nome: true } },
      },
      orderBy: { dataVencimento: "desc" },
      take: 5,
    }),

    prisma.vacinaAplicada.findMany({
      where: { dataVencimento: { gte: now, lte: em30dias } },
      include: {
        animal: { select: { id: true, nome: true, especie: true } },
        vacina: { select: { nome: true } },
      },
      orderBy: { dataVencimento: "asc" },
      take: 8,
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
  const statusLabel: Record<string, string> = {
    AGENDADO: "Agendado", CONFIRMADO: "Confirmado", EM_ATENDIMENTO: "Em atendimento",
    CONCLUIDO: "Concluído", CANCELADO: "Cancelado", FALTOU: "Faltou",
  };

  const diasParaVencer = (d: Date | string) => {
    const diff = new Date(d).getTime() - now.getTime();
    return Math.ceil(diff / 86400000);
  };

  const receita = receitaMes._sum.valor ?? 0;
  const mesNome = now.toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {saudacao()}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Clientes ativos"  value={totalTutores}             icon={Users}      color="blue" />
        <StatCard title="Animais ativos"   value={totalAnimais}             icon={PawPrint}   color="emerald" />
        <StatCard title="Consultas hoje"   value={agendamentosHoje.length}  icon={Calendar}   color="amber" />
        <StatCard
          title={`Receita — ${mesNome}`}
          value={formatCurrency(receita)}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Alertas */}
      {(vacinasVencidas.length > 0 || lancamentosVencidos > 0) && (
        <div className="space-y-2">
          {vacinasVencidas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">
                <span className="font-semibold">{vacinasVencidas.length} vacina(s) vencida(s)</span>
                {" — "}
                {vacinasVencidas.slice(0, 3).map(v => (
                  <Link key={v.id} href={`/animais/${v.animal.id}`} className="hover:underline">
                    {v.animal.nome}
                  </Link>
                )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ", ", el], [])}
                {vacinasVencidas.length > 3 && ` e mais ${vacinasVencidas.length - 3}`}
              </p>
            </div>
          )}
          {lancamentosVencidos > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <DollarSign size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 flex-1">
                <span className="font-semibold">{lancamentosVencidos} lançamento(s) vencido(s)</span>
                {" sem baixa"}
              </p>
              <Link href="/financeiro" className="text-xs text-amber-600 hover:underline flex-shrink-0">
                Ver financeiro →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Agenda hoje + Próximos 7 dias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Agenda de hoje */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Agenda de hoje</h2>
            <Link href="/agenda" className="text-sm text-teal-600 hover:underline">Ver agenda →</Link>
          </div>
          {agendamentosHoje.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma consulta hoje</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agendamentosHoje.map(a => (
                <Link key={a.id} href={`/animais/${a.animal.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="text-xl flex-shrink-0">{especieEmoji[a.animal.especie]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{a.animal.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{a.animal.tutor.nome} · {a.tipo?.nome ?? "Consulta"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700">
                      {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[a.status]}`}>
                      {statusLabel[a.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Próximos 7 dias */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Próximos 7 dias</h2>
            <Link href="/agenda" className="text-sm text-teal-600 hover:underline">Ver agenda →</Link>
          </div>
          {proximosAgendamentos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma consulta agendada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proximosAgendamentos.map(a => {
                const d = new Date(a.inicio);
                return (
                  <Link key={a.id} href={`/animais/${a.animal.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-xs font-bold text-teal-600">{d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}</p>
                      <p className="text-xs text-gray-400">{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="text-lg flex-shrink-0">{especieEmoji[a.animal.especie]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{a.animal.nome}</p>
                      <p className="text-xs text-gray-500 truncate">{a.animal.tutor.nome}</p>
                    </div>
                    {a.tipo && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.tipo.cor }} />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vacinas vencendo */}
      {vacinasPraVencer.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Syringe size={18} className="text-amber-500" />
              <h2 className="font-semibold text-gray-900">Vacinas vencendo nos próximos 30 dias</h2>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {vacinasPraVencer.length}
              </span>
            </div>
            <Link href="/vacinas" className="text-sm text-teal-600 hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {vacinasPraVencer.map(v => {
              const dias = diasParaVencer(v.dataVencimento!);
              return (
                <Link key={v.id} href={`/animais/${v.animal.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="text-lg flex-shrink-0">{especieEmoji[v.animal.especie]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700">{v.animal.nome}</p>
                    <p className="text-xs text-gray-500">{v.vacina.nome}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      dias <= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {dias === 0 ? "Vence hoje" : dias === 1 ? "Vence amanhã" : `${dias} dias`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
