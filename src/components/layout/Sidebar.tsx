"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Calendar, Users, PawPrint, ClipboardList,
  Package, ShoppingCart, TrendingUp, Syringe, BedDouble,
  Settings, ChevronLeft, ChevronRight, Scissors, UserCog, ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const grupos = [
  {
    label: "Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/agenda", label: "Agenda", icon: Calendar },
    ],
  },
  {
    label: "Pacientes",
    items: [
      { href: "/tutores", label: "Tutores", icon: Users },
      { href: "/animais", label: "Animais", icon: PawPrint },
      { href: "/prontuario", label: "Prontuário", icon: ClipboardList },
      { href: "/vacinas", label: "Vacinas", icon: Syringe },
      { href: "/internacao", label: "Internação", icon: BedDouble },
    ],
  },
  {
    label: "Clínica",
    items: [
      { href: "/servicos", label: "Serviços", icon: Scissors },
      { href: "/estoque", label: "Estoque", icon: Package },
      { href: "/vendas", label: "Vendas / PDV", icon: ShoppingCart },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: TrendingUp },
    ],
  },
  {
    label: "Administração",
    items: [
      { href: "/usuarios", label: "Usuários", icon: UserCog },
      { href: "/auditoria", label: "Auditoria", icon: ShieldCheck },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-gray-900 text-white flex flex-col z-30 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐾</span>
            <span className="font-bold text-lg">MedVets</span>
          </div>
        )}
        {collapsed && <span className="text-2xl mx-auto">🐾</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white transition ml-auto">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav com grupos */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-1">
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {grupo.label}
              </p>
            )}
            {grupo.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-700 py-3">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <Settings size={20} />
          {!collapsed && <span>Configurações</span>}
        </Link>
      </div>
    </aside>
  );
}
