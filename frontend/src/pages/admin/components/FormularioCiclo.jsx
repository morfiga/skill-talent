import { useState } from 'react'

function FormularioCiclo({ ciclo, onSalvar, onCancelar }) {
  const [formulario, setFormulario] = useState({
    nome: ciclo?.nome || '',
    status: ciclo?.status || 'aberto',
    etapa_atual: ciclo?.etapa_atual || 'escolha_pares',
    data_inicio: ciclo?.data_inicio ? new Date(ciclo.data_inicio).toISOString().split('T')[0] : '',
    data_fim: ciclo?.data_fim ? new Date(ciclo.data_fim).toISOString().split('T')[0] : ''
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
        {ciclo ? 'Editar Ciclo' : 'Novo Ciclo'}
      </h3>

      <div className="formulario-campo">
        <label className="campo-label">
          Nome <span className="required">*</span>
        </label>
        <input
          type="text"
          className="campo-input"
          placeholder="Ex: Ciclo 2024 Q1"
          value={formulario.nome}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Status</label>
        <select
          className="campo-input"
          value={formulario.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
        >
          <option value="aberto">Aberto</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="fechado">Fechado</option>
        </select>
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Etapa Atual</label>
        <select
          className="campo-input"
          value={formulario.etapa_atual || 'escolha_pares'}
          onChange={(e) => handleInputChange('etapa_atual', e.target.value)}
        >
          <option value="escolha_pares">Escolha de Pares</option>
          <option value="aprovacao_pares">Aprovação de Pares</option>
          <option value="avaliacoes">Avaliações</option>
          <option value="calibracao">Calibração</option>
          <option value="feedback">Feedback</option>
        </select>
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Data de Início</label>
        <input
          type="date"
          className="campo-input"
          value={formulario.data_inicio}
          onChange={(e) => handleInputChange('data_inicio', e.target.value)}
        />
      </div>

      <div className="formulario-campo">
        <label className="campo-label">Data de Fim</label>
        <input
          type="date"
          className="campo-input"
          value={formulario.data_fim}
          onChange={(e) => handleInputChange('data_fim', e.target.value)}
        />
      </div>

      <div className="formulario-actions">
        <button className="cancelar-button" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          className={`salvar-button ${formulario.nome.trim() ? 'enabled' : 'disabled'}`}
          onClick={handleSubmit}
          disabled={!formulario.nome.trim()}
        >
          {ciclo ? 'Salvar Alterações' : 'Adicionar Ciclo'}
        </button>
      </div>
    </div>
  )
}

export default FormularioCiclo

