import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { senhaAtual, novaSenha } = await req.json();

  if (!senhaAtual || !novaSenha) {
    return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
  }
  if (novaSenha.length < 6) {
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const valid = await bcrypt.compare(senhaAtual, user.password);
  if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });

  const hash = await bcrypt.hash(novaSenha, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

  return NextResponse.json({ ok: true });
}
