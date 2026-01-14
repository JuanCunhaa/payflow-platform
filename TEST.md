# PayFlow — Plano de Testes MVP‑1 (Public & Platform)

Este arquivo é para você validar, de forma rápida e rastreável, os 12 tickets de **MVP‑1 Public & Platform** que já implementamos (landing, login, multi‑tenant, leads, tenants, audit, etc.).  

- Use o campo **OK** marcando `[x]` quando o passo estiver aprovado.
- Preencha **Observações** com o que aconteceu (sucesso, erro, logs, prints, etc.).
- Se algum passo falhar, deixe o **OK** como `[ ]` e detalhe o problema em **Observações**.

---

## 0. Pré‑requisitos de ambiente

Antes de testar qualquer coisa, confirme que o ambiente está pronto.

> Referências: README, T04, T05, T06, T09

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 0.1 | Garantir que `DATABASE_URL` está correto em `.env.local` e `apps/api/.env` | Consegue conectar no Postgres (sem erro de auth/conexão) | [ ] | |
| 0.2 | Rodar `npm run db:migrate` no root | Todas as migrations aplicadas sem erro | [ ] | |
| 0.3 | Rodar `npm run db:seed` no root | Seed finaliza com mensagem de sucesso e mostra as credenciais (platform/vidal/alpha) | [ ] | |
| 0.4 | Rodar `npm run dev` no root | Sobe web (`:3000`) e API (`:3333`) sem erros fatais | [ ] | |
| 0.5 | Acessar `http://localhost:3333/health` | Resposta JSON `{ status: "ok", db: "ok", ... }` | [ ] | |

Credenciais de dev esperadas (a menos que você tenha alterado `SEED_DEFAULT_PASSWORD`):

- Platform admin: `platform.admin@payflow.com` / `Admin@12345`
- Vidal admin: `admin@vidal.com` / `Admin@12345`
- Alpha admin: `admin@alpha.com` / `Admin@12345`

---

## 1. Landing pública (/) e i18n

> Referências: T03, T16

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 1.1 | Abrir `http://localhost:3000` | Redireciona automaticamente para `/pt-BR` (landing em pt‑BR) | [ ] | |
| 1.2 | Ver conteúdo da landing em `/pt-BR` | Título, seções (problema, solução, prova, CTA final) e botões usam textos traduzidos (sem strings soltas) | [ ] | |
| 1.3 | Clicar em “Entrar” | Navega para `/pt-BR/login` | [ ] | |
| 1.4 | Voltar para landing e clicar em “Sou responsável” | Navega para `/pt-BR/register/guardian` (placeholder atual) | [ ] | |
| 1.5 | Voltar e clicar em “Quero na minha escola” | Navega para `/pt-BR/request-demo` | [ ] | |
| 1.6 | Na landing, clicar no link de idioma para `en-US` | Vai para `/en-US`, mesma estrutura de página, textos em inglês | [ ] | |

---

## 2. Login e sessão (PLATFORM / STAFF)

> Referências: T11, T12, T14, T17

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 2.1 | Acessar `/pt-BR/login` em `http://localhost:3000/pt-BR/login` | Página de login renderizada via i18n, com campos email/senha e validações de required | [ ] | |
| 2.2 | Tentar enviar form com email inválido (`foo`) | Browser/lógica de form impede envio ou mostra erro de email inválido | [ ] | |
| 2.3 | Tentar login com credenciais erradas (email qualquer + senha qualquer) | Não loga, mostra mensagem amigável de erro (genérica, sem dizer se email existe) | [ ] | |
| 2.4 | Login como **Platform admin** na root host (`localhost:3000`) com `platform.admin@payflow.com` / senha seed | Login sucesso, redirect para `/pt-BR/p` (dashboard plataforma) | [ ] | |
| 2.5 | Logout a partir do dashboard plataforma | Sessão limpa, redirect para landing `/pt-BR` | [ ] | |
| 2.6 | Login como **Vidal admin** na root host com `admin@vidal.com` / senha seed | Login sucesso, redirect para `/pt-BR/s` (dashboard staff) | [ ] | |
| 2.7 | Atualizar página `/pt-BR/s` | Sessão persiste (refresh usa `/auth/refresh` com cookie httpOnly) | [ ] | |

