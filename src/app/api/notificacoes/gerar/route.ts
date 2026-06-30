import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gerarNotificacoes } from "@/lib/notificacoes";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifs = await gerarNotificacoes(session.user.id);
  return NextResponse.json(notifs);
}
