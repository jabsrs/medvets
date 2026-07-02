import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Retorna true se mês/dia de `dataNasc` cai em alguma data do array `dias`
function nasceuEm(dataNasc: Date, dias: Date[]) {
  const m = dataNasc.getMonth();
  const d = dataNasc.getDate();
  return dias.some(dia => dia.getMonth() === m && dia.getDate() === d);
}

function proxDias(n: number): Date[] {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    return d;
  });
}

function idade(dataNasc: Date): number {
  const hoje = new Date();
  let anos = hoje.getFullYear() - dataNasc.getFullYear();
  if (
    hoje.getMonth() < dataNasc.getMonth() ||
    (hoje.getMonth() === dataNasc.getMonth() && hoje.getDate() < dataNasc.getDate())
  ) anos--;
  return anos;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get("periodo") ?? "mes"; // hoje | semana | mes
  const ultimaVisitaMeses = Number(searchParams.get("ultimaVisitaMeses") ?? "0");

  const dias = periodo === "hoje"   ? proxDias(1)
             : periodo === "semana" ? proxDias(7)
             : proxDias(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() + 1);

  // ─── Animais ──────────────────────────────────────────────────────────────
  const todosAnimais = await prisma.animal.findMany({
    where: { ativo: true, dataNasc: { not: null } },
    include: {
      tutor: { select: { id: true, nome: true, telefone: true, celular: true } },
      atendimentos: {
        select: { data: true },
        orderBy: { data: "desc" },
        take: 1,
      },
    },
  });

  let animais = todosAnimais.filter(a => nasceuEm(new Date(a.dataNasc!), dias));

  if (ultimaVisitaMeses > 0) {
    const corte = new Date();
    corte.setMonth(corte.getMonth() - ultimaVisitaMeses);
    animais = animais.filter(a => {
      const ultima = a.atendimentos[0]?.data;
      return !ultima || new Date(ultima) < corte;
    });
  }

  const animaisOut = animais.map(a => ({
    id:           a.id,
    nome:         a.nome,
    especie:      a.especie,
    raca:         a.raca,
    dataNasc:     a.dataNasc,
    idade:        idade(new Date(a.dataNasc!)),
    foto:         a.foto,
    ultimaVisita: a.atendimentos[0]?.data ?? null,
    tutor: {
      id:       a.tutor.id,
      nome:     a.tutor.nome,
      telefone: a.tutor.telefone,
      celular:  a.tutor.celular,
    },
  })).sort((a, b) => {
    // Ordena pelo dia/mês mais próximo do hoje
    const hoje = new Date();
    const prox = (d: Date) => {
      const r = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
      if (r < hoje) r.setFullYear(r.getFullYear() + 1);
      return r.getTime();
    };
    return prox(new Date(a.dataNasc!)) - prox(new Date(b.dataNasc!));
  });

  // ─── Tutores ──────────────────────────────────────────────────────────────
  const todosTutores = await prisma.tutor.findMany({
    where: { ativo: true, dataNasc: { not: null } },
    include: {
      animais: { where: { ativo: true }, select: { id: true, nome: true, especie: true } },
    },
  });

  const tutores = todosTutores
    .filter(t => nasceuEm(new Date(t.dataNasc!), dias))
    .map(t => ({
      id:       t.id,
      nome:     t.nome,
      dataNasc: t.dataNasc,
      idade:    idade(new Date(t.dataNasc!)),
      telefone: t.telefone,
      celular:  t.celular,
      email:    t.email,
      animais:  t.animais,
    }))
    .sort((a, b) => {
      const hoje = new Date();
      const prox = (d: Date) => {
        const r = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
        if (r < hoje) r.setFullYear(r.getFullYear() + 1);
        return r.getTime();
      };
      return prox(new Date(a.dataNasc!)) - prox(new Date(b.dataNasc!));
    });

  return NextResponse.json({ animais: animaisOut, tutores });
}
