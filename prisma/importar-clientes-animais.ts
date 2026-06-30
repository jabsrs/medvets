/**
 * Importação de clientes e animais do SimplesVet
 * Uso: npx tsx prisma/importar-clientes-animais.ts
 */

import { PrismaClient, Especie, Sexo } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";

const prisma = new PrismaClient();

// ─── Mapeamentos ────────────────────────────────────────────────────────────

function mapEspecie(s: string): Especie {
  switch (s.trim()) {
    case "Canina":   return Especie.CACHORRO;
    case "Felina":   return Especie.GATO;
    case "Cunícula": return Especie.ROEDOR;
    case "Aviária":  return Especie.PASSARO;
    case "Réptil":   return Especie.REPTIL;
    default:         return Especie.OUTRO;
  }
}

function mapSexo(s: string): Sexo {
  return s.trim() === "Fêmea" ? Sexo.FEMEA : Sexo.MACHO;
}

function parseCpf(s: string): string | null {
  if (!s || s.toLowerCase().includes("não") || s.trim() === "") return null;
  return s.trim();
}

function parseDate(s: string): Date | null {
  if (!s || s.trim() === "") return null;
  const [d, m, y] = s.split("/");
  if (!d || !m || !y) return null;
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(dt.getTime()) ? null : dt;
}

