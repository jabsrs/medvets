"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { toast } from "sonner";
import { Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Produto = { id: string; nome: string; preco: number; estoque: number; tipo: string };
type ItemCarrinho = { produtoId: string; nome: string; quantidade: number; preco: number; subtotal: number };
type Venda = { id: string; total: number; status: string; createdAt: string; tutor?: { nome: string }; itens: { produto: { nome: string }; quantidade: number; subtotal: number }[] };
type Tutor = { id: string; nome: string };

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [produtoQ, setProdutoQ] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [formaPag, setFormaPag] = useState("DINHEIRO");
  const [desconto, setDesconto] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/vendas").then((r) => r.json()).then((d) => { setVendas(d); setLoading(false); });
    fetch("/api/tutores?limit=200").then((r) => r.json()).then((d) => setTutores(d.tutores ?? []));
  }, []);

  useEffect(() => {
    if (produtoQ.length >= 2) {
      fetch(`/api/produtos?q=${encodeURIComponent(produtoQ)}`).then((r) => r.json()).then(setProdutos);
    } else {
      setProdutos([]);
    }
  }, [produtoQ]);

  function addProduto(p: Produto) {
    setCarrinho((prev) => {
      const exists = prev.find((i) => i.produtoId === p.id);
      if (exists) {
        return prev.map((i) => i.produtoId === p.id
          ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco }
          : i
        );
      }
      return [...prev, { produtoId: p.id, nome: p.nome, quantidade: 1, preco: p.preco, subtotal: p.preco }];
    });
    setProdutoQ("");
    setProdutos([]);
  }

  function removeItem(produtoId: string) {
    setCarrinho((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  function updateQtd(produtoId: string, qtd: number) {
    if (qtd < 1) return;
    setCarrinho((prev) => prev.map((i) => i.produtoId === produtoId
      ? { ...i, quantidade: qtd, subtotal: qtd * i.preco } : i
    ));
  }

  const subtotal = carrinho.reduce((s, i) => s + i.subtotal, 0);
  const descontoVal = Number(desconto) || 0;
  const total = Math.max(0, subtotal - descontoVal);

  async function finalizar() {
    if (carrinho.length === 0) { toast.error("Adicione itens ao carrinho"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: tutorId || null,
          desconto: descontoVal,
          total,
          formaPagamento: formaPag,
          itens: carrinho,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Venda finalizada!");
      setModalOpen(false);
      setCarrinho([]);
      setTutorId("");
      setDesconto("0");
      fetch("/api/vendas").then((r) => r.json()).then(setVendas);
    } catch { toast.error("Erro ao finalizar venda"); }
    finally { setSaving(false); }
  }

  const statusBadge: Record<string, "default" | "success" | "danger"> = {
    ABERTA: "default", FECHADA: "success", CANCELADA: "danger",
  };

  return (
    <div>
      <PageHeader
        title="Vendas / PDV"
        description="Ponto de venda e histórico"
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Nova venda</Button>}
      />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tutor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Itens</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Carregando...</td></tr>
            ) : vendas.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400"><ShoppingCart size={32} className="mx-auto mb-2 opacity-40" /><p>Nenhuma venda registrada</p></td></tr>
            ) : (
              vendas.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(v.createdAt)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.tutor?.nome ?? "Avulso"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{v.itens.length} item(s)</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(v.total)}</td>
                  <td className="px-4 py-3"><Badge variant={statusBadge[v.status]}>{v.status}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal PDV */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova venda" size="xl">
        <div className="grid grid-cols-2 gap-6">
          {/* Esquerda: busca + carrinho */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar produto</label>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={produtoQ} onChange={(e) => setProdutoQ(e.target.value)} placeholder="Nome do produto..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            {produtos.length > 0 && (
              <div className="border border-gray-200 rounded-lg mb-3 max-h-40 overflow-y-auto">
                {produtos.map((p) => (
                  <button key={p.id} onClick={() => addProduto(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                    <span>{p.nome}</span>
                    <span className="text-gray-500">{formatCurrency(p.preco)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b">Carrinho</div>
              {carrinho.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Nenhum item adicionado</div>
              ) : (
                <div className="divide-y">
                  {carrinho.map((item) => (
                    <div key={item.produtoId} className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1 text-sm font-medium text-gray-900 truncate">{item.nome}</span>
                      <input type="number" min={1} value={item.quantidade} onChange={(e) => updateQtd(item.produtoId, Number(e.target.value))}
                        className="w-14 border rounded px-2 py-1 text-sm text-center" />
                      <span className="text-sm font-semibold text-gray-700 w-20 text-right">{formatCurrency(item.subtotal)}</span>
                      <button onClick={() => removeItem(item.produtoId)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Direita: pagamento */}
          <div className="space-y-4">
            <Select label="Tutor (opcional)" value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
              <option value="">Venda avulsa</option>
              {tutores.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
            <Select label="Forma de pagamento" value={formaPag} onChange={(e) => setFormaPag(e.target.value)}>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CONVENIO">Convênio</option>
            </Select>
            <Input label="Desconto (R$)" type="number" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {descontoVal > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto</span>
                  <span>- {formatCurrency(descontoVal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-emerald-700">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={finalizar} loading={saving} disabled={carrinho.length === 0}>
              Finalizar venda
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
