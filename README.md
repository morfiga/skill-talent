# Skill Talent - Sistema de Avaliação de Desempenho

Aplicação web para avaliação de desempenho de colaboradores, desenvolvida com React e Vite.

## 🚀 Como executar

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para produção

```bash
npm run build
```

## 📋 Funcionalidades

- **Login mockado com Google**: Simulação de autenticação (por enquanto)
- **Dashboard**: Página principal com acesso às funcionalidades
- **Ciclo de avaliação**: Gerenciamento de ciclos de avaliação
- **Entrega outstanding**: Registro de entregas excepcionais
- **Registro de valor**: Documentação de ações que agregam valor

## 🛠️ Tecnologias

- React 18
- Vite
- React Router DOM
- CSS3

## 📁 Estrutura do projeto

```
src/
├── pages/
│   ├── Login.jsx          # Página de login mockada
│   ├── Dashboard.jsx      # Página principal com opções
│   ├── CicloAvaliacao.jsx # Página de ciclo de avaliação
│   ├── EntregaOutstanding.jsx # Página de entrega outstanding
│   └── RegistroValor.jsx  # Página de registro de valor
├── App.jsx                # Componente principal com rotas
└── main.jsx               # Ponto de entrada
```

## 🔐 Autenticação

Por enquanto, a autenticação é mockada. Ao clicar em "Entrar com Google", o sistema simula um login bem-sucedido e redireciona para o dashboard.