function limparTelefone(s: string): string {
  return s?.trim().replace(/[^\d\s()\-+]/g, "") || "";
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = "/Users/jabsrs/Downloads/base_completa_clientes_animais.csv";

  if (!fs.existsSync(csvPath)) {
    console.error("Arquivo não encontrado:", csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");

  const rows: Record<string, string>[] = parse(content, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  });

  console.log(`\n📋 Linhas no CSV: ${rows.length}\n`);

  // ── Passo 1: agrupar por código de cliente ────────────────────────────────
  const clienteMap = new Map<string, Record<string, string>>();
  const animalRows: Record<string, string>[] = [];

  for (const row of rows) {
    const svClientId = row["Cliente - Código"];
    const svAnimalId = row["Animal - Código"];

    if (!clienteMap.has(svClientId)) {
      clienteMap.set(svClientId, row);
    }
    if (svAnimalId) {
      animalRows.push(row);
    }
  }

  // Deduplicar animais por código SimplesVet
  const animaisPorCodigo = new Map<string, Record<string, string>>();
  for (const row of animalRows) {
    const cod = row["Animal - Código"];
    if (!animaisPorCodigo.has(cod)) animaisPorCodigo.set(cod, row);
  }

  console.log(`👤 Clientes únicos: ${clienteMap.size}`);
  console.log(`🐾 Animais únicos:  ${animaisPorCodigo.size}\n`);

  // ── Passo 2: importar tutores ─────────────────────────────────────────────
  let tutoresCriados  = 0;
  let tutoresExistentes = 0;
  let tutoresErro     = 0;
  const svParaMedVets = new Map<string, string>(); // svClientId → tutorId

  const clientes = [...clienteMap.entries()];

  for (const [svId, row] of clientes) {
    const cpf     = parseCpf(row["Cliente - CPF"]);
    const nome    = row["Cliente - Nome"]?.trim() || "Sem nome";
    const email   = row["Cliente - Email"]?.trim() || null;
    const telefone = limparTelefone(row["Cliente - Telefones"]) || limparTelefone(row["Celular"]) || "";
    const celular  = limparTelefone(row["Celular"]) || null;
    const cep      = row["Cliente - CEP"]?.trim() || null;
    const bairro   = row["Cliente - Bairro"]?.trim() || null;
    const cidade   = row["Cliente - Cidade"]?.trim() || null;
    const estado   = row["Cliente - UF"]?.trim() || null;
    const logradouro = row["Cliente - Endereço"]?.trim() || null;

    try {
      // Tentar encontrar pelo CPF primeiro, depois pelo código externo no obs
      let tutor = cpf
        ? await prisma.tutor.findUnique({ where: { cpf } })
        : null;

      if (!tutor) {
        // Verificar se já foi importado antes (obs contém o código SV)
        tutor = await prisma.tutor.findFirst({
          where: { obs: { contains: `[SV:${svId}]` } },
        });
      }

      if (tutor) {
        svParaMedVets.set(svId, tutor.id);
        tutoresExistentes++;
      } else {
        const novo = await prisma.tutor.create({
          data: {
            nome,
            cpf: cpf ?? undefined,
            email: email ?? undefined,
            telefone,
            celular: celular ?? undefined,
            cep: cep ?? undefined,
            logradouro: logradouro ?? undefined,
            bairro: bairro ?? undefined,
            cidade: cidade ?? undefined,
            estado: estado ?? undefined,
            obs: `[SV:${svId}]`,
          },
        });
        svParaMedVets.set(svId, novo.id);
        tutoresCriados++;
      }
    } catch (e) {
      console.error(`  ❌ Tutor "${nome}" (SV:${svId}):`, (e as Error).message);
      tutoresErro++;
    }

    if ((tutoresCriados + tutoresExistentes) % 200 === 0) {
      process.stdout.write(`  Tutores: ${tutoresCriados + tutoresExistentes}/${clientes.length}\r`);
    }
  }

  console.log(`\n✅ Tutores — criados: ${tutoresCriados} | já existiam: ${tutoresExistentes} | erros: ${tutoresErro}\n`);

  // ── Passo 3: importar animais ─────────────────────────────────────────────
  let animaisCriados   = 0;
  let animaisExistentes = 0;
  let animaisErro      = 0;

  const animaisLista = [...animaisPorCodigo.entries()];

  for (const [svAnimalId, row] of animaisLista) {
    const svClientId = row["Cliente - Código"];
    const tutorId    = svParaMedVets.get(svClientId);

    if (!tutorId) {
      animaisErro++;
      continue;
    }

    const nome       = row["Animal - Nome"]?.trim() || "Sem nome";
    const especie    = mapEspecie(row["Animal - Espécie"] || "");
    const sexo       = mapSexo(row["Animal - Sexo"] || "");
    const raca       = row["Animal - Raça"]?.trim() || null;
    const pelagem    = row["Animal - Pelagem"]?.trim() || null;
    const dataNasc   = parseDate(row["Animal - Nascimento"]);
    const microchip  = row["Animal - Microchip"]?.trim() || null;
    const castrado   = row["Animal - Esterilização"]?.trim() === "Castrado";
    const vivoMorto  = row["Animal - Vivo/Morto"]?.trim();
    const status     = row["Animal - Status"]?.trim();
    const ativo      = status === "Ativo" && vivoMorto !== "Óbito";
    const obsAnimal  = vivoMorto === "Óbito" ? `[SV:${svAnimalId}] Óbito registrado no SimplesVet` : `[SV:${svAnimalId}]`;

    try {
      // Verificar se já foi importado (obs contém código SV)
      const existing = await prisma.animal.findFirst({
        where: { obs: { contains: `[SV:${svAnimalId}]` } },
      });

      if (existing) {
        animaisExistentes++;
      } else {
        await prisma.animal.create({
          data: {
            tutorId,
            nome,
            especie,
            sexo,
            raca:      raca ?? undefined,
            pelagem:   pelagem ?? undefined,
            cor:       pelagem ?? undefined,
            dataNasc:  dataNasc ?? undefined,
            microchip: microchip ?? undefined,
            castrado,
            ativo,
            obs: obsAnimal,
          },
        });
        animaisCriados++;
      }
    } catch (e) {
      console.error(`  ❌ Animal "${nome}" (SV:${svAnimalId}):`, (e as Error).message);
      animaisErro++;
    }

    if ((animaisCriados + animaisExistentes) % 200 === 0) {
      process.stdout.write(`  Animais: ${animaisCriados + animaisExistentes}/${animaisLista.length}\r`);
    }
  }

  console.log(`✅ Animais — criados: ${animaisCriados} | já existiam: ${animaisExistentes} | erros: ${animaisErro}\n`);
  console.log("🎉 Importação concluída!\n");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
