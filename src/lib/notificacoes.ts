import { prisma } from "./prisma";

export async function gerarNotificacoes(userId: string) {
  const agora = new Date();
  const em30dias = new Date(Date.now() + 30 * 86400000);
  const em90diasAtras = new Date(Date.now() - 90 * 86400000);
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);

  // Apaga notificações não lidas (serão recriadas com estado atual)
  await prisma.notificacao.deleteMany({ where: { userId, lida: false } });

  const notifs: Array<{
    userId: string;
    titulo: string;
    mensagem: string;
    tipo: "INFO" | "ALERTA" | "SUCESSO" | "ERRO";
    link: string;
  }> = [];

  const [vacinasVencendo, vacinasVencidas, retornosPendentes, internacoesAtivas, agendamentosHoje] =
    await Promise.all([
      // Vacinas vencendo nos próximos 30 dias
      prisma.vacinaAplicada.findMany({
        where: { dataVencimento: { gte: agora, lte: em30dias }, animal: { ativo: true } },
        include: { animal: { select: { id: true, nome: true } }, vacina: { select: { nome: true } } },
        orderBy: { dataVencimento: "asc" },
        take: 15,
      }),
      // Vacinas vencidas nos últimos 90 dias
      prisma.vacinaAplicada.findMany({
        where: { dataVencimento: { gte: em90diasAtras, lt: agora }, animal: { ativo: true } },
        include: { animal: { select: { id: true, nome: true } }, vacina: { select: { nome: true } } },
        orderBy: { dataVencimento: "desc" },
        take: 10,
      }),
      // Retornos pendentes (retorno marcado mas ainda não realizado)
      prisma.atendimento.findMany({
        where: { retorno: { lt: agora }, animal: { ativo: true } },
        include: { animal: { select: { id: true, nome: true } } },
        orderBy: { retorno: "asc" },
        take: 10,
      }),
      // Internações ativas
      prisma.internacao.findMany({
        where: { status: "INTERNADO" },
        include: { animal: { select: { id: true, nome: true } } },
        take: 20,
      }),
      // Agendamentos pendentes de hoje
      prisma.agendamento.count({
        where: {
          inicio: { gte: inicioDia, lte: fimDia },
          status: { in: ["AGENDADO", "CONFIRMADO"] },
        },
      }),
    ]);

  for (const v of vacinasVencendo) {
    const dias = Math.ceil((v.dataVencimento!.getTime() - agora.getTime()) / 86400000);
    notifs.push({
      userId,
      titulo: "Vacina vencendo",
      mensagem: `${v.animal.nome} — ${v.vacina.nome} vence em ${dias} dia(s)`,
      tipo: "ALERTA",
      link: `/animais/${v.animal.id}`,
    });
  }

  for (const v of vacinasVencidas) {
    const dias = Math.floor((agora.getTime() - v.dataVencimento!.getTime()) / 86400000);
    notifs.push({
      userId,
      titulo: "Vacina vencida",
      mensagem: `${v.animal.nome} — ${v.vacina.nome} venceu há ${dias} dia(s)`,
      tipo: "ERRO",
      link: `/animais/${v.animal.id}`,
    });
  }

  for (const a of retornosPendentes) {
    const dias = Math.floor((agora.getTime() - a.retorno!.getTime()) / 86400000);
    notifs.push({
      userId,
      titulo: "Retorno pendente",
      mensagem: `${a.animal.nome} — retorno marcado há ${dias} dia(s)`,
      tipo: "ALERTA",
      link: `/animais/${a.animal.id}`,
    });
  }

  for (const i of internacoesAtivas) {
    const dias = Math.floor((agora.getTime() - i.entrada.getTime()) / 86400000);
    notifs.push({
      userId,
      titulo: "Animal internado",
      mensagem: `${i.animal.nome} — internado há ${dias === 0 ? "menos de 1" : dias} dia(s)`,
      tipo: "INFO",
      link: "/internacao",
    });
  }

  if (agendamentosHoje > 0) {
    notifs.push({
      userId,
      titulo: "Agenda de hoje",
      mensagem: `${agendamentosHoje} consulta(s) agendada(s) para hoje`,
      tipo: "INFO",
      link: "/agenda",
    });
  }

  if (notifs.length > 0) {
    await prisma.notificacao.createMany({ data: notifs });
  }

  return prisma.notificacao.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
}
