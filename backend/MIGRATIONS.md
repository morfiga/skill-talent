# 📦 Guia de Migrations com Alembic

Este documento explica como usar o sistema de migrations do Alembic no projeto.

## 🚀 Instalação

As dependências já incluem o Alembic. Se necessário, instale:

```bash
pip install -r requirements.txt
```

## 📋 Comandos Básicos

### Aplicar todas as migrations

```bash
alembic upgrade head
```

### Criar uma nova migration

```bash
# Migration automática (detecta mudanças nos modelos)
alembic revision --autogenerate -m "descrição da migration"

# Migration manual (você escreve o código)
alembic revision -m "descrição da migration"
```

### Ver histórico de migrations

```bash
alembic history
```

### Ver migration atual

```bash
alembic current
```

### Reverter migrations

```bash
# Reverter uma migration
alembic downgrade -1

# Reverter até uma migration específica
alembic downgrade <revision_id>

# Reverter todas as migrations
alembic downgrade base
```

### Aplicar próxima migration

```bash
alembic upgrade +1
```

## 🛠️ Script Auxiliar

Um script auxiliar está disponível em `scripts/run_migrations.py`:

```bash
# Aplicar todas as migrations
python scripts/run_migrations.py upgrade

# Criar nova migration
python scripts/run_migrations.py revision

# Ver histórico
python scripts/run_migrations.py history

# Ver migration atual
python scripts/run_migrations.py current
```

## 📝 Criando uma Nova Migration

1. **Faça alterações nos modelos** em `app/models/`

2. **Gere a migration automaticamente:**
   ```bash
   alembic revision --autogenerate -m "descrição das mudanças"
   ```

3. **Revise o arquivo gerado** em `alembic/versions/` para garantir que está correto

4. **Aplique a migration:**
   ```bash
   alembic upgrade head
   ```

## ⚠️ Importante

- **Sempre revise** as migrations geradas automaticamente antes de aplicá-las
- **Nunca edite** migrations já aplicadas em produção
- **Teste** as migrations em ambiente de desenvolvimento primeiro
- **Faça backup** do banco antes de aplicar migrations em produção

## 🔍 Estrutura

```
backend/
├── alembic/
│   ├── versions/          # Arquivos de migration
│   ├── env.py            # Configuração do ambiente
│   └── script.py.mako    # Template para migrations
├── alembic.ini           # Configuração do Alembic
└── scripts/
    └── run_migrations.py # Script auxiliar
```

## 🐛 Troubleshooting

### Erro: "Target database is not up to date"

Execute:
```bash
alembic upgrade head
```

### Erro: "Can't locate revision identified by 'xxxxx'"

Verifique se todas as migrations estão no diretório `alembic/versions/`

### Migration não detecta mudanças

- Certifique-se de que os modelos estão importados em `alembic/env.py`
- Verifique se os modelos herdam de `Base`
- Execute com `--autogenerate` novamente

## 📚 Referências

- [Documentação do Alembic](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Migrations](https://docs.sqlalchemy.org/en/20/core/metadata.html)

