import Avatar from '../../../components/Avatar'

function TabelaColaboradores({ colaboradores, onEditar, onExcluir }) {
  if (colaboradores.length === 0) {
    return null
  }

  return (
    <div className="table-container">
      <table className="colaboradores-table">
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Cargo</th>
            <th>Departamento</th>
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
              <td>
                <div className="colaborador-email">{colaborador.email}</div>
              </td>
              <td>
                <div className="colaborador-cargo">{colaborador.cargo || '-'}</div>
              </td>
              <td>
                {colaborador.departamento ? (
                  <span className="colaborador-departamento">{colaborador.departamento}</span>
                ) : (
                  <span style={{ color: '#999' }}>-</span>
                )}
              </td>
              <td>
                <div className="colaborador-actions">
                  <button
                    className="action-button edit"
                    onClick={() => onEditar(colaborador)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-button delete"
                    onClick={() => onExcluir(colaborador.id)}
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

export default TabelaColaboradores

