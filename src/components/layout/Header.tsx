"use client";
import { useSession, signOut } from "next-auth/react";
import { Bell, Search, LogOut, User, ChevronDown, CheckCheck, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Notif = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "INFO" | "ALERTA" | "SUCESSO" | "ERRO";
  link: string | null;
  lida: boolean;
  createdAt: string;
};

const tipoIcon: Record<string, React.ReactNode> = {
  INFO:    <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />,
  ALERTA:  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />,
  SUCESSO: <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />,
  ERRO:    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />,
};

const tipoBg: Record<string, string> = {
  INFO:    "bg-blue-50 border-blue-100",
  ALERTA:  "bg-amber-50 border-amber-100",
  SUCESSO: "bg-emerald-50 border-emerald-100",
  ERRO:    "bg-red-50 border-red-100",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showUser, setShowUser]   = useState(false);
  const [search, setSearch]       = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [unread, setUnread]       = useState(0);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Busca contagem de não lidas ao montar
  useEffect(() => {
    fetch("/api/notificacoes?count=1")
      .then(r => r.json())
      .then(d => setUnread(d.count ?? 0))
      .catch(() => null);
  }, []);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function openNotif() {
    if (showNotif) { setShowNotif(false); return; }
    setShowNotif(true);
    setLoadingNotif(true);
    try {
      const res = await fetch("/api/notificacoes/gerar", { method: "POST" });
      const data: Notif[] = await res.json();
      setNotifs(data);
      setUnread(data.filter(n => !n.lida).length);
    } catch { /* silent */ }
    finally { setLoadingNotif(false); }
  }

  async function marcarLida(n: Notif) {
    if (!n.lida) {
      await fetch(`/api/notificacoes/${n.id}`, { method: "PATCH" }).catch(() => null);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x));
      setUnread(prev => Math.max(0, prev - 1));
    }
    if (n.link) router.push(n.link);
    setShowNotif(false);
  }

  async function marcarTodas() {
    await fetch("/api/notificacoes/lidas", { method: "PATCH" }).catch(() => null);
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })));
    setUnread(0);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/busca?q=${encodeURIComponent(search)}`);
  }

  const naoLidas = notifs.filter(n => !n.lida);
  const lidas    = notifs.filter(n => n.lida);

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 z-20">
      {/* Busca global */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tutor, animal, produto..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </form>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notificações */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openNotif}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col max-h-[80vh]">
              {/* Header do dropdown */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">
                  Notificações {unread > 0 && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unread}</span>}
                </span>
                {unread > 0 && (
                  <button
                    onClick={marcarTodas}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition"
                  >
                    <CheckCheck size={13} /> Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Lista */}
              <div className="overflow-y-auto flex-1">
                {loadingNotif ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Verificando alertas...</div>
                ) : notifs.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    <Bell size={32} className="mx-auto mb-2 opacity-30" />
                    Nenhuma notificação
                  </div>
                ) : (
                  <>
                    {naoLidas.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Não lidas</p>
                        {naoLidas.map(n => (
                          <NotifItem key={n.id} n={n} onClick={marcarLida} />
                        ))}
                      </div>
                    )}
                    {lidas.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lidas</p>
                        {lidas.slice(0, 10).map(n => (
                          <NotifItem key={n.id} n={n} onClick={marcarLida} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Usuário */}
        <div className="relative">
          <button
            onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.role}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <button
                onClick={() => { router.push("/perfil"); setShowUser(false); }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={16} /> Meu perfil
              </button>
              <hr className="my-1" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotifItem({ n, onClick }: { n: Notif; onClick: (n: Notif) => void }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 ${
        !n.lida ? "" : "opacity-60"
      }`}
    >
      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tipoBg[n.tipo] ?? "bg-gray-50"}`}>
        {tipoIcon[n.tipo]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-medium truncate ${!n.lida ? "text-gray-900" : "text-gray-600"}`}>{n.titulo}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(n.createdAt)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.mensagem}</p>
      </div>
      {!n.lida && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
    </button>
  );
}
