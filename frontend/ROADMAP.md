## Roadmap Frontend – Skill Talent

### Visão geral

O frontend está organizando responsabilidades básicas em `services/api.js`, `hooks/useAuth.js` e páginas em `src/pages`. O foco deste roadmap é evoluir autenticação/estado global, padronizar chamadas à API/tratamento de erros e reduzir duplicações, mantendo o código fácil de evoluir.

---

## 1. Curto prazo (correções e ajustes rápidos)

- ✅ **Melhorar verificação de autenticação inicial** - **CONCLUÍDO**
  - **Implementado**: `isLoadingAuth` adicionado no `AuthProvider` para evitar flicker entre telas.
  - **Onde**: `hooks/useAuth.jsx` e `components/PrivateRoute.jsx`.
  - **Resultado**: O `PrivateRoute` agora exibe "Carregando..." enquanto verifica autenticação, evitando redirecionamentos desnecessários.

- ✅ **Evitar duplicação de lógica de limpeza de sessão** - **CONCLUÍDO**
  - **Implementado**: Criado `utils/storage.js` com funções centralizadas para gerenciamento de sessão.
  - **Benefícios alcançados**:
    - Função `clearSession()` centralizada reutilizada em `logout` e handler de `401` da API.
    - Constantes `STORAGE_KEYS` padronizam todas as chaves de localStorage.
    - Função `saveSession()` centraliza o salvamento de dados de sessão.
    - Padronização de chaves: todas usam `user_avatar` (inconsistência com `user_picture` corrigida).
    - Funções auxiliares `getAuthToken()` e `getUserId()` para acesso consistente.

---

## 2. Médio prazo (refatorações estruturais e qualidade de código)

- ✅ **Extrair contexto de autenticação (`AuthContext`)** - **CONCLUÍDO**
  - **Implementado**: `AuthProvider` criado em `hooks/useAuth.jsx` que encapsula toda a lógica de autenticação.
  - **Benefícios alcançados**:
    - Estado de autenticação centralizado via React Context.
    - Evita chamadas duplicadas a `verifyAuth` em múltiplos componentes.
    - Facilita testes e futura migração para outras estratégias de autenticação.
    - Hook `useAuth()` agora valida se está sendo usado dentro do provider.

- ✅ **Criar componentes de rota privada reutilizáveis** - **CONCLUÍDO**
  - **Implementado**: `components/PrivateRoute.jsx` e `components/AdminRoute.jsx`.
  - **Benefícios alcançados**:
    - `App.jsx` ficou mais limpo e declarativo.
    - Lógica de proteção de rotas centralizada e reutilizável.
    - `AdminRoute` verifica permissões de administrador automaticamente.
    - Suporte a estado de loading durante verificação de autenticação.

- **Organizar módulos de API por domínio**
  - **Hoje**: `services/api.js` concentra todas as APIs (auth, ciclos, avaliações, valores, etc.).
  - **Melhorias**:
    - Separar por arquivo: `api/auth.js`, `api/colaboradores.js`, `api/ciclos.js`, etc., mantendo um `apiClient.js` com o `request` genérico.
    - Facilitar tree-shaking, testes unitários e leitura do código.

- ✅ **Padronizar tratamento de erros de API nos componentes** - **CONCLUÍDO**
  - **Implementado**: Criado `utils/errorHandler.js` com helper `handleApiError` e hook `useApi` em `hooks/useApi.js`.
  - **Benefícios alcançados**:
    - Helper `handleApiError` classifica erros (validação, rede, permissão, servidor, etc.) e gera mensagens amigáveis.
    - Log consistente de erros com contexto e tipo de erro.
    - Hook `useApi` disponível para padronizar chamadas de API com tratamento automático de erros.
    - Componentes principais atualizados (`Login`, `Admin`, `EtapaAutoavaliacao`, `EntregaOutstanding`, `RegistroValor`).

