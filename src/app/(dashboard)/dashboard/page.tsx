import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardGreeting } from "@/components/ui/DashboardGreeting";
import {
  Calendar, Users, PawPrint, TrendingUp, AlertTriangle,
  Clock, Syringe, DollarSign, Stethoscope, Package,
  BedDouble, Cake,
} from "lucide-react";
import { formatCurrency, especieEmoji } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const now        = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const em7dias    = new Date(now); em7dias.setDate(em7dias.getDate() + 7);
  const em30dias   = new Date(now); em30dias.setDate(em30dias.getDate() + 30);
  const startOfMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const diaHoje    = now.getDate();
  const mesHoje    = now.getMonth() + 1;

  const [
    totalTutores,
    totalAnimais,
    agendamentosHoje,
    proximosAgendamentos,
    receitaMes,
    contasVencidas,
    vacinasVencidas,
    vacinasPraVencer,
    ultimosAtendimentos,
    internacoesAtivas,
    estoqueAbaixoMin,
    aniversariantes,
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

    prisma.lancamento.findMany({
      where: { status: "PENDENTE", vencimento: { lt: startOfDay } },
      orderBy: { vencimento: "asc" },
      take: 6,
    }),

    prisma.vacinaAplicada.findMany({
      where: { dataVencimento: { lt: now }, animal: { ativo: true } },
      include: { animal: { select: { id: true, nome: true, especie: true } }, vacina: { select: { nome: true } } },
      orderBy: { dataVencimento: "desc" },
      take: 5,
    }),

    prisma.vacinaAplicada.findMany({
      where: { dataVencimento: { gte: now, lte: em30dias }, animal: { ativo: true } },
      include: { animal: { select: { id: true, nome: true, especie: true } }, vacina: { select: { nome: true } } },
      orderBy: { dataVencimento: "asc" },
      take: 8,
    }),

    prisma.atendimento.findMany({
      where: { data: { gte: startOfDay } },
      include: {
        animal: { select: { id: true, nome: true, especie: true } },
        medico: { select: { name: true } },
      },
      orderBy: { data: "desc" },
      take: 6,
    }),

    prisma.internacao.findMany({
      where: { status: "INTERNADO" },
      include: { animal: { select: { id: true, nome: true, especie: true } } },
      orderBy: { entrada: "asc" },
      take: 6,
    }),

    prisma.$queryRaw<{ id: string; nome: string; tipo: string; estoque: number; estoqueMin: number; unidade: string }[]>`
      SELECT id, nome, tipo, estoque, "estoqueMin", unidade
      FROM produtos
      WHERE ativo = true AND estoque <= "estoqueMin"
      ORDER BY (estoque - "estoqueMin") ASC
      LIMIT 8
    `,

    prisma.$queryRaw<{ id: string; nome: string; especie: string; tutorNome: string }[]>`
      SELECT a.id, a.nome, a.especie, t.nome as "tutorNome"
      FROM animais a
      JOIN tutores t ON t.id = a."tutorId"
      WHERE a.ativo = true
        AND a."dataNasc" IS NOT NULL
        AND EXTRACT(DAY FROM a."dataNasc") = ${diaHoje}
        AND EXTRACT(MONTH FROM a."dataNasc") = ${mesHoje}
      LIMIT 8
    `,
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

  const diasParaVencer = (d: Date | string) =>
    Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000);

  const diasInternado = (d: Date | string) =>
    Math.floor((now.getTime() - new Date(d).getTime()) / 86400000);

  const receita = receitaMes._sum.valor ?? 0;
  const mesNome = now.toLocaleDateString("pt-BR", { month: "long" });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <DashboardGreeting nome={session?.user?.name?.split(" ")[0] ?? ""} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Clientes ativos"      value={totalTutores}            icon={Users}       color="blue" />
        <StatCard title="Animais ativos"       value={totalAnimais}            icon={PawPrint}    color="emerald" />
        <StatCard title="Consultas hoje"       value={agendamentosHoje.length} icon={Calendar}    color="amber" />
        <StatCard title={`Receita — ${mesNome}`} value={formatCurrency(receita)} icon={TrendingUp} color="purple" />
      </div>

      {/* Alertas */}
      {(vacinasVencidas.length > 0 || contasVencidas.length > 0 || internacoesAtivas.length > 0) && (
        <div className="space-y-2">
          {vacinasVencidas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">
                <span className="font-semibold">{vacinasVencidas.length} vacina(s) vencida(s) — </span>
                {vacinasVencidas.slice(0, 3).map((v, i) => (
                  <span key={v.id}>{i > 0 && ", "}<Link href={`/animais/${v.animal.id}`} className="hover:underline">{v.animal.nome}</Link></span>
                ))}
                {vacinasVencidas.length > 3 && ` e mais ${vacinasVencidas.length - 3}`}
              </p>
            </div>
          )}
          {contasVencidas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <DollarSign size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 flex-1">
                <span className="font-semibold">{contasVencidas.length} conta(s) a pagar vencida(s)</span> sem baixa
              </p>
              <Link href="/financeiro" className="text-xs text-amber-600 hover:underline flex-shrink-0">Ver financeiro →</Link>
            </div>
          )}
          {internacoesAtivas.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <BedDouble size={18} className="text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700 flex-1">
                <span className="font-semibold">{internacoesAtivas.length} animal(is) internado(s) — </span>
                {internacoesAtivas.slice(0, 3).map((i, idx) => (
                  <span key={i.id}>{idx > 0 && ", "}<Link href={`/animais/${i.animal.id}`} className="hover:underline">{i.animal.nome}</Link></span>
                ))}
              </p>
              <Link href="/internacao" className="text-xs text-blue-600 hover:underline flex-shrink-0">Ver internações →</Link>
            </div>
          )}
        </div>
      )}

      {/* Agenda hoje + Próximos 7 dias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="space-y-1">
              {agendamentosHoje.map(a => (
                <Link key={a.id} href={`/animais/${a.animal.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="text-lg flex-shrink-0">{especieEmoji[a.animal.especie]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{a.animal.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{a.animal.tutor.nome} · {a.tipo?.nome ?? "Consulta"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700">
                      {new Date(a.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[a.status]}`}>
                      {statusLabel[a.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

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
            <div className="space-y-1">
              {proximosAgendamentos.map(a => {
                const d = new Date(a.inicio);
                return (
                  <Link key={a.id} href={`/animais/${a.animal.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-xs font-bold text-teal-600">
                        {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}
                      </p>
                      <p className="text-xs text-gray-400">{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="text-lg flex-shrink-0">{especieEmoji[a.animal.especie]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{a.animal.nome}</p>
                      <p className="text-xs text-gray-500 truncate">{a.animal.tutor.nome}</p>
                    </div>
                    {a.tipo && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.tipo.cor }} />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Últimos atendimentos do dia + Estoque abaixo mínimo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Últimos atendimentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Stethoscope size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900">Atendimentos de hoje</h2>
              {ultimosAtendimentos.length > 0 && (
                <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
                  {ultimosAtendimentos.length}
                </span>
              )}
            </div>
            <Link href="/prontuario" className="text-sm text-teal-600 hover:underline">Ver prontuário →</Link>
          </div>
          {ultimosAtendimentos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Stethoscope size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum atendimento hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ultimosAtendimentos.map(a => (
                <Link key={a.id} href={`/animais/${a.animal.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded-lg transition group">
                  <div className="text-lg flex-shrink-0">{especieEmoji[a.animal.especie]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{a.animal.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{a.medico.name}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(a.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Estoque abaixo do mínimo */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900">Estoque abaixo do mínimo</h2>
              {estoqueAbaixoMin.length > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                  {estoqueAbaixoMin.length}
                </span>
              )}
            </div>
            <Link href="/estoque" className="text-sm text-teal-600 hover:underline">Ver estoque →</Link>
          </div>
          {estoqueAbaixoMin.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Estoque em dia</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {estoqueAbaixoMin.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.nome}</p>
                    <p className="text-xs text-gray-400">Mín: {p.estoqueMin} {p.unidade}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    p.estoque < 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {p.estoque} {p.unidade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vacinas vencendo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Syringe size={18} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900">Vacinas vencendo nos próximos 30 dias</h2>
            {vacinasPraVencer.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {vacinasPraVencer.length}
              </span>
            )}
          </div>
          <Link href="/vacinas" className="text-sm text-teal-600 hover:underline">Ver todas →</Link>
        </div>
        {vacinasPraVencer.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Syringe size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma vacina vencendo nos próximos 30 dias</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {vacinasPraVencer.map(v => {
              const dias = diasParaVencer(v.dataVencimento!);
              return (
                <Link key={v.id} href={`/animais/${v.animal.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="text-lg flex-shrink-0">{especieEmoji[v.animal.especie]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{v.animal.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{v.vacina.nome}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    dias <= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias}d`}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Contas vencidas + Aniversariantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Contas a pagar vencidas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-red-400" />
              <h2 className="font-semibold text-gray-900">Contas vencidas</h2>
              {contasVencidas.length > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{contasVencidas.length}</span>
              )}
            </div>
            <Link href="/financeiro" className="text-sm text-teal-600 hover:underline">Ver financeiro →</Link>
          </div>
          {contasVencidas.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <DollarSign size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma conta vencida</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {contasVencidas.map(c => {
                const atrasoDias = Math.floor((now.getTime() - new Date(c.vencimento).getTime()) / 86400000);
                return (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{c.descricao}</p>
                      <p className="text-xs text-red-500">Venceu há {atrasoDias} dia(s)</p>
                    </div>
                    <span className="font-semibold text-sm text-red-600 ml-3 flex-shrink-0">
                      {formatCurrency(c.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aniversariantes de hoje */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cake size={16} className="text-pink-400" />
            <h2 className="font-semibold text-gray-900">Aniversariantes de hoje</h2>
            {aniversariantes.length > 0 && (
              <span className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full font-medium">{aniversariantes.length}</span>
            )}
          </div>
          {aniversariantes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Cake size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum aniversariante hoje</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {aniversariantes.map(a => (
                <Link key={a.id} href={`/animais/${a.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-1 px-1 rounded-lg transition group">
                  <span className="text-xl">{especieEmoji[a.especie] ?? "🐾"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{a.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{a.tutorNome}</p>
                  </div>
                  <span className="text-lg">🎂</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Internações em andamento */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BedDouble size={16} className="text-blue-400" />
            <h2 className="font-semibold text-gray-900">Internações em andamento</h2>
            {internacoesAtivas.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{internacoesAtivas.length}</span>
            )}
          </div>
          <Link href="/internacao" className="text-sm text-teal-600 hover:underline">Ver internação →</Link>
        </div>
        {internacoesAtivas.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BedDouble size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum animal internado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {internacoesAtivas.map(i => (
              <Link key={i.id} href={`/animais/${i.animal.id}`}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition group">
                <span className="text-xl">{especieEmoji[i.animal.especie] ?? "🐾"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm group-hover:text-teal-700 truncate">{i.animal.nome}</p>
                  {i.motivo && <p className="text-xs text-gray-500 truncate">{i.motivo}</p>}
                </div>
                <span className="text-xs text-blue-600 font-medium flex-shrink-0">
                  {diasInternado(i.entrada) === 0 ? "Hoje" : `${diasInternado(i.entrada)}d`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
