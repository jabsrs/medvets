/**
 * Cria (ou atualiza) um usuário de teste descartável para verificação visual
 * no preview local, SEM expor credenciais reais.
 *
 * A senha é lida da variável de ambiente TESTE_SENHA — você a define,
 * ela nunca é escrita neste arquivo nem commitada.
 *
 * Uso:
 *   TESTE_SENHA="suaSenhaAqui" npx tsx prisma/criar-usuario-teste.ts
 *
 * Para remover depois:
 *   npx tsx prisma/criar-usuario-teste.ts --remover
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "teste@medvets.local";

async function main() {
  const remover = process.argv.includes("--remover");

  if (remover) {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    console.log(`🗑️  Usuário de teste ${EMAIL} removido.`);
    return;
  }

  const senha = process.env.TESTE_SENHA;
  if (!senha || senha.length < 6) {
    console.error("❌ Defina TESTE_SENHA (mín. 6 caracteres). Ex:");
    console.error('   TESTE_SENHA="minhaSenha123" npx tsx prisma/criar-usuario-teste.ts');
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, 12);

  await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password: hash, active: true, mustChangePassword: false, role: "ADMIN" },
    create: {
      name: "Usuário de Teste",
      email: EMAIL,
      password: hash,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  console.log(`✅ Usuário de teste pronto: ${EMAIL}`);
  console.log("   (senha = a que você definiu em TESTE_SENHA)");
  console.log("   Para remover depois: npx tsx prisma/criar-usuario-teste.ts --remover");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