- **Melhorar estrutura de páginas grandes (ex.: ciclo de avaliação)**
  - **Onde**: `pages/ciclo-avaliacao/*.jsx` (especialmente `EtapaEscolhaPares.jsx`).
  - **Melhorias**:
    - Quebrar componentes grandes em subcomponentes menores (cards, listas, filtros, modais).
    - Extrair hooks específicos (por exemplo, `useCicloAvaliacao`, `useEscolhaPares`) para isolar regra de negócio da UI.

---

## 3. Longo prazo (evolução de arquitetura, UX e robustez)

- **Introduzir tipagem (TypeScript) ou pelo menos JSDoc forte**
  - **Motivação**: muitas chamadas de API com objetos complexos (`ciclos`, `avaliacoes`, `colaboradores`) sem tipagem, propensos a erros silenciosos.
  - **Ações**:
    - Migrar gradualmente: começar por `services/api.js` e hooks, depois páginas principais.
    - Alternativa: adicionar JSDoc com tipos e usar `@ts-check` em arquivos `.js` como etapa intermediária.

- **Criar um pequeno design system / biblioteca de componentes**
  - **Hoje**: muitos botões e cartões são declarados diretamente em cada página (`Dashboard`, `Login`, etc.).
  - **Melhorias**:
    - Extrair `Button`, `Card`, `Header`, `Layout` básicos para manter consistência visual.
    - Padronizar estados de loading, erro e empty state.

- **Testes automatizados**
  - **Níveis**:
    - Unitários para hooks (`useAuth`, futuros `useCicloAvaliacao`, etc.) e helpers de API.
    - Testes de integração/E2E para fluxos críticos: login, navegação para dashboard, fluxo completo de ciclo de avaliação.
  - **Benefícios**: reduzir regressões à medida que o backend e as regras de negócio evoluem.

- **Melhorias de UX e acessibilidade**
  - **Ideias**:
    - Estados de loading mais claros (spinners/skeletons) em telas que carregam dados pesados (ciclos, avaliações).
    - Mensagens de erro e sucesso consistentes (por exemplo, um `Toast` global).
    - Acessibilidade básica: roles, atributos `aria-*`, foco em modais e bom contraste de cores.

---

## 4. Status de Implementação

### ✅ Concluído
- **AuthProvider e AuthContext**: Sistema de autenticação centralizado via React Context
- **PrivateRoute e AdminRoute**: Componentes reutilizáveis para proteção de rotas
- **isLoadingAuth**: Estado de loading durante verificação de autenticação
- **Refatoração de rotas**: `App.jsx` simplificado usando componentes de rota
- **Padronização de sessão**: Funções centralizadas para gerenciamento de localStorage (`clearSession`, `saveSession`, `STORAGE_KEYS`)
- **Padronização de tratamento de erros**: Helper `handleApiError` e hook `useApi` para tratamento consistente de erros de API

### ⏳ Em andamento / Pendente
- Organização de módulos de API por domínio
- Melhorias em páginas grandes (componentização)

---

## 5. Roadmap sugerido por sprints

- ✅ **Sprint 1 (concluído)**
  - ✅ Implementar `AuthProvider` + `PrivateRoute`/`AdminRoute`.
  - ✅ Ajustar `useAuth` para ter `isLoadingAuth` e evitar flicker entre telas.
  - ✅ Limpar código repetido em `App.jsx` usando componentes de rota reutilizáveis.
  - ✅ Padronizar chaves de `localStorage` e unificar `clearSession`.

- **Sprint 2 (próxima)**
  - Quebrar `services/api.js` em módulos por domínio, mantendo um `apiClient`.
  - Continuar atualizando componentes restantes para usar o padrão de tratamento de erros.

- **Sprint 3 em diante**
  - Refatorar páginas grandes em componentes menores e hooks de domínio.
  - Iniciar tipagem (TypeScript ou JSDoc + `@ts-check`).
  - Introduzir biblioteca de componentes compartilhados e primeiros testes automatizados.


