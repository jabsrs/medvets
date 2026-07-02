"use client";
import { useEffect, useState } from "react";

export function DashboardGreeting({ nome }: { nome: string }) {
  const [saudacao, setSaudacao] = useState<string | null>(null);
  const [data,     setData]     = useState<string | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    const txt = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    setSaudacao(`${txt}${nome ? `, ${nome}` : ""}! 👋`);
    setData(new Date().toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }));
  }, [nome]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {saudacao ?? <span className="invisible">…</span>}
      </h1>
      <p className="text-gray-500 text-sm mt-0.5">
        {data ?? <span className="invisible">…</span>}
      </p>
    </div>
  );
}
