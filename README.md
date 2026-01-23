# PayFlow – Dev Setup

Monorepo com `npm workspaces`:

- `apps/web` – Next.js (App Router)
- `apps/api` – NestJS + Prisma
- `packages/shared` – Tipos, validações e chaves de i18n

## Como rodar em desenvolvimento

1. Instale as dependências:

```bash
npm install
```

2. Configure o banco (PostgreSQL) e a variável `DATABASE_URL` em `.env.local` (ou use o valor de exemplo em `.env.example`).
3. Rode as migrations e o seed:

```bash
npm run db:migrate
npm run db:seed
```

4. Suba web + api em paralelo:

```bash
npm run dev
```

## Credenciais de desenvolvimento (seed)

O seed da API (`apps/api/prisma/seed.ts`) é idempotente e cria:

- Tenants
  - `vidal` (`school_code: VIDAL-0001`)
  - `alpha` (`school_code: ALPHA-0001`)
- Usuários
  - Platform admin
    - Email: `platform.admin@payflow.com`
    - Tipo: `PLATFORM`
    - Papel: `PLATFORM_ADMIN` em todos os tenants
  - School admins
    - Vidal admin
      - Email: `admin@vidal.com`
      - Tipo: `STAFF`
      - Papel: `SCHOOL_ADMIN` no tenant `vidal`
    - Alpha admin
      - Email: `admin@alpha.com`
      - Tipo: `STAFF`
      - Papel: `SCHOOL_ADMIN` no tenant `alpha`

Senha padrão de todos os usuários criados pelo seed:

- `Admin@12345`

Você pode sobrescrever a senha padrão definindo a variável de ambiente antes de rodar o seed:

```bash
SEED_DEFAULT_PASSWORD="MinhaSenha@Forte" npm run db:seed
```

## 🐳 Docker

Para rodar o projeto utilizando Docker:

1. Certifique-se de ter o Docker e Docker Compose instalados.
2. Na raiz do projeto, execute:

```bash
docker-compose up --build
```

Isso iniciará:
- **Banco de dados (PostgreSQL)** na porta `5432`
- **API (Back-end)** em `http://localhost:3333`
- **Web (Front-end)** em `http://localhost:3000`

> **Nota:** As variáveis de ambiente no `docker-compose.yml` estão configuradas para desenvolvimento local. Para produção, lembre-se de usar um arquivo .env seguro.

## Scripts úteis

- `npm run lint` – Lint em web e api.
- `npm run format` – `prettier -w .` em todo o repo.
- `npm run db:migrate` – `prisma migrate dev` na API.
- `npm run db:seed` – Executa o seed Prisma na API.
- `npm run db:studio` – Abre o Prisma Studio.
