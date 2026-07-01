# CLAUDE.md

Orientações para agentes de IA (Claude Code, Cursor, Copilot, …) neste repositório.

---

## Visão geral do projeto

**Skill Talent** é um sistema de avaliação de desempenho de colaboradores da Ada Tech. Monorepo com backend **FastAPI + MySQL** e frontend **React + Vite**.

### Domínio principal

| Módulo | Descrição |
|--------|-----------|
| **Colaboradores** | Cadastro, hierarquia (gestor/liderados), níveis de carreira, permissões de admin |
| **Ciclos** | Ciclos de avaliação com etapas (escolha de pares, autoavaliação, avaliação de pares, feedback, etc.) |
| **Avaliações** | Autoavaliação, avaliação entre pares (2 pares obrigatórios), avaliação do gestor |
| **Entregas Outstanding** | Registro e aprovação de entregas excepcionais |
| **Registros de Valor** | Documentação de ações que agregam valor, com fluxo de aprovação |
| **Calibração / Acompanhamento** | Painel admin para acompanhar progresso e calibrar notas |
| **Feedback / Liberação** | Liberação de feedback ao colaborador |

### Níveis de carreira válidos

`E`, `J1`–`J3`, `P1`–`P3`, `S1`–`S3`, `ES1`, `ES2`, `Head`

Definidos em `backend/app/core/validators.py` e `frontend/src/constants/niveisCarreira.js`. Ao adicionar um nível, atualize ambos os lados e `backend/app/api/v1/niveis_carreira.py` (níveis esperados por eixo).

### Autenticação

- Login via **Google OAuth** (`@react-oauth/google` no frontend → `POST /api/v1/auth/google` no backend)
- JWT com expiração configurável (`JWT_EXPIRATION_HOURS`)
- Colaborador precisa existir previamente no banco; login não cria usuários automaticamente
- Rotas admin protegidas por `is_admin` (`AdminRoute` no frontend)

---

## Estrutura do repositório

```
skill-talent/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── api/v1/             # Routers REST (auth, colaboradores, ciclos, avaliações, …)
│   │   ├── core/               # config, security, validators, exceptions, health
│   │   ├── models/             # SQLAlchemy ORM
│   │   ├── schemas/            # Pydantic (request/response)
│   │   ├── services/           # Lógica de negócio
│   │   ├── repositories/       # Acesso a dados
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/                # Migrations
│   ├── scripts/                # Utilitários (run_migrations.py)
│   ├── init.sql                # Schema inicial (usado pelo Docker)
│   ├── env.example
│   └── requirements.txt
├── frontend/                   # SPA React
│   └── src/
│       ├── pages/              # Telas (Dashboard, Login, ciclo-avaliacao, admin, …)
│       ├── components/         # PrivateRoute, AdminRoute, Avatar, Toast, …
│       ├── contexts/           # ToastContext
│       ├── hooks/              # useAuth, useApi
│       ├── services/           # api.jsx — client HTTP centralizado
│       ├── constants/          # niveisCarreira.js, …
│       └── utils/              # errorHandler, storage
├── docker-compose.yml          # MySQL + backend + frontend
├── run.py                      # Atalho para subir o backend localmente
└── .claude/                    # Skills e config MCP do Claude Code
```

### Padrão de camadas (backend)

```
Router (api/v1/) → Service (services/) → Repository (repositories/) → Model (models/)
```

- **Schemas Pydantic** validam entrada/saída; validadores reutilizáveis em `core/validators.py`
- **Exceções** customizadas em `core/exceptions.py`, tratadas globalmente em `main.py`
- Soft delete de colaboradores via `is_active: false` (não DELETE físico)

### Frontend

- Rotas em `App.jsx`; páginas protegidas com `PrivateRoute` / `AdminRoute`
- Chamadas HTTP centralizadas em `services/api.jsx` (`VITE_API_URL` aponta para `/api/v1`)
- Área admin modularizada em `pages/admin/` — ver `frontend/src/pages/admin/README.md`
- Ciclo de avaliação do colaborador: `pages/ciclo-avaliacao/`
- Ciclo de avaliação do gestor: `pages/ciclo-avaliacao-gestor/`

---

## Behavioral Guidelines

Guidelines to reduce common LLM coding mistakes.

**Tradeoff:** these bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Regras de trabalho (este repo)

- Mudanças de schema exigem migration Alembic — nunca altere o banco manualmente em produção.
- Ao adicionar endpoints, siga o padrão existente: router → service → repository → schema.
- Constantes compartilhadas entre backend e frontend (ex.: níveis de carreira) devem ser mantidas em sincronia nos dois lados.
- O projeto **não possui suite de testes automatizada** ainda (`pytest` está nas dependências, mas sem testes implementados). Valide manualmente via Swagger (`/docs`) ou fluxo no frontend.
- Documentação de migrations: `backend/MIGRATIONS.md`. Roadmap de melhorias: `backend/ROADMAP.md`.
- Não commite arquivos `.env` nem credenciais.

---

## Comandos

### Docker (recomendado para subir tudo)

```bash
docker compose up --build          # MySQL :3306, backend :8000, frontend :5173
docker compose up -d mysql         # só o banco
```

### Backend (local)

```bash
# Pré-requisitos: Python 3.11+, MySQL 8.0+
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp env.example .env                # editar credenciais do banco e Google OAuth

# Migrations
alembic upgrade head
# ou: python scripts/run_migrations.py upgrade

# Servidor (a partir da raiz do repo)
python run.py                      # http://localhost:8000
# ou, dentro de backend/:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Swagger: http://localhost:8000/docs
# Health:  http://localhost:8000/health/ready
```

### Frontend (local)

```bash
cd frontend
npm install
cp .env.example .env               # VITE_API_URL e VITE_GOOGLE_CLIENT_ID
npm run dev                        # http://localhost:5173
npm run build                      # build de produção
npm run preview                    # preview do build
```

### Migrations (referência rápida)

```bash
cd backend
alembic revision --autogenerate -m "descrição"   # nova migration
alembic upgrade head                              # aplicar
alembic downgrade -1                              # reverter uma
alembic history                                   # histórico
```

---

## Variáveis de ambiente

| Arquivo | Variáveis principais |
|---------|---------------------|
| `backend/.env` | `DATABASE_URL`, `DB_*`, `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CORS_ORIGINS`, `JWT_*` |
| `frontend/.env` | `VITE_API_URL` (ex.: `http://localhost:8000/api/v1`), `VITE_GOOGLE_CLIENT_ID` |

Modelo completo em `backend/env.example`.

---

## Endpoints da API (prefixo `/api/v1`)

| Router | Responsabilidade |
|--------|-----------------|
| `/auth` | Login Google, verificação de token |
| `/colaboradores` | CRUD de colaboradores |
| `/ciclos` | Gestão de ciclos |
| `/ciclos-avaliacao` | Participação no ciclo (pares, etapas) |
| `/avaliacoes` | Avaliações entre pares e autoavaliação |
| `/avaliacoes-gestor` | Avaliação do gestor |
| `/eixos-avaliacao` | Eixos e níveis de competência |
| `/niveis-carreira` | Níveis esperados por carreira |
| `/entregas-outstanding` | Entregas excepcionais |
| `/valores`, `/registros-valor` | Valores e registros de valor |
| `/feedback-liberacao` | Liberação de feedback |
