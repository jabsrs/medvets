import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { audit, getIp } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: { ...(role ? { role: role as "ADMIN" | "VETERINARIO" | "ATENDENTE" | "FINANCEIRO" } : {}) },
    select: { id: true, name: true, email: true, role: true, crmv: true, specialty: true, phone: true, active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, password, role, crmv, specialty, phone } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || "ATENDENTE", crmv, specialty, phone },
    select: { id: true, name: true, email: true, role: true, crmv: true, specialty: true, phone: true, active: true },
  });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "CREATE_USER", entidade: "User", entidadeId: user.id,
    descricao: `Criou usuário "${name}" (${email}) com perfil ${role || "ATENDENTE"}`,
    ip: getIp(req),
  });

  return NextResponse.json(user, { status: 201 });
}
