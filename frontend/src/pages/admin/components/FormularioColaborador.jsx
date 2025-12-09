import { useState } from 'react'

function FormularioColaborador({ colaborador, onSalvar, onCancelar, departamentos }) {
  const [formulario, setFormulario] = useState({
    nome: colaborador?.nome || '',
    email: colaborador?.email || '',
    cargo: colaborador?.cargo || '',
    departamento: colaborador?.departamento || '',
    avatar: colaborador?.avatar || '',
    is_admin: colaborador?.is_admin || false
  })

  const handleInputChange = (campo, valor) => {
    setFormulario(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const handleSubmit = () => {
    onSalvar(formulario)
  }

  return (
    <div className="formulario-container">
      <h3 className="formulario-title">
        {colaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
      </h3>

      <div className="formulario-campo">
        <label className="campo-label">
          Nome <span className="required">*</span>
        </label>
        <input
          type="text"
          className="campo-input"
          placeholder="Nome completo do colaborador"
          value={formulario.nome}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>

      <div className="formulario-campo">
        <label className="campo-label">
          Email <span className="required">*</span>
        </label>
        <input
          type="email"
          className="campo-input"
          placeholder="email@exemplo.com"
          value={formulario.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          disabled={!!colaborador}
        />
        {colaborador && (
          <p className="campo-descricao" style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
            O email não pode ser alterado
          </p>
        )}
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Cargo</label>
        <input
          type="text"
          className="campo-input"
          placeholder="Cargo do colaborador"
          value={formulario.cargo}
          onChange={(e) => handleInputChange('cargo', e.target.value)}
        />
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Departamento</label>
        <input
          type="text"
          className="campo-input"
          placeholder="Nome do departamento"
          value={formulario.departamento}
          onChange={(e) => handleInputChange('departamento', e.target.value)}
          list="departamentos-list"
        />
        <datalist id="departamentos-list">
          {departamentos.map(dept => (
            <option key={dept} value={dept} />
          ))}
        </datalist>
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Avatar (URL da imagem)</label>
        <input
          type="url"
          className="campo-input"
          placeholder="https://exemplo.com/avatar.jpg"
          value={formulario.avatar}
          onChange={(e) => handleInputChange('avatar', e.target.value)}
        />
        <p className="campo-descricao" style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
          URL da imagem do avatar. Se não informado, será exibida a inicial do nome.
        </p>
      </div>

      {colaborador && (
        <div className="formulario-campo">
          <label className="campo-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={formulario.is_admin || false}
              onChange={(e) => handleInputChange('is_admin', e.target.checked)}
            />
            <span>Administrador</span>
          </label>
          <p className="campo-descricao" style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
            Marque esta opção para conceder permissões de administrador a este colaborador.
          </p>
        </div>
      )}

      <div className="formulario-actions">
        <button className="cancelar-button" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          className={`salvar-button ${formulario.nome.trim() && formulario.email.trim() ? 'enabled' : 'disabled'}`}
          onClick={handleSubmit}
          disabled={!formulario.nome.trim() || !formulario.email.trim()}
        >
          {colaborador ? 'Salvar Alterações' : 'Adicionar Colaborador'}
        </button>
      </div>
    </div>
  )
}

export default FormularioColaborador

