import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function calcAge(dataNasc: Date | string | null | undefined): string {
  if (!dataNasc) return "—";
  const birth = new Date(dataNasc);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months =
    now.getMonth() -
    birth.getMonth() +
    (now.getDate() < birth.getDate() ? -1 : 0) +
    years * 12;
  if (months < 12) return `${months} meses`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}a ${m}m` : `${y} anos`;
}

export const especieLabel: Record<string, string> = {
  CACHORRO: "Cachorro",
  GATO: "Gato",
  PASSARO: "Pássaro",
  REPTIL: "Réptil",
  ROEDOR: "Roedor",
  PEIXE: "Peixe",
  OUTRO: "Outro",
};

export const especieEmoji: Record<string, string> = {
  CACHORRO: "🐕",
  GATO: "🐈",
  PASSARO: "🦜",
  REPTIL: "🦎",
  ROEDOR: "🐹",
  PEIXE: "🐟",
  OUTRO: "🐾",
};

export const statusAgendamentoLabel: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Faltou",
};

export const statusAgendamentoCor: Record<string, string> = {
  AGENDADO: "#3B82F6",
  CONFIRMADO: "#10B981",
  EM_ATENDIMENTO: "#F59E0B",
  CONCLUIDO: "#6B7280",
  CANCELADO: "#EF4444",
  FALTOU: "#8B5CF6",
};
