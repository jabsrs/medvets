"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Stethoscope, User, Calendar, ShoppingCart,
  Package, DollarSign, Search, Settings, ChevronLeft, ChevronRight, BarChart2, Percent,
} from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";

type NavChild = { href: string; label: string };
type NavSection = { type: "section"; label: string; icon: React.ElementType; children: NavChild[] };
type NavItem =
  | { type: "link"; href: string; label: string; icon: React.ElementType }
  | { type: "divider" }
  | NavSection;

const nav: NavItem[] = [
  { type: "link", href: "/dashboard",  label: "Painel de controle",  icon: LayoutDashboard },
  { type: "link", href: "/prontuario", label: "Atendimento clínico", icon: Stethoscope },
  { type: "link", href: "/tutores",    label: "Clientes",            icon: User },
  { type: "divider" },
  {
    type: "section", label: "Agenda", icon: Calendar,
    children: [
      { href: "/agenda",             label: "Agenda" },
      { href: "/tipos-atendimento",  label: "Tipos de atendimento" },
    ],
  },
  {
    type: "section", label: "Vendas", icon: ShoppingCart,
    children: [
      { href: "/vendas/caixa",            label: "Caixa" },
      { href: "/vendas/recebimentos",     label: "Recebimentos" },
      { href: "/vendas",                  label: "Ponto de venda" },
      { href: "/vendas/lista-precos",     label: "Lista de preços" },
      { href: "/vendas/orcamentos",       label: "Modelos de orçamento" },
      { href: "/vendas/saldo-clientes",   label: "Saldo dos clientes" },
      { href: "/vendas/ranking-clientes", label: "Ranking de clientes" },
    ],
  },
  {
    type: "section", label: "Estoque e serviços", icon: Package,
    children: [
      { href: "/estoque",         label: "Produtos e serviços" },
      { href: "/estoque/grupos",  label: "Grupos" },
      { href: "/estoque/compras", label: "Compras" },
      { href: "/estoque/saidas",  label: "Saídas" },
    ],
  },
  {
    type: "section", label: "Financeiro", icon: DollarSign,
    children: [
      { href: "/financeiro",                   label: "Lançamentos" },
      { href: "/financeiro/contas-pagar",      label: "Contas a Pagar" },
      { href: "/financeiro/fornecedores",      label: "Fornecedores" },
      { href: "/financeiro/formas-pagamento",  label: "Formas de Pagamento" },
    ],
  },
  {
    type: "section", label: "Consultas", icon: Search,
    children: [
      { href: "/consultas/aniversarios",  label: "Aniversários" },
      { href: "/consultas/atendimentos",  label: "Atendimentos" },
      { href: "/vacinas",                 label: "Vacinação" },
      { href: "/internacao",              label: "Internação" },
    ],
  },
  {
    type: "section", label: "Comissionamento", icon: Percent,
    children: [
      { href: "/comissionamento",         label: "Resumo" },
      { href: "/comissionamento/extrato", label: "Extrato" },
    ],
  },
  { type: "link", href: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { type: "divider" },
  {
    type: "section", label: "Configuração", icon: Settings,
    children: [
      { href: "/usuarios",  label: "Usuários" },
      { href: "/auditoria", label: "Auditoria" },
    ],
  },
];

type FlyoutState = { label: string; top: number; left: number };

export function Sidebar() {
  const pathname  = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [flyout, setFlyout]       = useState<FlyoutState | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exact match para links simples
  function isLinkActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Entre os filhos de uma seção, retorna o href de match MAIS LONGO
  // (evita que "/vendas" fique ativo quando estamos em "/vendas/caixa")
  function bestChild(children: NavChild[]): string | null {
    let best: string | null = null;
    for (const c of children) {
      if (pathname === c.href || pathname.startsWith(c.href + "/")) {
        if (!best || c.href.length > best.length) best = c.href;
      }
    }
    return best;
  }

  function openFlyout(label: string, el: HTMLElement) {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    const rect = el.getBoundingClientRect();
    setFlyout({ label, top: rect.top, left: rect.right + 8 });
  }
  function scheduleCloseFlyout() {
    closeTimer.current = setTimeout(() => setFlyout(null), 150);
  }
  function cancelCloseFlyout() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }

  const openSection = flyout
    ? (nav.find(i => i.type === "section" && i.label === flyout.label) as NavSection | undefined)
    : undefined;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-gray-900 text-white flex flex-col z-30 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1">
            <Image src="/logo.png" alt="MedVets" width={32} height={48} className="object-contain flex-shrink-0" />
            <span className="font-bold text-sm leading-tight">
              MedVets<br/>
              <span className="text-[10px] font-normal text-gray-400">Clínica Veterinária</span>
            </span>
          </div>
        )}
        {collapsed && (
          <Image src="/logo.png" alt="MedVets" width={28} height={42} className="object-contain mx-auto" />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white transition ml-auto flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {nav.map((item, i) => {
          if (item.type === "divider") {
            return <div key={i} className="my-2 mx-3 border-t border-gray-700" />;
          }

          if (item.type === "link") {
            const Icon = item.icon;
            const active = isLinkActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-teal-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          }

          // section
          const Icon = item.icon;
          const activeBest = bestChild(item.children);
          const anyActive  = activeBest !== null;

          /* ── RECOLHIDO: ícone clicável (navega p/ 1º filho) + hover abre flyout ── */
          if (collapsed) {
            const firstHref = item.children[0]?.href ?? "#";
            return (
              <Link
                key={item.label}
                href={firstHref}
                title={item.label}
                onMouseEnter={e => openFlyout(item.label, e.currentTarget)}
                onMouseLeave={scheduleCloseFlyout}
                className={cn(
                  "flex items-center justify-center py-2 mx-2 mb-0.5 rounded-lg transition-colors",
                  anyActive
                    ? "bg-teal-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Icon size={18} />
              </Link>
            );
          }

          /* ── EXPANDIDO: lista normal ─────────────────────────────── */
          return (
            <div key={item.label} className="mb-1">
              <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
                <Icon size={15} className={cn("flex-shrink-0", anyActive ? "text-teal-400" : "text-gray-500")} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {item.label}
                </span>
              </div>
              {item.children.map(child => {
                const active = activeBest === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      "flex items-center gap-3 pl-10 pr-3 py-1.5 mx-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-teal-600 text-white font-medium"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sair */}
      <div className="border-t border-gray-700 py-2">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          title={collapsed ? "Sair" : undefined}
        >
          <span className="text-lg flex-shrink-0">🚪</span>
          {!collapsed && <span>Sair</span>}
        </Link>
      </div>

      {/* Flyout do menu recolhido — renderizado via portal para escapar do
          overflow-y-auto do <nav> (que corta overflow-x mesmo sem pedir) */}
      {collapsed && flyout && openSection && typeof document !== "undefined" && createPortal(
        <div
          onMouseEnter={cancelCloseFlyout}
          onMouseLeave={scheduleCloseFlyout}
          style={{ position: "fixed", top: flyout.top, left: flyout.left }}
          className="z-50 bg-gray-800 rounded-xl shadow-2xl py-2 min-w-[180px] border border-gray-700"
        >
          <div className="px-3 py-1.5 mb-1 border-b border-gray-700">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {openSection.label}
            </p>
          </div>
          {openSection.children.map(child => {
            const active = bestChild(openSection.children) === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setFlyout(null)}
                className={cn(
                  "block px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "text-teal-400 font-medium"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>,
        document.body
      )}
    </aside>
  );
}
