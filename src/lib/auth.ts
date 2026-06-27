import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { audit } from "./audit";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const SESSION_HOURS = 8;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_HOURS * 60 * 60,
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.active) return null;

        // Verifica bloqueio por tentativas excessivas
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutosRestantes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Conta bloqueada. Tente novamente em ${minutosRestantes} minuto(s).`);
        }

        const valid = await bcrypt.compare(credentials.password, user.password);

        if (!valid) {
          const novasAttempts = user.loginAttempts + 1;
          const bloqueado = novasAttempts >= MAX_ATTEMPTS;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: novasAttempts,
              lockedUntil: bloqueado
                ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                : null,
            },
          });

          if (bloqueado) {
            void audit({
              userId: user.id, userName: user.name,
              acao: "BLOQUEIO", entidade: "User", entidadeId: user.id,
              descricao: `Conta bloqueada por ${LOCK_MINUTES} min após ${MAX_ATTEMPTS} tentativas falhas`,
            });
            throw new Error(`Muitas tentativas. Conta bloqueada por ${LOCK_MINUTES} minutos.`);
          }

          void audit({
            userId: user.id, userName: user.name,
            acao: "LOGIN_FALHOU", entidade: "User", entidadeId: user.id,
            descricao: `Tentativa ${novasAttempts}/${MAX_ATTEMPTS} com senha incorreta`,
          });
          const restantes = MAX_ATTEMPTS - novasAttempts;
          throw new Error(`Senha incorreta. ${restantes} tentativa(s) restante(s) antes do bloqueio.`);
        }

        // Login bem-sucedido — reseta contadores
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: 0, lockedUntil: null },
        });

        void audit({
          userId: user.id, userName: user.name,
          acao: "LOGIN", entidade: "User", entidadeId: user.id,
          descricao: `Login bem-sucedido (${user.email})`,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
