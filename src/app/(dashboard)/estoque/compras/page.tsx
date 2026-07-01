"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Plus, FileUp, Search, Eye, Trash2, ChevronDown, ChevronUp, Link as LinkIcon, TrendingUp, TrendingDown, Minus as MinusIcon, PackagePlus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Fornecedor = {
  id: string; nome: string; cnpj?: string; ie?: string; telefone?: string;
  logradouro?: string; numero?: string; bairro?: string; cidade?: string; estado?: string;
};

type Compra = {
  id: string; codigo: number; dataEntrada: string; nf?: string; emissaoNf?: string;
  total: number; fornecedor?: { nome: string }; user: { name: string };
};

type CompraDetalhe = Compra & {
  natureza?: string; chaveNfe?: string; obs?: string; fornecedor?: Fornecedor;
  itens: {
    id: string; nomeProd: string; marca?: string; codigoProd?: string;
    quantidade: number; vlUnit: number; vlTotal: number;
    usoInterno: boolean; markup?: number; precoVenda?: number;
    produto?: { id: string; nome: string; codigo?: string; preco: number; usoInterno: boolean };
  }[];
};

type ProdutoBusca = {
  id: string; nome: string; codigo?: string; preco: number; custo?: number; usoInterno: boolean;
};

type Categoria = { id: string; nome: string; tipo: string };

// Estado do item no import
// "novo"       = produto não existe no sistema, destaque âmbar
// "vinculado"  = produto encontrado e ligado, destaque verde
// "sem-vinculo"= não encontrado e usuário não quis vincular
type EstadoItem = "novo" | "vinculado" | "sem-vinculo";

type ItemImport = {
  codigoProd: string; nomeProd: string; marca: string;
  quantidade: number; vlUnit: number; vlTotal: number;
  // matching
  estado: EstadoItem;
  produtoId: string;
  produtoAtual?: { nome: string; custo?: number; preco: number; usoInterno: boolean };
  usoInterno: boolean;
  markup: number;
  precoVenda: number;
  // search UI
  searching: boolean;
  results: ProdutoBusca[];
  searchQuery: string;
};

type NovoForm = {
  nome: string; codigo: string; tipo: string; categoriaId: string;
  unidade: string; usoInterno: boolean; markup: number; precoVenda: number;
};

// ─── NF-e XML parser ─────────────────────────────────────────────────────────

