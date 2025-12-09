import Avatar from '../../../components/Avatar'

function TabelaCalibracaoGestores({ gestores, colaboradoresInfo, onVerDetalhes }) {
  if (gestores.length === 0) {
    return null
  }

  return (
    <div className="table-container" style={{ marginBottom: '40px' }}>
      <table className="colaboradores-table">
        <thead>
          <tr>
            <th>Gestor</th>
            <th>Departamento</th>
            <th>Autoavaliação</th>
            <th>Avaliações Recebidas</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {gestores.map((gestor) => {
            const info = colaboradoresInfo[gestor.id] || { 
              temAutoavaliacao: false, 
              qtdAvaliacoes: 0, 
              qtdAvaliacoesGestorRecebidas: 0, 
              temAutoavaliacaoGestor: false 
            }
            return (
              <tr key={gestor.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar
                      avatar={gestor.avatar}
                      nome={gestor.nome}
                      size={50}
                    />
                    <div>
                      <div className="colaborador-nome">{gestor.nome}</div>
                      <div className="colaborador-email" style={{ fontSize: '0.85rem' }}>
                        {gestor.cargo || '-'}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{gestor.departamento || '-'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {info.temAutoavaliacaoGestor ? (
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
                        title="Autoavaliação de gestor realizada"
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
                        title="Autoavaliação de gestor não realizada"
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
                    background: info.qtdAvaliacoesGestorRecebidas > 0 ? '#f3e5f5' : '#f5f5f5',
                    color: info.qtdAvaliacoesGestorRecebidas > 0 ? '#7b1fa2' : '#999',
                    borderRadius: '16px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    {info.qtdAvaliacoesGestorRecebidas}
                  </span>
                </td>
                <td>
                  <button
                    className="action-button"
                    onClick={() => onVerDetalhes(gestor)}
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

export default TabelaCalibracaoGestores

