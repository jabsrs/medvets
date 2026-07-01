"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Search, FileText, Users, X, Minus, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Produto = { id: string; nome: string; preco: number; tipo: string };
type Item    = { produtoId: string; quantidade: number; produto: { nome: string; preco: number } };
type Modelo  = {
  id: string; nome: string; validadeDias: number; compartilhado: boolean;
  ativo: boolean; obs?: string; user: { name: string };
  itens: Item[];
};

const emptyForm = { nome: "", validadeDias: 3, compartilhado: true, ativo: true, obs: "" };

export default function OrcamentosPage() {
  const [meus, setMeus]               = useState<Modelo[]>([]);
  const [compartilhados, setCompart]  = useState<Modelo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [itens, setItens]             = useState<Item[]>([]);
  const [busca, setBusca]             = useState("");
  const [produtos, setProdutos]       = useState<Produto[]>([]);
  const [buscaProd, setBuscaProd]     = useState("");
  const [saving, setSaving]           = useState(false);

  // Quick print modal
  const [modalImprimir, setModalImprimir] = useState(false);
  const [printModelo, setPrintModelo]     = useState<Modelo | null>(null);
  const [printNome, setPrintNome]         = useState("");
  const [printObs, setPrintObs]           = useState("");
  const [printValidade, setPrintValidade] = useState("");
  const [printItens, setPrintItens]       = useState<{ produtoId: string; quantidade: number; produto: { nome: string; preco: number } }[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/orcamentos");
    if (res.ok) { const d = await res.json(); setMeus(d.meus); setCompart(d.compartilhados); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function searchProdutos(q: string) {
    if (!q.trim()) { setProdutos([]); return; }
    const res = await fetch(`/api/produtos?q=${encodeURIComponent(q)}&limit=10`);
    if (res.ok) setProdutos(await res.json());
  }

  function openNew() {
    setEditId(null); setForm(emptyForm); setItens([]); setBuscaProd(""); setProdutos([]);
    setModalOpen(true);
  }

  function openEdit(m: Modelo) {
    setEditId(m.id);
    setForm({ nome: m.nome, validadeDias: m.validadeDias, compartilhado: m.compartilhado, ativo: m.ativo, obs: m.obs ?? "" });
    setItens(m.itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, produto: i.produto })));
    setBuscaProd(""); setProdutos([]);
    setModalOpen(true);
  }

  function addProduto(p: Produto) {
    const exists = itens.findIndex(i => i.produtoId === p.id);
    if (exists >= 0) {
      setItens(prev => prev.map((i, idx) => idx === exists ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItens(prev => [...prev, { produtoId: p.id, quantidade: 1, produto: { nome: p.nome, preco: p.preco } }]);
    }
    setBuscaProd(""); setProdutos([]);
  }

  function setQtd(idx: number, qtd: number) {
    if (qtd <= 0) { setItens(prev => prev.filter((_, i) => i !== idx)); return; }
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, quantidade: qtd } : item));
  }

  function removeItem(idx: number) { setItens(prev => prev.filter((_, i) => i !== idx)); }

  function abrirImpressao(m: Modelo) {
    const validade = new Date();
    validade.setDate(validade.getDate() + m.validadeDias);
    setPrintModelo(m);
    setPrintNome("");
    setPrintObs(m.obs ?? "");
    setPrintValidade(validade.toISOString().slice(0, 10));
    setPrintItens(m.itens.map(i => ({ ...i })));
    setModalImprimir(true);
  }

  function gerarImpressao() {
    if (!printModelo) return;
    const linhas = printItens.map(i => {
      const sub = i.produto.preco * i.quantidade;
      return `<tr style="border-bottom:1px solid #eee">
        <td style="padding:7px 10px">${i.produto.nome}</td>
        <td style="padding:7px 10px;text-align:center">${i.quantidade}</td>
        <td style="padding:7px 10px;text-align:right">R$ ${i.produto.preco.toFixed(2)}</td>
        <td style="padding:7px 10px;text-align:right">R$ ${sub.toFixed(2)}</td>
      </tr>`;
    }).join("");
    const total = printItens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orçamento — MedVets</title>
    <style>
      body{font-family:Arial,sans-serif;margin:40px;color:#222;font-size:14px}
      h1{font-size:22px;margin:0;color:#0d9488}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#f0fafa;padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #0d9488}
      .total-row td{font-weight:bold;padding:10px;background:#f9f9f9;border-top:2px solid #ddd}
      .footer{margin-top:40px;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px}
      .assinatura{margin-top:60px;border-top:1px solid #aaa;width:260px;padding-top:6px;font-size:12px;color:#555}
      @media print{.no-print{display:none}body{margin:20px}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>
        <h1>MedVets</h1>
        <p style="color:#666;margin:4px 0;font-size:13px">Clínica Veterinária · CRMV/SC 14192</p>
      </div>
      <div style="text-align:right;font-size:13px;color:#555">
        <p style="margin:2px 0"><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
        <p style="margin:2px 0"><strong>Válido até:</strong> ${new Date(printValidade + "T12:00:00").toLocaleDateString("pt-BR")}</p>
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #0d9488;margin-bottom:20px">
    <p style="margin:4px 0"><strong>Orçamento para:</strong> ${printNome || "—"}</p>
    ${printObs ? `<p style="margin:4px 0;color:#555"><strong>Observações:</strong> ${printObs}</p>` : ""}
    <table>
      <thead><tr>
        <th>Produto / Serviço</th>
        <th style="text-align:center">Qtd</th>
        <th style="text-align:right">Preço unit.</th>
        <th style="text-align:right">Subtotal</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr class="total-row">
        <td colspan="3" style="text-align:right">Total</td>
        <td style="text-align:right;color:#0d9488;font-size:16px">R$ ${total.toFixed(2)}</td>
      </tr></tfoot>
    </table>
    <div class="footer">
      <p>Este orçamento não constitui nota fiscal.</p>
      <p>Em caso de dúvidas, entre em contato conosco.</p>
    </div>
    <div class="assinatura">
      <p>Responsável técnico</p>
    </div>
    <div class="no-print" style="margin-top:32px;text-align:center">
      <button onclick="window.print()" style="padding:12px 28px;background:#0d9488;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:600">🖨️ Imprimir</button>
    </div>
    </body></html>`;
    const win = window.open("", "_blank", "width=820,height=680");
    if (win) { win.document.write(html); win.document.close(); }
    setModalImprimir(false);
  }

  async function save() {
    if (!form.nome) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      const body = { ...form, itens: itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade })) };
      const url  = editId ? `/api/orcamentos/${editId}` : "/api/orcamentos";
      const method = editId ? "PATCH" : "POST";
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Modelo atualizado!" : "Modelo criado!");
      setModalOpen(false);
      load();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  async function remove(id: string, nome: string) {
    if (!confirm(`Excluir modelo "${nome}"?`)) return;
    const res = await fetch(`/api/orcamentos/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Excluído"); load(); }
    else toast.error("Erro ao excluir");
  }

  const totalBruto = itens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0);
  const meusFiltered = meus.filter(m => m.nome.toLowerCase().includes(busca.toLowerCase()));

  function ModeloRow({ m, owner }: { m: Modelo; owner: boolean }) {
    return (
      <tr className="hover:bg-gray-50 transition border-b border-gray-100 last:border-0">
        <td className="px-5 py-3.5">
          <span className="font-medium text-gray-900">{m.nome}</span>
          <span className="ml-1.5 text-xs text-gray-400">({m.itens.length})</span>
        </td>
        <td className="px-5 py-3.5 text-gray-500 text-sm">{m.user.name}</td>
        <td className="px-5 py-3.5 text-center">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.ativo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            {m.ativo ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td className="px-5 py-3.5 text-center text-sm text-gray-500">
          {m.compartilhado ? "Sim" : "Não"}
        </td>
        <td className="px-5 py-3.5 text-center text-sm text-gray-400">
          {m.validadeDias} dias
        </td>
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => abrirImpressao(m)}
              title="Gerar orçamento rápido"
              className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition">
              <Printer size={15} />
            </button>
            {owner && (
              <>
                <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                  <Edit size={15} />
                </button>
                <button onClick={() => remove(m.id, m.nome)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Modelos de orçamento</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar modelo..." className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52" />
          </div>
          <Button onClick={openNew}><Plus size={15} /> Adicionar</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Meus modelos */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <FileText size={15} className="text-gray-400" />
              <h2 className="font-semibold text-gray-700 text-sm">Meus modelos</h2>
              <span className="ml-auto text-xs text-gray-400">{meusFiltered.length} modelo(s)</span>
            </div>
            {meusFiltered.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                {busca ? "Nenhum modelo encontrado" : "Nenhum modelo cadastrado — clique em Adicionar"}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5">Nome</th>
                    <th className="text-left px-5 py-2.5">Autor</th>
                    <th className="text-center px-5 py-2.5">Status</th>
                    <th className="text-center px-5 py-2.5">Compartilhado</th>
                    <th className="text-center px-5 py-2.5">Validade</th>
                    <th className="text-right px-5 py-2.5">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {meusFiltered.map(m => <ModeloRow key={m.id} m={m} owner={true} />)}
                </tbody>
              </table>
            )}
          </div>

          {/* Compartilhados comigo */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <Users size={15} className="text-gray-400" />
              <h2 className="font-semibold text-gray-700 text-sm">Modelos compartilhados comigo</h2>
              <span className="ml-auto text-xs text-gray-400">{compartilhados.length} modelo(s)</span>
            </div>
            {compartilhados.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Nenhum modelo compartilhado</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5">Nome</th>
                    <th className="text-left px-5 py-2.5">Autor</th>
                    <th className="text-center px-5 py-2.5">Status</th>
                    <th className="text-center px-5 py-2.5">Compartilhado</th>
                    <th className="text-center px-5 py-2.5">Validade</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {compartilhados.map(m => <ModeloRow key={m.id} m={m} owner={false} />)}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal: Orçamento rápido */}
      <Modal open={modalImprimir} onClose={() => setModalImprimir(false)}
        title={`Orçamento rápido — ${printModelo?.nome}`} size="lg">
        {printModelo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cliente</label>
                <input type="text" value={printNome} onChange={e => setPrintNome(e.target.value)}
                  placeholder="Ex: Maria da Silva (pode não estar no sistema)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label>
                <input type="date" value={printValidade} onChange={e => setPrintValidade(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>

            {/* Itens editáveis */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Produto / Serviço</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 w-28">Qtd</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Unit.</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {printItens.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2.5 text-gray-800">{item.produto.nome}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => {
                            const u = [...printItens];
                            if (u[idx].quantidade <= 1) { setPrintItens(u.filter((_, i) => i !== idx)); return; }
                            u[idx] = { ...u[idx], quantidade: u[idx].quantidade - 1 };
                            setPrintItens(u);
                          }} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition">
                            <Minus size={11} />
                          </button>
                          <input type="number" min={1} value={item.quantidade}
                            onChange={e => {
                              const u = [...printItens];
                              u[idx] = { ...u[idx], quantidade: Math.max(1, Number(e.target.value)) };
                              setPrintItens(u);
                            }}
                            className="w-10 text-center border border-gray-200 rounded py-0.5 text-sm" />
                          <button onClick={() => {
                            const u = [...printItens];
                            u[idx] = { ...u[idx], quantidade: u[idx].quantidade + 1 };
                            setPrintItens(u);
                          }} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition">
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(item.produto.preco)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">
                        {formatCurrency(item.produto.preco * item.quantidade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">Total</td>
                    <td className="px-4 py-2.5 text-right font-bold text-teal-700">
                      {formatCurrency(printItens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea value={printObs} onChange={e => setPrintObs(e.target.value)} rows={2}
                placeholder="Condições, prazo, observações..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setModalImprimir(false)}>Cancelar</Button>
              <Button onClick={gerarImpressao} className="bg-cyan-600 hover:bg-cyan-700">
                <Printer size={14} /> Gerar impressão
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal criar/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? "Editar modelo" : "Novo modelo de orçamento"} size="lg">
        <div className="space-y-4">
          {/* Cabeçalho do modelo */}
          <div className="grid grid-cols-3 gap-3">
            <Input label="Nome *" value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="col-span-1" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validade (dias) *</label>
              <input type="number" min={1} value={form.validadeDias}
                onChange={e => setForm(f => ({ ...f, validadeDias: +e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compartilhado</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setForm(f => ({ ...f, compartilhado: true }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.compartilhado ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Sim
                </button>
                <button onClick={() => setForm(f => ({ ...f, compartilhado: false }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${!form.compartilhado ? "bg-gray-700 text-white border-gray-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Não
                </button>
              </div>
            </div>
          </div>

          {/* Busca de produtos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produtos e Serviços</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={buscaProd}
                onChange={e => { setBuscaProd(e.target.value); searchProdutos(e.target.value); }}
                placeholder="Buscar produto ou serviço..."
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              {produtos.length > 0 && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {produtos.map(p => (
                    <button key={p.id} onClick={() => addProduto(p)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
                      <span className="truncate">{p.nome}</span>
                      <span className="text-gray-500 flex-shrink-0">{formatCurrency(p.preco)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de itens */}
          {itens.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Produto / Serviço</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 w-32">Qtd</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Valor</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {itens.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2.5 text-gray-800">{item.produto.nome}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setQtd(idx, item.quantidade - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition">
                            <Minus size={12} />
                          </button>
                          <input type="number" min={1} value={item.quantidade}
                            onChange={e => setQtd(idx, +e.target.value)}
                            className="w-12 text-center border border-gray-200 rounded py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          <button onClick={() => setQtd(idx, item.quantidade + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition">
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">
                        {formatCurrency(item.produto.preco * item.quantidade)}
                      </td>
                      <td className="pr-3">
                        <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 transition">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">Total bruto</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{formatCurrency(totalBruto)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <Textarea label="Observações" value={form.obs}
            onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} rows={2} />

          {editId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="flex gap-2">
                <button onClick={() => setForm(f => ({ ...f, ativo: true }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${form.ativo ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Ativo
                </button>
                <button onClick={() => setForm(f => ({ ...f, ativo: false }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${!form.ativo ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Inativo
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} loading={saving}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
