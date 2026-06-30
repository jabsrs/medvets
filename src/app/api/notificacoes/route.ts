import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const countOnly = req.nextUrl.searchParams.get("count") === "1";

  if (countOnly) {
    const count = await prisma.notificacao.count({ where: { userId: session.user.id, lida: false } });
    return NextResponse.json({ count });
  }

  const notifs = await prisma.notificacao.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json(notifs);
}