function parseNFe(xmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const ns = "http://www.portalfiscal.inf.br/nfe";

  function val(parent: Element | Document, tag: string): string {
    let els = parent.getElementsByTagNameNS(ns, tag);
    if (!els.length) els = parent.getElementsByTagName(tag);
    return els[0]?.textContent?.trim() ?? "";
  }
  function elems(parent: Element | Document, tag: string): Element[] {
    let els = Array.from(parent.getElementsByTagNameNS(ns, tag));
    if (!els.length) els = Array.from(parent.getElementsByTagName(tag));
    return els as Element[];
  }

  const ide   = elems(doc, "ide")[0];
  const emit  = elems(doc, "emit")[0];
  const ender = emit ? elems(emit, "enderEmit")[0] : null;
  const total = elems(doc, "ICMSTot")[0];
  const dets  = elems(doc, "det");

  const fone = ender ? val(ender, "fone") : "";
  const foneFormatted = fone.length === 10
    ? `(${fone.slice(0,2)}) ${fone.slice(2,6)}-${fone.slice(6)}`
    : fone.length === 11
    ? `(${fone.slice(0,2)}) ${fone.slice(2,7)}-${fone.slice(7)}`
    : fone;

  const fornecedor: Partial<Fornecedor> = {
    nome: emit ? val(emit, "xNome") : "",
    cnpj: emit ? val(emit, "CNPJ") : "",
    ie:   emit ? val(emit, "IE") : "",
    telefone: foneFormatted || undefined,
    logradouro: ender ? val(ender, "xLgr") : undefined,
    numero:     ender ? val(ender, "nro") : undefined,
    bairro:     ender ? val(ender, "xBairro") : undefined,
    cidade:     ender ? val(ender, "xMun") : undefined,
    estado:     ender ? val(ender, "UF") : undefined,
  };

  const nfData = {
    nf:       ide ? val(ide, "nNF") : "",
    emissaoNf: ide ? val(ide, "dhEmi").slice(0, 10) : "",
    natureza:  ide ? val(ide, "natOp") : "",
    chaveNfe:  (() => {
      const infNFe = elems(doc, "infNFe")[0];
      return infNFe?.getAttribute("Id")?.replace("NFe", "") ?? "";
    })(),
    total: total ? parseFloat(val(total, "vNF") || "0") : 0,
  };

  const itens = dets.map(det => {
    const prod = elems(det, "prod")[0];
    return {
      codigoProd: val(prod, "cProd"),
      nomeProd:   val(prod, "xProd"),
      marca:      val(prod, "xMarca") || val(prod, "xFab") || "",
      quantidade: parseFloat(val(prod, "qCom") || "0"),
      vlUnit:     parseFloat(val(prod, "vUnCom") || "0"),
      vlTotal:    parseFloat(val(prod, "vProd") || "0"),
    };
  });

  return { fornecedor, nfData, itens };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ComprasPage() {
  const [compras, setCompras]     = useState<Compra[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");

  // Detalhe
  const [detalhe, setDetalhe]           = useState<CompraDetalhe | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Import XML
  const [modalImport, setModalImport]   = useState(false);
  const [step, setStep]                 = useState<"upload" | "preview" | "saving">("upload");
  const fileRef                         = useRef<HTMLInputElement>(null);
  const [fornecedorPreview, setFornecedorPreview] = useState<Partial<Fornecedor>>({});
  const [nfPreview, setNfPreview]       = useState({ nf: "", emissaoNf: "", natureza: "", chaveNfe: "", total: 0 });
  const [dataEntrada, setDataEntrada]   = useState(new Date().toISOString().slice(0, 10));
  const [itensImport, setItensImport]   = useState<ItemImport[]>([]);
  const [expandedItems, setExpandedItems] = useState(true);

  // Cadastrar novo produto (dentro do import)
  const [modalNovoIdx, setModalNovoIdx] = useState<number | null>(null);
  const [novoForm, setNovoForm]         = useState<NovoForm>({ nome: "", codigo: "", tipo: "PRODUTO", categoriaId: "", unidade: "un", usoInterno: false, markup: 30, precoVenda: 0 });
  const [categorias, setCategorias]     = useState<Categoria[]>([]);
  const [savingNovo, setSavingNovo]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/compras?q=${encodeURIComponent(busca)}`);
    if (res.ok) setCompras(await res.json());
    setLoading(false);
  }, [busca]);

  useEffect(() => { load(); }, [load]);

  // ── XML import ──────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    const text = await file.text();
    try {
      const { fornecedor, nfData, itens } = parseNFe(text);
      setFornecedorPreview(fornecedor);
      setNfPreview(nfData);
      setDataEntrada(new Date().toISOString().slice(0, 10));

      const enriched: ItemImport[] = await Promise.all(itens.map(async (item) => {
        // Try to auto-match by product code
        let match: ProdutoBusca | null = null;
        if (item.codigoProd) {
          const res = await fetch(`/api/produtos?q=${encodeURIComponent(item.codigoProd)}&limit=10`);
          if (res.ok) {
            const list: ProdutoBusca[] = await res.json();
            match = list.find(p => p.codigo === item.codigoProd) ?? null;
          }
        }

        const usoInterno = match?.usoInterno ?? false;
        const markup     = usoInterno ? 0 : 30;
        const precoVenda = usoInterno ? 0 : parseFloat((item.vlUnit * (1 + markup / 100)).toFixed(2));

        return {
          ...item,
          estado:      match ? "vinculado" : "novo" as EstadoItem,
          produtoId:   match?.id ?? "",
          produtoAtual: match
            ? { nome: match.nome, custo: match.custo, preco: match.preco, usoInterno: match.usoInterno }
            : undefined,
          usoInterno,
          markup,
          precoVenda,
          searching:   false,
          results:     [],
          searchQuery: match?.nome ?? "",
        };
      }));

      setItensImport(enriched);
      setStep("preview");
    } catch {
      toast.error("Erro ao ler o XML. Verifique se é uma NF-e válida.");
    }
  }

  function updateItem(idx: number, changes: Partial<ItemImport>) {
    setItensImport(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...changes };
      if (("markup" in changes || "vlUnit" in changes) && !merged.usoInterno) {
        merged.precoVenda = parseFloat((merged.vlUnit * (1 + merged.markup / 100)).toFixed(2));
      }
      if ("usoInterno" in changes && changes.usoInterno) {
        merged.markup = 0; merged.precoVenda = 0;
      }
      return merged;
    }));
  }

  async function searchProduto(idx: number, q: string) {
    updateItem(idx, { searchQuery: q, searching: true, produtoId: "", produtoAtual: undefined, estado: "sem-vinculo" });
    if (!q.trim()) { updateItem(idx, { results: [], searching: false }); return; }
    const res = await fetch(`/api/produtos?q=${encodeURIComponent(q)}&limit=8`);
    const list: ProdutoBusca[] = res.ok ? await res.json() : [];
    updateItem(idx, { results: list, searching: false });
  }

  function selectProduto(idx: number, p: ProdutoBusca) {
    const item    = itensImport[idx];
    const usoInterno = p.usoInterno;
    const markup  = usoInterno ? 0 : (item.markup || 30);
    const precoVenda = usoInterno ? 0 : parseFloat((item.vlUnit * (1 + markup / 100)).toFixed(2));
    updateItem(idx, {
      produtoId: p.id,
      produtoAtual: { nome: p.nome, custo: p.custo, preco: p.preco, usoInterno: p.usoInterno },
      estado: "vinculado",
      usoInterno,
      markup,
      precoVenda,
      searchQuery: p.nome,
      results: [],
    });
  }

  // ── Cadastrar novo produto ──────────────────────────────────────────────────

  async function abrirCadastrarNovo(idx: number) {
    const item = itensImport[idx];
    const markup = 30;
    setNovoForm({
      nome:        item.nomeProd,
      codigo:      item.codigoProd,
      tipo:        "PRODUTO",
      categoriaId: "",
      unidade:     "un",
      usoInterno:  false,
      markup,
      precoVenda:  parseFloat((item.vlUnit * (1 + markup / 100)).toFixed(2)),
    });
    setModalNovoIdx(idx);

    // Load categories if not loaded
    if (categorias.length === 0) {
      const res = await fetch("/api/categorias");
      if (res.ok) setCategorias(await res.json());
    }
  }

  async function salvarNovoProduto() {
    if (modalNovoIdx === null) return;
    if (!novoForm.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSavingNovo(true);
    try {
      const item = itensImport[modalNovoIdx];
      const payload = {
        nome:        novoForm.nome,
        codigo:      novoForm.codigo || null,
        tipo:        novoForm.tipo,
        categoriaId: novoForm.categoriaId || null,
        unidade:     novoForm.unidade,
        usoInterno:  novoForm.usoInterno,
        preco:       novoForm.usoInterno ? 0 : novoForm.precoVenda,
        custo:       item.vlUnit,
        estoque:     0,
      };
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const criado: ProdutoBusca & { id: string } = await res.json();
      toast.success(`Produto "${criado.nome}" cadastrado!`);
      // Link the item
      updateItem(modalNovoIdx, {
        produtoId: criado.id,
        produtoAtual: { nome: criado.nome, custo: undefined, preco: criado.preco, usoInterno: criado.usoInterno },
        estado: "vinculado",
        usoInterno: novoForm.usoInterno,
        markup: novoForm.markup,
        precoVenda: novoForm.precoVenda,
        searchQuery: criado.nome,
      });
      setModalNovoIdx(null);
    } catch { toast.error("Erro ao cadastrar produto"); }
    finally { setSavingNovo(false); }
  }

  // ── Save compra ─────────────────────────────────────────────────────────────

  async function salvarCompra() {
    const novos = itensImport.filter(i => i.estado === "novo");
    if (novos.length > 0) {
      const nomes = novos.map(i => i.nomeProd).join(", ");
      if (!confirm(`Ainda há ${novos.length} produto(s) não cadastrado(s):\n${nomes}\n\nDeseja continuar sem cadastrá-los? (não serão vinculados ao estoque)`)) return;
    }

    setStep("saving");
    try {
      let fornecedorId: string | undefined;
      if (fornecedorPreview.nome) {
        const res = await fetch("/api/fornecedores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fornecedorPreview),
        });
        if (res.ok) { const f = await res.json(); fornecedorId = f.id; }
      }

      const payload = {
        fornecedorId,
        nf:          nfPreview.nf,
        chaveNfe:    nfPreview.chaveNfe,
        emissaoNf:   nfPreview.emissaoNf || null,
        dataEntrada,
        natureza:    nfPreview.natureza,
        total:       nfPreview.total,
        itens: itensImport.map(i => ({
          produtoId:  i.produtoId || null,
          codigoProd: i.codigoProd,
          nomeProd:   i.nomeProd,
          marca:      i.marca,
          quantidade: i.quantidade,
          vlUnit:     i.vlUnit,
          vlTotal:    i.vlTotal,
          usoInterno: i.usoInterno,
          markup:     i.usoInterno ? null : i.markup,
          precoVenda: i.usoInterno ? null : (i.precoVenda || null),
        })),
      };

      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Compra registrada e estoque atualizado!");
      setModalImport(false);
      setStep("upload");
      load();
    } catch {
      toast.error("Erro ao salvar compra");
      setStep("preview");
    }
  }

  async function abrirDetalhe(id: string) {
    setLoadingDetalhe(true);
    setDetalhe(null);
    const res = await fetch(`/api/compras/${id}`);
    if (res.ok) setDetalhe(await res.json());
    setLoadingDetalhe(false);
  }

  async function excluir(id: string, codigo: number) {
    if (!confirm(`Excluir compra #${codigo}? Isso NÃO reverte o estoque.`)) return;
    const res = await fetch(`/api/compras/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Compra excluída"); load(); }
    else toast.error("Erro ao excluir");
  }

  const qtdNovos     = itensImport.filter(i => i.estado === "novo").length;
  const qtdVinculados = itensImport.filter(i => i.estado === "vinculado").length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por NF ou fornecedor..." className="pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-64" />
          </div>
          <Button onClick={() => { setStep("upload"); setModalImport(true); }}>
            <FileUp size={15} /> Importar XML
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando...</div>
        ) : compras.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhuma compra registrada. Importe uma NF-e em XML para começar.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Cód.</th>
                <th className="text-left px-5 py-3">Entrada</th>
                <th className="text-left px-5 py-3">Fornecedor</th>
                <th className="text-left px-5 py-3">NF</th>
                <th className="text-left px-5 py-3">Emissão NF</th>
                <th className="text-right px-5 py-3">Valor</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compras.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3.5 text-gray-500">{c.codigo}</td>
                  <td className="px-5 py-3.5 text-gray-700">{formatDate(c.dataEntrada)}</td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{c.fornecedor?.nome ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600">{c.nf ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-500">{c.emissaoNf ? formatDate(c.emissaoNf) : "—"}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-gray-900">R$ {c.total.toFixed(2).replace(".", ",")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirDetalhe(c.id)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => excluir(c.id, c.codigo)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Detalhe ── */}
      <Modal open={!!detalhe || loadingDetalhe} onClose={() => setDetalhe(null)} title="Resumo da compra" size="xl">
        {loadingDetalhe && <div className="text-center py-10 text-gray-400">Carregando...</div>}
        {detalhe && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Informações fiscais</p>
                <p><span className="text-gray-500">Código:</span> <strong>#{detalhe.codigo}</strong></p>
                <p><span className="text-gray-500">Entrada:</span> {formatDate(detalhe.dataEntrada)}</p>
                {detalhe.emissaoNf && <p><span className="text-gray-500">Emissão NF:</span> {formatDate(detalhe.emissaoNf)}</p>}
                {detalhe.nf && <p><span className="text-gray-500">NF:</span> {detalhe.nf}</p>}
                <p><span className="text-gray-500">Usuário:</span> {detalhe.user.name}</p>
                {detalhe.natureza && <p><span className="text-gray-500">Natureza:</span> {detalhe.natureza}</p>}
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Fornecedor</p>
                {detalhe.fornecedor ? (
                  <>
                    <p className="font-medium text-gray-900">{detalhe.fornecedor.nome}</p>
                    {detalhe.fornecedor.cnpj && <p className="text-gray-500">CNPJ: {detalhe.fornecedor.cnpj}</p>}
                    {detalhe.fornecedor.ie && <p className="text-gray-500">IE: {detalhe.fornecedor.ie}</p>}
                    {detalhe.fornecedor.telefone && <p className="text-gray-500">{detalhe.fornecedor.telefone}</p>}
                    {detalhe.fornecedor.logradouro && (
                      <p className="text-gray-500">{detalhe.fornecedor.logradouro}, {detalhe.fornecedor.numero} — {detalhe.fornecedor.cidade}/{detalhe.fornecedor.estado}</p>
                    )}
                  </>
                ) : <p className="text-gray-400">Não cadastrado</p>}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2.5">Cód.</th>
                    <th className="text-left px-4 py-2.5">Nome</th>
                    <th className="text-right px-4 py-2.5">Unit.</th>
                    <th className="text-center px-4 py-2.5">Qtd.</th>
                    <th className="text-right px-4 py-2.5">Total</th>
                    <th className="text-center px-4 py-2.5">Markup</th>
                    <th className="text-right px-4 py-2.5">Vl. venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detalhe.itens.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{item.codigoProd ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900">{item.nomeProd}</p>
                        {item.produto && (
                          <p className="text-xs text-teal-600 flex items-center gap-1"><LinkIcon size={10} /> {item.produto.nome}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">R$ {item.vlUnit.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700">{item.quantidade}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">R$ {item.vlTotal.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {item.usoInterno
                          ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Interno</span>
                          : item.markup != null ? <span className="text-xs text-emerald-700">{item.markup}%</span> : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {item.usoInterno
                          ? <span className="text-xs text-gray-400">Uso interno</span>
                          : item.precoVenda ? <span className="font-semibold text-teal-700">R$ {item.precoVenda.toFixed(2)}</span> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={4} className="px-4 py-2.5 text-right font-semibold text-gray-700">Total NF</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">R$ {detalhe.total.toFixed(2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Importar XML ── */}
      <Modal open={modalImport} onClose={() => { if (step !== "saving") { setModalImport(false); setStep("upload"); } }}
        title="Importar NF-e (XML)" size="xl">

        {/* STEP 1: upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Selecione o arquivo XML da Nota Fiscal Eletrônica para importar automaticamente os dados do fornecedor e produtos.</p>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition">
              <FileUp size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Clique para selecionar o arquivo XML</p>
              <p className="text-xs text-gray-400 mt-1">NF-e padrão SEFAZ (versão 3.10 ou 4.00)</p>
              <input ref={fileRef} type="file" accept=".xml" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          </div>
        )}

        {/* STEP 2: preview */}
        {(step === "preview" || step === "saving") && (
          <div className="space-y-5">
            {/* NF summary */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Fornecedor</p>
                <p className="font-semibold text-gray-900">{fornecedorPreview.nome || "—"}</p>
                {fornecedorPreview.cnpj && <p className="text-gray-500">CNPJ: {fornecedorPreview.cnpj}</p>}
                {fornecedorPreview.telefone && <p className="text-gray-500">{fornecedorPreview.telefone}</p>}
                {fornecedorPreview.cidade && <p className="text-gray-500">{fornecedorPreview.cidade}/{fornecedorPreview.estado}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Nota Fiscal</p>
                <p className="text-gray-700">NF: <strong>{nfPreview.nf || "—"}</strong></p>
                {nfPreview.emissaoNf && <p className="text-gray-500">Emissão: {new Date(nfPreview.emissaoNf + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                <p className="text-gray-700">Total: <strong className="text-teal-700">R$ {nfPreview.total.toFixed(2)}</strong></p>
                <div className="mt-2">
                  <label className="text-xs text-gray-500">Data de entrada</label>
                  <input type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)}
                    className="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
            </div>

            {/* Legend + stats */}
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-400" /> {qtdNovos} novo(s) — não cadastrado(s)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-teal-500" /> {qtdVinculados} vinculado(s) ao sistema
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gray-200" /> {itensImport.length - qtdNovos - qtdVinculados} sem vínculo
              </span>
              <button onClick={() => setExpandedItems(!expandedItems)}
                className="ml-auto flex items-center gap-1 text-gray-400 hover:text-gray-600">
                {expandedItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expandedItems ? "Recolher" : "Expandir"}
              </button>
            </div>

            {/* Item cards */}
            {expandedItems && (
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {itensImport.map((item, idx) => {
                  const isNovo      = item.estado === "novo";
                  const isVinculado = item.estado === "vinculado";
                  const custoDiff   = isVinculado && item.produtoAtual?.custo != null
                    ? item.vlUnit - item.produtoAtual.custo
                    : null;

                  return (
                    <div key={idx} className={`rounded-xl border-2 p-4 transition ${
                      isNovo      ? "border-amber-400 bg-amber-50"
                      : isVinculado ? "border-teal-400 bg-white"
                      : "border-gray-200 bg-white"
                    }`}>
                      {/* Top row */}
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Estado badge */}
                            {isNovo && (
                              <span className="text-xs font-semibold bg-amber-400 text-white px-2 py-0.5 rounded-full">
                                NOVO
                              </span>
                            )}
                            {isVinculado && (
                              <span className="text-xs font-semibold bg-teal-500 text-white px-2 py-0.5 rounded-full">
                                ✓ VINCULADO
                              </span>
                            )}
                            {item.codigoProd && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{item.codigoProd}</span>
                            )}
                            <p className="font-semibold text-gray-900 text-sm">{item.nomeProd}</p>
                            {item.marca && <span className="text-xs text-gray-400">{item.marca}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>Qtd: <strong className="text-gray-700">{item.quantidade}</strong></span>
                            <span>Custo NF: <strong className="text-gray-700">R$ {item.vlUnit.toFixed(2)}</strong></span>
                            <span>Total: <strong className="text-gray-700">R$ {item.vlTotal.toFixed(2)}</strong></span>
                          </div>
                        </div>

                        {/* Uso interno toggle */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-400">Uso interno</span>
                          <button onClick={() => updateItem(idx, { usoInterno: !item.usoInterno })}
                            className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${item.usoInterno ? "bg-gray-400" : "bg-teal-500"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.usoInterno ? "" : "translate-x-4"}`} />
                          </button>
                        </div>
                      </div>

                      {/* Custo comparison (for linked products) */}
                      {isVinculado && custoDiff !== null && (
                        <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                          custoDiff > 0.01 ? "bg-red-50 text-red-700"
                          : custoDiff < -0.01 ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-50 text-gray-500"
                        }`}>
                          {custoDiff > 0.01 ? <TrendingUp size={13} /> : custoDiff < -0.01 ? <TrendingDown size={13} /> : <MinusIcon size={13} />}
                          <span>
                            Custo anterior: <strong>R$ {item.produtoAtual!.custo!.toFixed(2)}</strong>
                            {" → "}
                            <strong>R$ {item.vlUnit.toFixed(2)}</strong>
                            {" "}
                            ({custoDiff > 0 ? "+" : ""}{custoDiff.toFixed(2)})
                            {" "}
                            {custoDiff > 0.01 ? "— preço subiu" : custoDiff < -0.01 ? "— preço caiu" : "— sem alteração"}
                          </span>
                        </div>
                      )}

                      {/* NEW PRODUCT: call to action */}
                      {isNovo && (
                        <button
                          onClick={() => abrirCadastrarNovo(idx)}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-amber-400 text-amber-700 text-sm font-medium hover:bg-amber-100 transition">
                          <PackagePlus size={16} />
                          Clique para cadastrar este produto no sistema
                        </button>
                      )}

                      {/* LINKED: search to change link */}
                      {!isNovo && (
                        <div className="mt-3 relative">
                          <label className="text-xs text-gray-400 mb-1 block">
                            {isVinculado ? `Produto no sistema: ${item.produtoAtual?.nome}` : "Vincular produto do sistema"}
                          </label>
                          <input type="text" value={item.searchQuery}
                            onChange={e => searchProduto(idx, e.target.value)}
                            placeholder="Buscar produto no sistema..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                          {item.searching && <span className="absolute right-3 top-8 text-xs text-gray-400">Buscando...</span>}
                          {item.results.length > 0 && (
                            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                              {item.results.map(p => (
                                <button key={p.id} onClick={() => selectProduto(idx, p)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                                  <span>
                                    {p.nome}
                                    {p.codigo && <span className="ml-2 text-xs text-gray-400 font-mono">({p.codigo})</span>}
                                    {p.usoInterno && <span className="ml-1 text-xs bg-gray-100 text-gray-500 px-1 rounded">interno</span>}
                                  </span>
                                  <span className="text-teal-600 text-xs ml-2">R$ {p.preco.toFixed(2)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Also allow linking new products via search */}
                      {isNovo && (
                        <div className="mt-2 relative">
                          <label className="text-xs text-gray-400 mb-1 block">Ou vincular a produto existente</label>
                          <input type="text" value={item.searchQuery}
                            onChange={e => searchProduto(idx, e.target.value)}
                            placeholder="Buscar produto existente..."
                            className="w-full border border-amber-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                          {item.results.length > 0 && (
                            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                              {item.results.map(p => (
                                <button key={p.id} onClick={() => selectProduto(idx, p)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 flex items-center justify-between border-b border-gray-50 last:border-0">
                                  <span>{p.nome}{p.codigo && <span className="ml-2 text-xs text-gray-400 font-mono">({p.codigo})</span>}</span>
                                  <span className="text-teal-600 text-xs ml-2">R$ {p.preco.toFixed(2)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Markup panel for products marked as for sale */}
                      {!item.usoInterno && (isVinculado || isNovo) && (
                        <div className="mt-3 grid grid-cols-3 gap-3 bg-emerald-50 rounded-lg p-3">
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Markup (%)</label>
                            <input type="number" min="0" step="1" value={item.markup}
                              onChange={e => updateItem(idx, { markup: Number(e.target.value) })}
                              className="w-full border border-emerald-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600 block mb-1">Custo (NF)</label>
                            <div className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-600">
                              R$ {item.vlUnit.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-emerald-700 block mb-1">Preço de venda</label>
                            <input type="number" min="0" step="0.01" value={item.precoVenda}
                              onChange={e => updateItem(idx, { precoVenda: Number(e.target.value) })}
                              className="w-full border border-emerald-400 rounded-lg px-2 py-1.5 text-sm font-semibold text-emerald-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          </div>
                        </div>
                      )}

                      {item.usoInterno && (
                        <div className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                          Produto para consumo interno — custo atualizado, preço de venda não alterado.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {qtdNovos > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
                <PackagePlus size={15} />
                <span><strong>{qtdNovos}</strong> produto(s) não cadastrado(s). Clique em cada card âmbar para cadastrar antes de confirmar.</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t">
              <button onClick={() => setStep("upload")} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
              <Button onClick={salvarCompra} loading={step === "saving"}>
                Confirmar compra e atualizar estoque
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Cadastrar novo produto ── */}
      <Modal open={modalNovoIdx !== null} onClose={() => setModalNovoIdx(null)}
        title="Cadastrar novo produto" size="md">
        {modalNovoIdx !== null && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
              <strong>{itensImport[modalNovoIdx]?.nomeProd}</strong> — não encontrado no sistema. Preencha os dados para cadastrar.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Nome do produto *" value={novoForm.nome}
                onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))} />
              <Input label="Código (SKU/Cód. NF)" value={novoForm.codigo}
                onChange={e => setNovoForm(f => ({ ...f, codigo: e.target.value }))} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Select label="Tipo" value={novoForm.tipo}
                onChange={e => setNovoForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="PRODUTO">Produto</option>
                <option value="MEDICAMENTO">Medicamento</option>
                <option value="SERVICO">Serviço</option>
              </Select>
              <Select label="Categoria" value={novoForm.categoriaId}
                onChange={e => setNovoForm(f => ({ ...f, categoriaId: e.target.value }))}>
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </Select>
              <Input label="Unidade" value={novoForm.unidade}
                onChange={e => setNovoForm(f => ({ ...f, unidade: e.target.value }))}
                placeholder="un, cx, fr..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Uso interno</label>
              <div className="flex gap-2">
                <button onClick={() => setNovoForm(f => ({ ...f, usoInterno: false }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${!novoForm.usoInterno ? "bg-teal-600 text-white border-teal-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Para venda
                </button>
                <button onClick={() => setNovoForm(f => ({ ...f, usoInterno: true }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${novoForm.usoInterno ? "bg-gray-600 text-white border-gray-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  Uso interno
                </button>
              </div>
            </div>

            {!novoForm.usoInterno && (
              <div className="grid grid-cols-3 gap-3 bg-emerald-50 rounded-xl p-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Custo NF</label>
                  <div className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-600">
                    R$ {itensImport[modalNovoIdx]?.vlUnit.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Markup (%)</label>
                  <input type="number" min="0" step="1" value={novoForm.markup}
                    onChange={e => {
                      const m = Number(e.target.value);
                      const custo = itensImport[modalNovoIdx!]?.vlUnit ?? 0;
                      setNovoForm(f => ({ ...f, markup: m, precoVenda: parseFloat((custo * (1 + m / 100)).toFixed(2)) }));
                    }}
                    className="w-full border border-emerald-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-emerald-700 block mb-1">Preço de venda</label>
                  <input type="number" min="0" step="0.01" value={novoForm.precoVenda}
                    onChange={e => setNovoForm(f => ({ ...f, precoVenda: Number(e.target.value) }))}
                    className="w-full border border-emerald-400 rounded-lg px-2 py-1.5 text-sm font-semibold text-emerald-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setModalNovoIdx(null)}>Cancelar</Button>
              <Button onClick={salvarNovoProduto} loading={savingNovo}>
                <PackagePlus size={14} /> Cadastrar produto
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