Opcional (se quiser testar GUARDIAN assim que existir fluxo de registro):

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 2.O1 | Login como GUARDIAN ativo | Redirect para `/pt-BR/g` | [ ] | |
| 2.O2 | Login como GUARDIAN com status diferente de ACTIVE | Redirect para `/pt-BR/pending-approval` | [ ] | |

---

## 3. Multi‑tenant por host (web + API)

> Referências: T07, T08

Pré‑condição: `vidal.localtest.me` e `alpha.localtest.me` apontando para `127.0.0.1` (normal para `localtest.me`).

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 3.1 | Abrir `http://vidal.localtest.me:3000/pt-BR` | Landing abre normalmente, sem erro de tenant | [ ] | |
| 3.2 | Em `vidal.localtest.me`, tentar acessar `/pt-BR/s` após login como `admin@vidal.com` | Dashboard STAFF abre com tenant “Vidal” no cabeçalho | [ ] | |
| 3.3 | Em `alpha.localtest.me`, tentar acessar `/pt-BR/s` após login como `admin@alpha.com` | Dashboard STAFF abre com tenant “Alpha” | [ ] | |
| 3.4 | Acessar `http://inexistente.localtest.me:3000/pt-BR/s` | Redireciona para `/pt-BR/tenant-not-found` (UX amigável) | [ ] | |
| 3.5 | No backend, chamar `GET /tenant/ping` com host `vidal.localtest.me:3333` | Resposta `{ ok: true, tenant: { id, slug: "vidal" } }` | [ ] | |
| 3.6 | `GET /tenant/ping` com host inválido | 404 com `code: tenant_not_found` na estrutura padronizada de erro | [ ] | |

---

## 4. Rate limiting básico (login)

> Referências: T10 (MVP)

Não precisa ser super exato, só validar que o limitador dispara.

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 4.1 | Fazer várias tentativas de login inválidas seguidas (mesmo IP) | Em algum momento a API retorna `429` com `code: rate_limit_exceeded` | [ ] | |
| 4.2 | Verificar logs da API | Log com mensagem de rate limit acionado, sem expor senha/payload sensível | [ ] | |

---

## 5. Request Demo + Leads públicos

> Referências: T18 (POST `/public/leads` + /request-demo)

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 5.1 | Acessar `/pt-BR/request-demo` na root host | Página renderizada com form (nome responsável, escola, email, telefone), textos via i18n | [ ] | |
| 5.2 | Tentar enviar com campos vazios ou telefone muito curto | Form mostra erro amigável de validação (`requestDemo.error.validation`) | [ ] | |
| 5.3 | Preencher dados válidos e enviar | Mostra mensagem de sucesso (`requestDemo.success.*`), limpa campos | [ ] | |
| 5.4 | Ver no banco (tabela `leads`) | Novo registro com `status = NEW`, dados preenchidos corretamente | [ ] | |
| 5.5 | Forçar erro (ex.: desligar API e tentar enviar novamente) | Front mostra mensagem de erro de conexão (`requestDemo.error.connection`) | [ ] | |

---

## 6. Host admin + layout /p

> Referências: T19 (admin.* + /p layout + guard FRONT)

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 6.1 | Em `http://admin.localtest.me:3000/pt-BR/p` sem estar logado | Redirect para `/pt-BR/login` (guard front) | [ ] | |
| 6.2 | Logar como **Platform admin** em `admin.localtest.me` | Redirect para `/pt-BR/p`, layout com sidebar “PayFlow Admin” | [ ] | |
| 6.3 | Sidebar mostra links `/p`, `/p/tenants`, `/p/leads`, `/p/audit` | Navegação entre seções funciona | [ ] | |
| 6.4 | Tentar acessar `/pt-BR/p` em um host tenant (`vidal.localtest.me`) | Middleware redireciona para `/pt-BR` (não expõe /p para tenant host) | [ ] | |

---

## 7. Gestão de leads na plataforma (/p/leads)

> Referências: T20

