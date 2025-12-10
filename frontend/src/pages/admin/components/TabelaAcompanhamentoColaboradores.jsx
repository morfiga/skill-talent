import Avatar from '../../../components/Avatar'

function TabelaAcompanhamentoColaboradores({ colaboradores, onVerDetalhes }) {
  if (colaboradores.length === 0) {
    return null
  }

  return (
    <div className="table-container" style={{ overflowX: 'auto' }}>
      <table className="colaboradores-table" style={{ minWidth: '900px' }}>
        <thead>
          <tr>
            <th style={{ minWidth: '200px' }}>Colaborador</th>
            <th className="cell-center" style={{ minWidth: '120px' }}>Escolha de Pares</th>
            <th className="cell-center" style={{ minWidth: '140px' }}>Avaliações de Pares</th>
            <th className="cell-center" style={{ minWidth: '120px' }}>Autoavaliação</th>
            <th className="cell-center" style={{ minWidth: '140px' }}>Avaliação do Gestor</th>
            <th className="cell-center" style={{ minWidth: '100px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {colaboradores.map((colab) => (
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
                <div className="cell-flex-column">
                  {colab.escolheu_pares ? (
                    <span className="progresso-badge completo">
                      ✓ Sim
                    </span>
                  ) : (
                    <span className="progresso-badge pendente">
                      {colab.qtd_pares_escolhidos}/4
                    </span>
                  )}
                </div>
              </td>
              <td className="cell-center">
                {colab.avaliacoes_pares_total > 0 ? (
                  <span className={`progresso-badge ${colab.avaliacoes_pares_realizadas >= colab.avaliacoes_pares_total
                      ? 'completo'
                      : 'parcial'
                    }`}>
                    {colab.avaliacoes_pares_realizadas}/{colab.avaliacoes_pares_total}
                  </span>
                ) : (
                  <span className="progresso-vazio">
                    Nenhuma pendente
                  </span>
                )}
              </td>
              <td className="cell-center">
                {colab.fez_autoavaliacao ? (
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
                {!colab.tem_gestor ? (
                  <span className="progresso-vazio">
                    Sem gestor
                  </span>
                ) : colab.fez_avaliacao_gestor ? (
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
                {onVerDetalhes && (
                  <button
                    className="action-button"
                    onClick={() => onVerDetalhes(colab)}
                    title="Ver detalhes do colaborador"
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

export default TabelaAcompanhamentoColaboradores

