"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, PawPrint, Package, Loader2 } from "lucide-react";
import { especieEmoji, formatCurrency } from "@/lib/utils";

type Results = {
  tutores: { id: string; nome: string; telefone: string; celular?: string; _count: { animais: number } }[];
  animais: { id: string; nome: string; especie: string; raca?: string; tutor: { id: string; nome: string } }[];
  produtos: { id: string; nome: string; tipo: string; preco: number; codigo?: string }[];
};

export default function BuscaPage() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    fetch(`/api/busca?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(setResults)
      .finally(() => setLoading(false));
  }, [q]);

  const total = results ? results.tutores.length + results.animais.length + results.produtos.length : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Busca</h1>
        {q && <p className="text-gray-500 mt-1">Resultados para: <strong>&quot;{q}&quot;</strong></p>}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Buscando...
        </div>
      )}

      {!loading && q && results && total === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">Nenhum resultado para &quot;{q}&quot;</p>
          <p className="text-sm mt-1">Tente buscar por nome, telefone, CPF ou código</p>
        </div>
      )}

      {!loading && !q && (
        <div className="text-center py-20 text-gray-400">
          <p>Use a barra de busca no topo para pesquisar tutores, animais ou produtos</p>
        </div>
      )}

      {results && total > 0 && (
        <div className="space-y-6">
          {/* Tutores */}
          {results.tutores.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Tutores ({results.tutores.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {results.tutores.map(t => (
                  <Link key={t.id} href={`/tutores/${t.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                    <div>
                      <p className="font-medium text-gray-900">{t.nome}</p>
                      <p className="text-sm text-gray-500">{t.celular || t.telefone}</p>
                    </div>
                    <span className="text-xs text-gray-400">{t._count.animais} animal(is)</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Animais */}
          {results.animais.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <PawPrint size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Animais ({results.animais.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {results.animais.map(a => (
                  <Link key={a.id} href={`/animais/${a.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition">
                    <span className="text-xl">{especieEmoji[a.especie] ?? "🐾"}</span>
                    <div>
                      <p className="font-medium text-gray-900">{a.nome}</p>
                      <p className="text-sm text-gray-500">{a.raca ?? "SRD"} · {a.tutor.nome}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Produtos */}
          {results.produtos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Produtos ({results.produtos.length})
                </h2>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {results.produtos.map(p => (
                  <Link key={p.id} href="/estoque"
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                    <div>
                      <p className="font-medium text-gray-900">{p.nome}</p>
                      {p.codigo && <p className="text-sm text-gray-500">Cód: {p.codigo}</p>}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.preco)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
