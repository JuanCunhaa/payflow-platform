# 🚀 Cobra Nex Platform

**Uma plataforma Full Stack de Gestão Financeira Escolar/Empresarial (SaaS Multi-tenant)**

O **Cobra Nex** é uma plataforma SaaS multi-tenant robusta, projetada para modernizar e simplificar o fluxo de trabalho de empresas de serviço recorrente. Conectamos administradores e clientes em um ecossistema fluido, seguro e eficiente.

---

## 💡 O que é o Cobra Nex?

O Cobra Nex resolve a complexidade da gestão financeira centralizando cobranças e comunicação em um só lugar. Nossa missão é automatizar a burocracia para que as empresas possam focar no que realmente importa: **crescer**.

Com uma arquitetura escalável e focada na experiência do usuário, o Cobra Nex transforma processos manuais e lentos em fluxos digitais ágeis.

---

## ✨ Principais Funcionalidades

*   **🏢 Multi-tenancy Nativo:** Uma única plataforma servindo múltiplas empresas com isolamento total de dados e customização por unidade (Whitelabel ready).
*   **💰 Gestão Financeira Completa:** Geração automática de faturas, gestão de contratos, links de pagamentos integrados e controle de inadimplência.
*   **👥 Portal do Cliente:** Acesso fácil para clientes acompanharem faturas, notas e abrirem chamados de suporte.
*   **📈 Gestão de Clientes:** Controle de assinaturas, planos e cadastro de clientes.
*   **🎫 Sistema de Suporte (Helpdesk):** Módulo de tickets integrado para centralizar a comunicação entre empresa e cliente.
*   **🔐 Segurança e Controle:** Controle de acesso baseado em cargos (RBAC) granular (Admin, Financeiro, Operacional, etc.).

---

## 🛠️ Stack Tecnológica

Construído com o que há de mais moderno no ecossistema JavaScript/TypeScript, garantindo performance, tipagem segura e manutenibilidade:

*   **Monorepo:** Gerenciado com **Turborepo** para máxima eficiência de build.
*   **Frontend:** **Next.js** (App Router) + **Tailwind CSS** + **Shadcn/ui** para interfaces rápidas e elegantes.
*   **Backend:** **NestJS** para uma API robusta, modular e escalável.
*   **Banco de Dados:** **PostgreSQL** com **Prisma ORM** para integridade e agilidade.
*   **DevOps:** Containerização com **Docker** e pipelines de CI/CD configurados.

---

## 🚀 Deploy (Produção)

Este projeto está configurado para rodar em **Vercel** (Frontend) e **Render** (Backend) sob o domínio **cobranex.xyz**.

### Variáveis de Ambiente Necessárias

#### Frontend (Vercel)
*   `NEXT_PUBLIC_API_URL`: URL da API (Backend). Ex: `https://payflow-platform.onrender.com`

#### Backend (Render)
*   `DATABASE_URL`: String de conexão do PostgreSQL.
*   `JWT_SECRET`: Segredo para assinar tokens.
*   `FRONTEND_URL`: URL do Frontend para CORS. Ex: `https://cobranex.xyz`
*   `APP_PUBLIC_URL`: URL pública para links de e-mail. Ex: `https://cobranex.xyz`

