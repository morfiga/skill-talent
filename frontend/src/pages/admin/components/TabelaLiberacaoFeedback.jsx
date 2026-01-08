import Avatar from '../../../components/Avatar'

function TabelaLiberacaoFeedback({ colaboradores, onLiberar, onRevogar, loading }) {
  const formatarData = (dataString) => {
    if (!dataString) return '-'
    const data = new Date(dataString)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="table-container">
      <table className="colaboradores-table">
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Nome</th>
            <th>Cargo</th>
            <th>Departamento</th>
            <th>Status</th>
            <th>Liberado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {colaboradores.map((colaborador) => (
            <tr key={colaborador.id}>
              <td>
                <Avatar
                  avatar={colaborador.avatar}
                  nome={colaborador.nome}
                  size={50}
                  className="colaborador-avatar"
                />
              </td>
              <td>
                <div className="colaborador-nome">{colaborador.nome}</div>
              </td>
              <td>{colaborador.cargo || '-'}</td>
              <td>
                {colaborador.departamento ? (
                  <span className="colaborador-departamento">{colaborador.departamento}</span>
                ) : (
                  <span style={{ color: '#999' }}>-</span>
                )}
              </td>
              <td>
                {colaborador.feedback_liberado ? (
                  <span className="badge badge-success">✅ Liberado</span>
                ) : (
                  <span className="badge badge-warning">⏳ Pendente</span>
                )}
              </td>
              <td>
                {colaborador.liberacao?.liberado_em
                  ? formatarData(colaborador.liberacao.liberado_em)
                  : '-'
                }
              </td>
              <td>
                <div className="colaborador-actions">
                  {colaborador.feedback_liberado ? (
                    <button
                      className="action-button delete"
                      onClick={() => onRevogar(colaborador.id)}
                      disabled={loading}
                      title="Revogar liberação do feedback"
                    >
                      🚫
                    </button>
                  ) : (
                    <button
                      className="action-button edit"
                      onClick={() => onLiberar(colaborador.id)}
                      disabled={loading}
                      title="Liberar feedback para visualização"
                    >
                      ✅
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TabelaLiberacaoFeedback

