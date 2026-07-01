# Estrutura Admin Refatorada

Esta pasta contém a implementação modularizada da área administrativa do sistema.

## Estrutura de Arquivos

```
admin/
├── Admin.jsx                      # Componente principal com menu lateral
├── Admin.css                      # Estilos globais da área admin
├── ColaboradoresAdmin.jsx         # Página de gerenciamento de colaboradores
├── CiclosAdmin.jsx                # Página de gerenciamento de ciclos
├── AprovacaoParesAdmin.jsx        # Página de aprovação de pares
├── CalibracaoAdmin.jsx            # Página de calibração de avaliações
├── AcompanhamentoAdmin.jsx        # Página de acompanhamento de progresso
└── components/                    # Componentes reutilizáveis
    ├── FormularioColaborador.jsx  # Formulário para criar/editar colaboradores
    ├── FormularioCiclo.jsx        # Formulário para criar/editar ciclos
    ├── TabelaColaboradores.jsx    # Tabela de listagem de colaboradores
    ├── TabelaCiclos.jsx           # Tabela de listagem de ciclos
    ├── TabelaCalibracaoGestores.jsx          # Tabela de gestores na calibração
    ├── TabelaCalibracaoColaboradores.jsx     # Tabela de colaboradores na calibração
    ├── TabelaAcompanhamentoGestores.jsx      # Tabela de gestores no acompanhamento
    ├── TabelaAcompanhamentoColaboradores.jsx # Tabela de colaboradores no acompanhamento
    └── DetalhesCalibracao.jsx     # Detalhes das avaliações na calibração
```

## Páginas

### Admin.jsx
Componente principal que:
- Renderiza o menu lateral com navegação entre as abas
- Gerencia qual página está ativa
- Verifica permissões de administrador
- Fornece layout consistente com header

### ColaboradoresAdmin.jsx
Gerencia colaboradores do sistema:
- Lista todos os colaboradores
- Permite criar, editar e excluir colaboradores
- Filtro de busca por nome, email, cargo ou departamento
- Usa `FormularioColaborador` e `TabelaColaboradores`

### CiclosAdmin.jsx
Gerencia ciclos de avaliação:
- Lista todos os ciclos
- Permite criar, editar e excluir ciclos
- Avançar etapa do ciclo
- Filtro de busca por nome, status ou etapa
- Usa `FormularioCiclo` e `TabelaCiclos`

### AprovacaoParesAdmin.jsx
Aprovação de pares escolhidos:
- Mostra liderados do ciclo em etapa de aprovação
- Permite editar os pares escolhidos por cada liderado
- Seleção visual de 2 pares obrigatórios

### CalibracaoAdmin.jsx
Visualização de avaliações para calibração:
- Separa gestores e colaboradores
- Mostra status de autoavaliação e quantidade de avaliações recebidas
- Detalhamento completo de avaliações de competências
- Visualização de avaliações de gestor (para gestores)
- Usa componentes `TabelaCalibracaoGestores`, `TabelaCalibracaoColaboradores` e `DetalhesCalibracao`

### AcompanhamentoAdmin.jsx
Acompanhamento do progresso do ciclo:
- Seletor de ciclo ativo
- **Separado em duas tabelas**: Gestores e Colaboradores
- Status de cada colaborador:
  - Escolha de pares (2/2)
  - Avaliações de pares (realizadas/total)
  - Autoavaliação (feita/pendente)
  - Avaliação do gestor (feita/pendente)
- Status adicional para gestores:
  - Autoavaliação de gestor (feita/pendente)
- Filtro de busca
- Usa `TabelaAcompanhamentoGestores` e `TabelaAcompanhamentoColaboradores`

## Componentes Reutilizáveis

### Formulários
- **FormularioColaborador**: Campos para nome, email, cargo, departamento, avatar e permissão de admin
- **FormularioCiclo**: Campos para nome, status, etapa, data de início e fim

### Tabelas
- **TabelaColaboradores**: Exibe avatar, nome, email, cargo, departamento e ações (editar/excluir)
- **TabelaCiclos**: Exibe nome, status, etapa, datas e ações (avançar/editar/excluir)
- **TabelaCalibracaoGestores**: Tabela específica para gestores na calibração (com autoavaliação de gestor)
- **TabelaCalibracaoColaboradores**: Tabela específica para colaboradores na calibração
- **TabelaAcompanhamentoGestores**: Tabela específica para gestores no acompanhamento (com coluna adicional de autoavaliação de gestor)
- **TabelaAcompanhamentoColaboradores**: Tabela específica para colaboradores no acompanhamento

### Detalhes
- **DetalhesCalibracao**: Componente completo para exibir todas as avaliações de um colaborador, incluindo competências e avaliações de gestor

## Padrões de Código

### Estado e Hooks
Cada página gerencia seu próprio estado:
- Loading states
- Error states
- Data states
- Filter states

### API Calls
Todas as chamadas de API usam:
- Try/catch para tratamento de erros
- `handleApiError` para mensagens consistentes
- Toast para feedback ao usuário

### Estilização
- Classes CSS reutilizáveis do `Admin.css`
- Inline styles para casos específicos
- Design responsivo

### Componentização
- Separação de concerns (lógica vs apresentação)
- Componentes pequenos e focados
- Props bem definidas

## Benefícios da Refatoração

1. **Manutenibilidade**: Código dividido em arquivos menores e mais focados
2. **Reusabilidade**: Componentes podem ser reutilizados em diferentes contextos
3. **Testabilidade**: Funções e componentes menores são mais fáceis de testar
4. **Legibilidade**: Código mais limpo e organizado
5. **Escalabilidade**: Fácil adicionar novas páginas ou funcionalidades

## Como Adicionar Nova Página

1. Criar novo arquivo na pasta `admin/` (ex: `NovaFuncionalidadeAdmin.jsx`)
2. Implementar lógica específica da página
3. Adicionar botão no menu lateral em `Admin.jsx`
4. Adicionar renderização condicional no `admin-panel`
5. Criar componentes reutilizáveis em `components/` se necessário

Exemplo:
```jsx
// Em Admin.jsx
<button
  className={`admin-nav-item ${abaAtiva === 'nova_funcionalidade' ? 'active' : ''}`}
  onClick={() => setAbaAtiva('nova_funcionalidade')}
>
  🎯 Nova Funcionalidade
</button>

// No admin-panel
{abaAtiva === 'nova_funcionalidade' && <NovaFuncionalidadeAdmin />}
```

