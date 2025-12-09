function TabelaCiclos({ ciclos, onEditar, onExcluir, onAvancarEtapa }) {
  const getStatusLabel = (status) => {
    const labels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído',
      'fechado': 'Fechado'
    }
    return labels[status] || status
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      'aberto': 'status-badge aberto',
      'em_andamento': 'status-badge em-andamento',
      'concluido': 'status-badge concluido',
      'fechado': 'status-badge fechado'
    }
    return classes[status] || 'status-badge'
  }

  const getEtapaLabel = (etapa) => {
    const labels = {
      'escolha_pares': 'Escolha de Pares',
      'aprovacao_pares': 'Aprovação de Pares',
      'avaliacoes': 'Avaliações',
      'calibracao': 'Calibração',
      'feedback': 'Feedback'
    }
    return labels[etapa] || etapa
  }

  const getEtapaBadgeClass = (etapa) => {
    const classes = {
      'escolha_pares': 'status-badge etapa-escolha-pares',
      'aprovacao_pares': 'status-badge etapa-aprovacao-pares',
      'avaliacoes': 'status-badge etapa-avaliacoes',
      'calibracao': 'status-badge etapa-calibracao',
      'feedback': 'status-badge etapa-feedback'
    }
    return classes[etapa] || 'status-badge'
  }

  const podeAvancarEtapa = (ciclo) => {
    return ciclo.etapa_atual !== 'feedback'
  }

  if (ciclos.length === 0) {
    return null
  }

  return (
    <div className="table-container">
      <table className="colaboradores-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th>Etapa Atual</th>
            <th>Data de Início</th>
            <th>Data de Fim</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {ciclos.map((ciclo) => (
            <tr key={ciclo.id}>
              <td>
                <div className="colaborador-nome">{ciclo.nome}</div>
              </td>
              <td>
                <span className={getStatusBadgeClass(ciclo.status)}>
                  {getStatusLabel(ciclo.status)}
                </span>
              </td>
              <td>
                <span className={getEtapaBadgeClass(ciclo.etapa_atual)}>
                  {getEtapaLabel(ciclo.etapa_atual)}
                </span>
              </td>
              <td>
                <div className="colaborador-cargo">
                  {ciclo.data_inicio ? new Date(ciclo.data_inicio).toLocaleDateString('pt-BR') : '-'}
                </div>
              </td>
              <td>
                <div className="colaborador-cargo">
                  {ciclo.data_fim ? new Date(ciclo.data_fim).toLocaleDateString('pt-BR') : '-'}
                </div>
              </td>
              <td>
                <div className="colaborador-actions">
                  {podeAvancarEtapa(ciclo) && (
                    <button
                      className="action-button avancar"
                      onClick={() => onAvancarEtapa(ciclo.id)}
                      title="Avançar Etapa"
                      style={{ background: '#4caf50', color: 'white' }}
                    >
                      ➤
                    </button>
                  )}
                  <button
                    className="action-button edit"
                    onClick={() => onEditar(ciclo)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-button delete"
                    onClick={() => onExcluir(ciclo.id)}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TabelaCiclos

