/**
 * Importação de produtos e serviços do SimplesVet
 * Uso: npx tsx prisma/importar-produtos-simplesvet.ts
 */

import { PrismaClient, TipoProduto } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface ItemSimples {
  nome: string;
  codigo: number;
  validade: null;
  estoque: number | null;
  custo: number | null;
  markup_percent: number | null;
  preco_venda: number | null;
  situacao_estoque: null;
}

function detectarTipo(item: ItemSimples): TipoProduto {
  const nome = item.nome.toUpperCase();

  // Medicamentos: keywords farmacêuticos comuns
  const keywordsMed = [
    "MG", "ML", "INJ", "COMP", "CAPSULA", "AMPOLA", "AMP", "SOLUCAO",
    "SUSPENSAO", "SUSP", "CREME", "POMADA", "COLIR", "GOTAS", "XAROPE",
    "VACINA", "IMUNIZANTE", "ANTIBIOTICO", "ANTIBIOTIC",
  ];
  if (
    item.estoque !== null &&
    keywordsMed.some(k => nome.includes(k)) &&
    (item.custo !== null || item.preco_venda !== null)
  ) {
    return TipoProduto.MEDICAMENTO;
  }

  // Produtos físicos: tem estoque controlado
  if (item.estoque !== null) {
    return TipoProduto.PRODUTO;
  }

  // Serviços: sem estoque (consultas, cirurgias, exames etc.)
  return TipoProduto.SERVICO;
}

async function main() {
  const jsonPath = path.resolve(
    "/Users/jabsrs/Downloads/produtos_servicos_simplesvet.json"
  );

  if (!fs.existsSync(jsonPath)) {
    console.error("Arquivo não encontrado:", jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);
  const items: ItemSimples[] = data.produtos;

  console.log(`\n📦 Total no arquivo: ${items.length} itens\n`);

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  for (const item of items) {
    const codigo = String(item.codigo);
    const preco = item.preco_venda ?? item.custo ?? 0;
    const tipo = detectarTipo(item);

    const payload = {
      nome: item.nome.trim(),
      tipo,
      preco,
      custo: item.custo ?? undefined,
      estoque: item.estoque ?? 0,
    };

    try {
      const existing = await prisma.produto.findUnique({ where: { codigo } });

      if (existing) {
        await prisma.produto.update({ where: { codigo }, data: payload });
        atualizados++;
      } else {
        await prisma.produto.create({ data: { ...payload, codigo } });
        criados++;
      }
    } catch (e) {
      console.error(`  ❌ Erro no item "${item.nome}" (código ${codigo}):`, e);
      ignorados++;
    }
  }

  console.log("✅ Importação concluída!");
  console.log(`   Criados:     ${criados}`);
  console.log(`   Atualizados: ${atualizados}`);
  console.log(`   Com erro:    ${ignorados}`);
  console.log();
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
