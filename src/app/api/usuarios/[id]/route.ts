import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { audit, getIp } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, password, role, crmv, specialty, phone, active } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (crmv !== undefined) data.crmv = crmv;
  if (specialty !== undefined) data.specialty = specialty;
  if (phone !== undefined) data.phone = phone;
  if (active !== undefined) data.active = active;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, crmv: true, specialty: true, phone: true, active: true },
  });

  const alteracoes: string[] = [];
  if (name) alteracoes.push("nome");
  if (email) alteracoes.push("email");
  if (role) alteracoes.push("perfil");
  if (password) alteracoes.push("senha");
  if (active === false) alteracoes.push("desativado");
  if (active === true) alteracoes.push("reativado");

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: active === false ? "DESATIVAR_USER" : "UPDATE_USER",
    entidade: "User", entidadeId: params.id,
    descricao: `Editou usuário "${user.name}" — alterações: ${alteracoes.join(", ") || "dados gerais"}`,
    ip: getIp(req),
  });

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { id: params.id }, select: { name: true, email: true } });
  await prisma.user.update({ where: { id: params.id }, data: { active: false } });

  void audit({
    userId: session.user?.id, userName: session.user?.name,
    acao: "DESATIVAR_USER", entidade: "User", entidadeId: params.id,
    descricao: `Desativou usuário "${target?.name ?? "—"}" (${target?.email ?? params.id})`,
    ip: getIp(req),
  });

  return NextResponse.json({ ok: true });
}
