import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: { active: true, ...(role ? { role: role as "ADMIN" | "VETERINARIO" | "ATENDENTE" | "FINANCEIRO" } : {}) },
    select: { id: true, name: true, email: true, role: true, crmv: true, specialty: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
