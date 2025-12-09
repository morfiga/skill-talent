import Avatar from '../../../components/Avatar'

function TabelaCalibracaoColaboradores({ colaboradores, colaboradoresInfo, onVerDetalhes }) {
  if (colaboradores.length === 0) {
    return null
  }

  return (
    <div className="table-container">
      <table className="colaboradores-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Departamento</th>
            <th>Autoavaliação</th>
            <th>Avaliações Recebidas</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {colaboradores.map((colaborador) => {
            const info = colaboradoresInfo[colaborador.id] || { temAutoavaliacao: false, qtdAvaliacoes: 0 }
            return (
              <tr key={colaborador.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar
                      avatar={colaborador.avatar}
                      nome={colaborador.nome}
                      size={50}
                    />
                    <div>
                      <div className="colaborador-nome">{colaborador.nome}</div>
                      <div className="colaborador-email" style={{ fontSize: '0.85rem' }}>
                        {colaborador.cargo || '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{colaborador.departamento || '-'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {info.temAutoavaliacao ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          background: '#4caf50',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                        title="Autoavaliação realizada"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          background: '#ff9800',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                        title="Autoavaliação não realizada"
                      >
                        ✗
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '30px',
                    padding: '4px 12px',
                    background: '#e3f2fd',
                    color: '#1976d2',
                    borderRadius: '16px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    {info.qtdAvaliacoes}
                  </span>
                </td>
                <td>
                  <button
                    className="action-button"
                    onClick={() => onVerDetalhes(colaborador)}
                    style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto' }}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TabelaCalibracaoColaboradores