Pré‑condição: ter pelo menos 1 lead criado via `/request-demo` (ver seção 5).

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 7.1 | Em `admin.localtest.me`, logado como Platform, acessar `/pt-BR/p/leads` | Tabela de leads carregada (ou mensagem de vazio se não houver leads) | [ ] | |
| 7.2 | Verificar colunas (escola, responsável, email, telefone, status, criado em) | Dados dos leads batem com o que foi enviado pelo form | [ ] | |
| 7.3 | Usar filtro de status (NEW/CONTACTED/CONVERTED) | Lista se atualiza respeitando filtro | [ ] | |
| 7.4 | Clicar em “Marcar como contactado” em um lead NEW | Status muda para CONTACTED na tabela, sem erro | [ ] | |
| 7.5 | Clicar em “Criar tenant (DRAFT)” em um lead NEW/CONTACTED | Lead vira CONVERTED; novo tenant DRAFT criado (ver próximo teste) | [ ] | |
| 7.6 | Checar no banco (`tenants`) | Tenant novo com `name = school_name`, `status = DRAFT`, `slug` e `school_code` únicos gerados | [ ] | |
| 7.7 | Ver logs de auditoria (via `/p/audit`, ação `platform.lead.convert_to_tenant`) | Evento registrado com metadados `leadId`, `leadEmail`, `leadSchoolName` | [ ] | |

---

## 8. Gestão de tenants na plataforma (/p/tenants)

> Referências: T21

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 8.1 | Em `admin.localtest.me`, acessar `/pt-BR/p/tenants` | Tabela com tenants seeds (`vidal`, `alpha`) + tenants criados por leads | [ ] | |
| 8.2 | Conferir colunas (Nome, Slug, School Code, Status, Criado em, Ações) | Dados batem com o banco (inclusive DRAFT/ACTIVE/SUSPENDED) | [ ] | |
| 8.3 | Usar filtro de status (ALL/DRAFT/ACTIVE/SUSPENDED) | Lista responde corretamente aos filtros | [ ] | |
| 8.4 | Clicar em “Nova escola” e criar tenant manual | Tenant criado com school_code manual ou gerado automaticamente se vazio | [ ] | |
| 8.5 | Após criação, verificar no banco: novo tenant + user admin STAFF + membership SCHOOL_ADMIN | Tenant, usuário e membership existem e estão corretos | [ ] | |
| 8.6 | Ver se a resposta da API trouxe `adminInitialPassword` quando você NÃO informou senha | UI mostra senha gerada; dá para usá‑la para logar como school admin | [ ] | |
| 8.7 | Editar tenant (nome/slug/school_code) e salvar | Dados atualizados, unicidade de slug/school_code respeitada | [ ] | |
| 8.8 | Usar ações de ativar/suspender em um tenant | Status muda para ACTIVE/SUSPENDED conforme ação, sem erro | [ ] | |
| 8.9 | Ver logs em `/p/audit` filtrando por action `platform.tenant.*` | Eventos `tenant.create`, `tenant.update`, `tenant.activate/suspend` presentes com metadata | [ ] | |

---

## 9. Audit UI (/p/audit)

> Referências: T15, T22

| Step | Ação | Esperado | OK | Observações |
| --- | --- | --- | --- | --- |
| 9.1 | Em `admin.localtest.me`, acessar `/pt-BR/p/audit` | Tabela paginada de eventos de audit e filtros no topo | [ ] | |
| 9.2 | Sem filtros, verificar se aparecem eventos de login/logout, leads convertidos, tenants criados, etc. | Linhas com data/hora, tenant, actor, action, target, IP | [ ] | |
| 9.3 | Usar filtro por tenant (selecionar Vidal, por ex.) | Lista mostra apenas eventos daquele tenant | [ ] | |
| 9.4 | Filtro por ação (`auth.login`) | Lista mostra somente eventos de login | [ ] | |
| 9.5 | Filtro por email do ator (`platform.admin@payflow.com`) | Mostra apenas eventos feitos pelo platform admin | [ ] | |
| 9.6 | Filtro por range de datas (from/to) | Restringe corretamente o período retornado | [ ] | |
| 9.7 | Clicar em “Ver detalhes” em uma linha | Abre modal com JSON formatado da metadata (campos sensíveis redigidos) | [ ] | |
| 9.8 | Fechar modal via botão “Fechar” ou clicando fora | Modal some e página continua utilizável | [ ] | |

---

## 10. Resumo final

Use esta seção para consolidar o status geral do MVP‑1 Public & Platform.

- [ ] Todos os cenários acima passaram sem falhas relevantes
- [ ] Existem falhas que precisam ser corrigidas antes de avançar

**Observações gerais / bugs encontrados / dúvidas:**  
- ...  
- ...  
- ...  

