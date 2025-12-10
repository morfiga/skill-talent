import Avatar from '../../../components/Avatar'

function TabelaAcompanhamentoGestores({ gestores, onVerDetalhes }) {
  if (gestores.length === 0) {
    return null
  }

  return (
    <div className="table-container" style={{ overflowX: 'auto', marginBottom: '40px' }}>
      <table className="colaboradores-table" style={{ minWidth: '700px' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '200px' }}>Gestor</th>
            <th className="cell-center" style={{ minWidth: '180px' }}>Autoavaliação</th>
            <th className="cell-center" style={{ minWidth: '180px' }}>Avaliações dos Liderados</th>
            <th className="cell-center" style={{ minWidth: '100px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {gestores.map((colab) => (
            <tr key={colab.colaborador_id}>
              <td>
                <div className="colaborador-com-avatar">
                  <Avatar
                    avatar={colab.avatar}
                    nome={colab.nome}
                    size={40}
                  />
                  <div className="colaborador-detalhes">
                    <div className="colaborador-info-nome">
                      {colab.nome}
                    </div>
                    <div className="colaborador-info-secundaria">
                      {colab.cargo || colab.departamento || '-'}
                    </div>
                  </div>
                </div>
              </td>
              <td className="cell-center">
                {colab.fez_autoavaliacao_gestor ? (
                  <span className="progresso-badge completo">
                    ✓ Feita
                  </span>
                ) : (
                  <span className="progresso-badge pendente">
                    Pendente
                  </span>
                )}
              </td>
              <td className="cell-center">
                {colab.avaliacoes_liderados_total > 0 ? (
                  <span className={`progresso-badge ${colab.avaliacoes_liderados_realizadas >= colab.avaliacoes_liderados_total
                    ? 'completo'
                    : 'parcial'
                    }`}>
                    {colab.avaliacoes_liderados_realizadas}/{colab.avaliacoes_liderados_total}
                  </span>
                ) : (
                  <span className="progresso-vazio">
                    Sem liderados
                  </span>
                )}
              </td>
              <td className="cell-center">
                {onVerDetalhes && (
                  <button
                    className="action-button"
                    onClick={() => onVerDetalhes(colab)}
                    title="Ver detalhes do gestor"
                  >
                    🔍
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TabelaAcompanhamentoGestores
