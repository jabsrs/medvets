import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS: { nome: string; cor: string; ordem: number; parentNome?: string }[] = [
  { nome: "Clínica",            cor: "#0EA5E9", ordem: 1 },
  { nome: "Hotel/Hospedagem",   cor: "#F59E0B", ordem: 2 },
  { nome: "Pet Shop",           cor: "#10B981", ordem: 3 },
  { nome: "Cirurgias",          cor: "#8B5CF6", ordem: 1, parentNome: "Clínica" },
  { nome: "Consultas",          cor: "#0EA5E9", ordem: 2, parentNome: "Clínica" },
  { nome: "Exames",             cor: "#0EA5E9", ordem: 3, parentNome: "Clínica" },
  { nome: "Internamento",       cor: "#EF4444", ordem: 4, parentNome: "Clínica" },
  { nome: "Procedimentos",      cor: "#0EA5E9", ordem: 5, parentNome: "Clínica" },
  { nome: "Vacinas",            cor: "#10B981", ordem: 6, parentNome: "Clínica" },
  { nome: "Acessórios",         cor: "#10B981", ordem: 1, parentNome: "Pet Shop" },
  { nome: "Antiparasitários",   cor: "#10B981", ordem: 2, parentNome: "Pet Shop" },
  { nome: "Biscoitos",          cor: "#F59E0B", ordem: 3, parentNome: "Pet Shop" },
  { nome: "Farmácia",           cor: "#EF4444", ordem: 4, parentNome: "Pet Shop" },
  { nome: "Higiene",            cor: "#10B981", ordem: 5, parentNome: "Pet Shop" },
  { nome: "Salão — Banho/Tosa", cor: "#EC4899", ordem: 6, parentNome: "Pet Shop" },
];

async function seed() {
  // Cria parents primeiro
  const pais: Record<string, string> = {};
  for (const d of DEFAULTS.filter(d => !d.parentNome)) {
    const g = await prisma.grupoProduto.create({ data: { nome: d.nome, cor: d.cor, ordem: d.ordem } });
    pais[d.nome] = g.id;
  }
  // Depois os filhos
  for (const d of DEFAULTS.filter(d => d.parentNome)) {
    const parentId = pais[d.parentNome!];
    if (parentId) await prisma.grupoProduto.create({ data: { nome: d.nome, cor: d.cor, ordem: d.ordem, parentId } });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";

  const count = await prisma.grupoProduto.count();
  if (count === 0) await seed();

  const grupos = await prisma.grupoProduto.findMany({
    where: all ? undefined : { ativo: true },
    include: {
      filhos: {
        where: all ? undefined : { ativo: true },
        include: { _count: { select: { produtos: true } } },
        orderBy: { ordem: "asc" },
      },
      _count: { select: { produtos: true } },
    },
    orderBy: { ordem: "asc" },
  });

  // Retorna só os top-level (parentId null)
  return NextResponse.json(grupos.filter(g => g.parentId === null));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const grupo = await prisma.grupoProduto.create({
    data: {
      nome:     body.nome.trim(),
      cor:      body.cor     ?? "#6B7280",
      parentId: body.parentId ?? null,
      ordem:    Number(body.ordem ?? 0),
    },
    include: { filhos: true, _count: { select: { produtos: true } } },
  });

  return NextResponse.json(grupo, { status: 201 });
}
