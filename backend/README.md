# Skill Talent - Backend API

API backend desenvolvida com FastAPI e MySQL para o sistema de avaliação de desempenho.

## 🚀 Como executar

### Pré-requisitos

- Python 3.11+
- MySQL 8.0+
- pip ou poetry

### Instalação

1. Crie um ambiente virtual:

```bash
python -m venv venv
```

2. Ative o ambiente virtual:

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

3. Instale as dependências:

```bash
pip install -r requirements.txt
```

4. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações de banco de dados.

5. Crie o banco de dados MySQL:

```sql
CREATE DATABASE skill_talent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Executar a aplicação

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API estará disponível em `http://localhost:8000`

### Documentação

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 📁 Estrutura do projeto

```
backend/
├── app/
│   ├── api/           # Rotas e endpoints
│   │   └── v1/        # Versão 1 da API
│   ├── core/          # Configurações centrais
│   ├── models/        # Modelos SQLAlchemy
│   ├── schemas/       # Schemas Pydantic
│   ├── services/      # Lógica de negócio
│   ├── database.py    # Configuração do banco
│   └── main.py        # Ponto de entrada
├── .env.example       # Exemplo de variáveis de ambiente
├── requirements.txt   # Dependências Python
└── README.md          # Este arquivo
```

## 🛠️ Tecnologias

- **FastAPI**: Framework web moderno e rápido
- **SQLAlchemy**: ORM para Python
- **PyMySQL**: Driver MySQL
- **Pydantic**: Validação de dados
- **Uvicorn**: Servidor ASGI

## 🔐 Variáveis de ambiente

Veja o arquivo `.env.example` para todas as variáveis de ambiente necessárias.

## 📝 Próximos passos

- [ ] Implementar autenticação JWT
- [ ] Criar modelos de dados
- [ ] Implementar endpoints de CRUD
- [ ] Adicionar testes
- [ ] Configurar migrations com Alembic

