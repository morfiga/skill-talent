# 🏗️ Camada de Services

Esta camada contém a lógica de negócio da aplicação, separando-a dos controllers (endpoints) e repositories (acesso a dados).

## 📋 Arquitetura

A aplicação segue uma arquitetura em camadas:

```
Controllers (API) → Services (Lógica de Negócio) → Repositories (Acesso a Dados) → Database
```

### Responsabilidades

- **Controllers**: Apenas orquestram, recebem requisições HTTP e delegam para services
- **Services**: Contêm toda a lógica de negócio, validações e regras
- **Repositories**: Apenas fazem acesso a dados, sem lógica de negócio

## 📁 Estrutura

```
app/services/
├── base.py                    # Classe base para services
├── colaborador_service.py     # Lógica de negócio para colaboradores
├── ciclo_service.py           # Lógica de negócio para ciclos
└── ...
```

## 🎯 Services Disponíveis

### ColaboradorService

Gerencia operações de negócio relacionadas a colaboradores.

**Métodos principais:**
- `get_colaboradores()`: Lista colaboradores com filtros
- `get_colaborador_by_id()`: Obtém colaborador por ID
- `create_colaborador()`: Cria novo colaborador (valida email único)
- `update_colaborador()`: Atualiza colaborador (valida email único)
- `get_colaborador_by_email()`: Busca por email
- `get_colaboradores_by_ids()`: Busca múltiplos por IDs

### CicloService

Gerencia operações de negócio relacionadas a ciclos.

**Métodos principais:**
- `get_ciclos()`: Lista ciclos com filtro por status
- `get_ciclo_by_id()`: Obtém ciclo por ID
- `create_ciclo()`: Cria novo ciclo
- `update_ciclo()`: Atualiza ciclo (valida enums)
- `get_ciclo_aberto()`: Obtém ciclo aberto ativo
- `avancar_etapa()`: Avança etapa do ciclo (valida regras de negócio)
- `delete_ciclo()`: Exclui ciclo

## 💡 Exemplos de Uso

### No Controller

```python
@router.post("/", response_model=ColaboradorResponse, status_code=201)
def create_colaborador(
    colaborador: ColaboradorCreate, 
    db: Session = Depends(get_db)
):
    """Cria um novo colaborador"""
    service = ColaboradorService(db)
    return service.create_colaborador(colaborador)
```

### Validações de Negócio

As validações de negócio ficam nos services:

```python
def create_colaborador(self, colaborador_data: ColaboradorCreate) -> Colaborador:
    # Validar que o email não está em uso
    existing = self.repository.get_by_email(colaborador_data.email)
    if existing:
        raise DuplicateResourceException(...)
    
    # Criar colaborador
    ...
```

## ✅ Benefícios

1. **Separação de Responsabilidades**: Lógica de negócio isolada dos controllers
2. **Reutilização**: Services podem ser usados por múltiplos controllers
3. **Testabilidade**: Services são fáceis de testar isoladamente
4. **Manutenibilidade**: Mudanças na lógica de negócio ficam centralizadas
5. **Consistência**: Regras de negócio aplicadas de forma consistente

## 🔄 Migração de Código

### Antes (Controller com lógica de negócio):

```python
@router.post("/")
def create_colaborador(colaborador: ColaboradorCreate, db: Session):
    # Validação de negócio no controller
    existing = db.query(Colaborador).filter(...).first()
    if existing:
        raise HTTPException(...)
    
    # Criação
    db_colaborador = Colaborador(**colaborador.model_dump())
    db.add(db_colaborador)
    db.commit()
    return db_colaborador
```

### Depois (Controller delegando para service):

```python
@router.post("/")
def create_colaborador(colaborador: ColaboradorCreate, db: Session):
    service = ColaboradorService(db)
    return service.create_colaborador(colaborador)
```

## 📝 Boas Práticas

1. **Services não devem conhecer HTTP**: Não usar `HTTPException` diretamente, usar exceções customizadas
2. **Repositories apenas para dados**: Não colocar lógica de negócio em repositories
3. **Transações no service**: Gerenciar commits/rollbacks nos services
4. **Validações no service**: Todas as validações de negócio devem estar nos services
5. **Um service por domínio**: Criar um service para cada entidade/domínio principal

## 🚀 Próximos Passos

- [ ] Criar `AvaliacaoService`
- [ ] Criar `CicloAvaliacaoService`
- [ ] Criar `RegistroValorService`
- [ ] Refatorar endpoints restantes para usar services

