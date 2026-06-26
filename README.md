# 🐾 MedVets — Sistema de Gestão Veterinária

Plataforma web completa para gestão de clínicas veterinárias.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **Lucide React** (ícones)
- **Prisma 5** + **PostgreSQL**
- **NextAuth.js** (autenticação JWT)
- **FullCalendar** (agenda)
- **Sonner** (toasts)

## Módulos

| Módulo | Rota | Status |
|--------|------|--------|
| Dashboard | `/dashboard` | ✅ |
| Tutores | `/tutores` | ✅ |
| Animais | `/animais` | ✅ |
| Prontuário | `/prontuario` | ✅ |
| Agenda | `/agenda` | ✅ |
| Vacinas | `/vacinas` | ✅ |
| Internação | `/internacao` | ✅ |
| Estoque | `/estoque` | ✅ |
| Vendas / PDV | `/vendas` | ✅ |
| Financeiro | `/financeiro` | ✅ |
| Configurações | `/configuracoes` | ✅ |

## Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados

Edite `.env` com sua conexão PostgreSQL:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/medvets?schema=public"
NEXTAUTH_SECRET="troque-por-uma-chave-secreta"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Criar banco e aplicar schema
```bash
npm run db:push
```

### 4. Popular com dados de demonstração
```bash
npm run db:seed
```

### 5. Iniciar o servidor
```bash
npm run dev
```

Acesse: http://localhost:3000

## Credenciais de demo

| Usuário | Email | Senha | Perfil |
|---------|-------|-------|--------|
| Admin | admin@medvets.com | admin123 | Admin |
| Dra. Ana Souza | dra.ana@medvets.com | vet123 | Veterinária |
| Dr. Carlos Lima | dr.carlos@medvets.com | vet123 | Veterinário |

## Scripts disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:push      # Aplica o schema no banco
npm run db:seed      # Popula com dados de demo
npm run db:studio    # Abre o Prisma Studio
```
