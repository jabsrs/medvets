import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // Usuários
  const adminPwd = await bcrypt.hash("admin123", 12);
  const vetPwd = await bcrypt.hash("vet123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@medvets.com" },
    update: {},
    create: { name: "Admin MedVets", email: "admin@medvets.com", password: adminPwd, role: "ADMIN" },
  });

  const vet1 = await prisma.user.upsert({
    where: { email: "dra.ana@medvets.com" },
    update: {},
    create: {
      name: "Dra. Ana Souza",
      email: "dra.ana@medvets.com",
      password: vetPwd,
      role: "VETERINARIO",
      crmv: "CRMV-SP 12345",
      specialty: "Clínica Geral",
    },
  });

  const vet2 = await prisma.user.upsert({
    where: { email: "dr.carlos@medvets.com" },
    update: {},
    create: {
      name: "Dr. Carlos Lima",
      email: "dr.carlos@medvets.com",
      password: vetPwd,
      role: "VETERINARIO",
      crmv: "CRMV-SP 67890",
      specialty: "Dermatologia",
    },
  });

  // Clínica
  await prisma.clinica.upsert({
    where: { id: "clinica-1" },
    update: {},
    create: {
      id: "clinica-1",
      nome: "Clínica MedVets",
      telefone: "(11) 3456-7890",
      email: "contato@medvets.com",
      cidade: "São Paulo",
      estado: "SP",
    },
  });

  // Tipos de atendimento
  const tipos = [
    { nome: "Consulta Clínica", cor: "#3B82F6", duracaoMin: 30 },
    { nome: "Retorno", cor: "#10B981", duracaoMin: 20 },
    { nome: "Vacinação", cor: "#F59E0B", duracaoMin: 15 },
    { nome: "Cirurgia", cor: "#EF4444", duracaoMin: 120 },
    { nome: "Banho e Tosa", cor: "#8B5CF6", duracaoMin: 90 },
    { nome: "Emergência", cor: "#DC2626", duracaoMin: 60 },
  ];

  for (const t of tipos) {
    await prisma.tipoAtendimento.create({ data: t }).catch(() => {});
  }

  // Categorias
  const catMed = await prisma.categoria.create({ data: { nome: "Medicamentos", tipo: "PRODUTO" } });
  const catAlim = await prisma.categoria.create({ data: { nome: "Alimentos", tipo: "PRODUTO" } });
  const catConsult = await prisma.categoria.create({ data: { nome: "Consultas", tipo: "SERVICO" } });

  // Produtos
  await prisma.produto.createMany({
    data: [
      { nome: "Amoxicilina 250mg", tipo: "MEDICAMENTO", preco: 35.90, custo: 12.00, estoque: 50, estoqueMin: 10, unidade: "cx", categoriaId: catMed.id },
      { nome: "Drontal Plus", tipo: "MEDICAMENTO", preco: 28.50, custo: 9.00, estoque: 3, estoqueMin: 5, unidade: "un", categoriaId: catMed.id },
      { nome: "Ração Premium Cão Adulto", tipo: "PRODUTO", preco: 89.90, custo: 55.00, estoque: 20, estoqueMin: 5, unidade: "kg", categoriaId: catAlim.id },
      { nome: "Ração Premium Gato", tipo: "PRODUTO", preco: 79.90, custo: 48.00, estoque: 15, estoqueMin: 5, unidade: "kg", categoriaId: catAlim.id },
      { nome: "Consulta Clínica", tipo: "SERVICO", preco: 150.00, estoque: 999, estoqueMin: 0, unidade: "un", categoriaId: catConsult.id },
      { nome: "Banho Pequeno Porte", tipo: "SERVICO", preco: 60.00, estoque: 999, estoqueMin: 0, unidade: "un", categoriaId: catConsult.id },
    ],
  });

  // Vacinas
  await prisma.vacina.createMany({
    data: [
      { nome: "V10 (Polivalente Canina)", intervaloDias: 365 },
      { nome: "Antirrábica", intervaloDias: 365 },
      { nome: "Giardia", intervaloDias: 180 },
      { nome: "Gripe Canina", intervaloDias: 365 },
      { nome: "V4 (Felina)", intervaloDias: 365 },
      { nome: "FeLV (Leucemia Felina)", intervaloDias: 365 },
    ],
  });

  // Tutores e animais
  const tutores = [
    {
      nome: "Maria Silva",
      telefone: "(11) 98765-4321",
      email: "maria@email.com",
      cpf: "123.456.789-01",
      cidade: "São Paulo",
      estado: "SP",
      animais: [
        { nome: "Bolinha", especie: "CACHORRO" as const, raca: "Golden Retriever", sexo: "MACHO" as const, dataNasc: new Date("2021-03-15"), peso: 28.5, castrado: true },
        { nome: "Fifi", especie: "GATO" as const, raca: "Persa", sexo: "FEMEA" as const, dataNasc: new Date("2022-07-20"), peso: 3.2, castrado: true },
      ],
    },
    {
      nome: "João Santos",
      telefone: "(11) 91234-5678",
      email: "joao@email.com",
      cpf: "987.654.321-09",
      cidade: "São Paulo",
      estado: "SP",
      animais: [
        { nome: "Rex", especie: "CACHORRO" as const, raca: "Pastor Alemão", sexo: "MACHO" as const, dataNasc: new Date("2020-11-05"), peso: 35.0, castrado: false },
      ],
    },
    {
      nome: "Ana Paula Rodrigues",
      telefone: "(11) 94567-8901",
      email: "anapaula@email.com",
      cidade: "São Paulo",
      estado: "SP",
      animais: [
        { nome: "Luna", especie: "GATO" as const, raca: "Siamês", sexo: "FEMEA" as const, dataNasc: new Date("2023-01-10"), peso: 3.8, castrado: false },
        { nome: "Thor", especie: "CACHORRO" as const, raca: "Bulldog Francês", sexo: "MACHO" as const, dataNasc: new Date("2022-05-22"), peso: 12.0, castrado: true },
      ],
    },
    {
      nome: "Pedro Costa",
      telefone: "(11) 97654-3210",
      cidade: "São Paulo",
      estado: "SP",
      animais: [
        { nome: "Mel", especie: "CACHORRO" as const, raca: "Shih Tzu", sexo: "FEMEA" as const, dataNasc: new Date("2021-08-30"), peso: 5.5, castrado: true },
      ],
    },
    {
      nome: "Carla Mendes",
      telefone: "(11) 92345-6789",
      email: "carla@email.com",
      cidade: "São Paulo",
      estado: "SP",
      animais: [
        { nome: "Pipoca", especie: "ROEDOR" as const, raca: "Hamster", sexo: "FEMEA" as const, peso: 0.15 },
        { nome: "Romeu", especie: "CACHORRO" as const, raca: "Labrador", sexo: "MACHO" as const, dataNasc: new Date("2019-12-01"), peso: 32.0, castrado: false },
      ],
    },
  ];

  const tutoresCriados = [];
  for (const t of tutores) {
    const { animais, ...tutorData } = t;
    const tutor = await prisma.tutor.create({ data: tutorData });
    const animaisCriados = [];
    for (const a of animais) {
      const animal = await prisma.animal.create({ data: { ...a, tutorId: tutor.id } });
      animaisCriados.push(animal);
    }
    tutoresCriados.push({ tutor, animais: animaisCriados });
  }

  // Agendamentos de hoje
  const tiposDb = await prisma.tipoAtendimento.findMany();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const agendHoje = [
    { h: 9, m: 0, status: "CONCLUIDO" },
    { h: 10, m: 0, status: "CONCLUIDO" },
    { h: 11, m: 0, status: "EM_ATENDIMENTO" },
    { h: 14, m: 0, status: "CONFIRMADO" },
    { h: 15, m: 30, status: "AGENDADO" },
    { h: 16, m: 0, status: "AGENDADO" },
  ];

  for (let i = 0; i < agendHoje.length; i++) {
    const ag = agendHoje[i];
    const inicio = new Date(hoje);
    inicio.setHours(ag.h, ag.m, 0, 0);
    const fim = new Date(inicio);
    fim.setMinutes(fim.getMinutes() + 30);

    const tutorIdx = i % tutoresCriados.length;
    const animalIdx = 0;
    const animal = tutoresCriados[tutorIdx].animais[animalIdx];

    await prisma.agendamento.create({
      data: {
        animalId: animal.id,
        medicoId: i % 2 === 0 ? vet1.id : vet2.id,
        tipoId: tiposDb[i % tiposDb.length].id,
        inicio,
        fim,
        status: ag.status as "AGENDADO" | "CONFIRMADO" | "EM_ATENDIMENTO" | "CONCLUIDO" | "CANCELADO" | "FALTOU",
        confirmado: ag.status !== "AGENDADO",
      },
    });
  }

  // Lançamentos financeiros
  await prisma.lancamento.createMany({
    data: [
      { tipo: "RECEITA", descricao: "Consultas - Janeiro", valor: 4500, vencimento: new Date(), pagamento: new Date(), status: "PAGO", categoria: "Consultas" },
      { tipo: "RECEITA", descricao: "Vendas de produtos", valor: 2300, vencimento: new Date(), pagamento: new Date(), status: "PAGO", categoria: "Produtos" },
      { tipo: "DESPESA", descricao: "Aluguel clínica", valor: 3500, vencimento: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: "PENDENTE", categoria: "Fixo" },
      { tipo: "DESPESA", descricao: "Fornecedor medicamentos", valor: 1200, vencimento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), status: "PENDENTE", categoria: "Compras" },
      { tipo: "DESPESA", descricao: "Salários", valor: 8000, vencimento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), status: "PENDENTE", categoria: "RH" },
    ],
  });

  console.log("✅ Seed concluído!");
  console.log("👤 Login: admin@medvets.com / admin123");
  console.log("🐾 " + (await prisma.animal.count()) + " animais criados");
  console.log("📅 " + (await prisma.agendamento.count()) + " agendamentos criados");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
