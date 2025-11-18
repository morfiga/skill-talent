import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { registrosValorAPI, valoresAPI } from '../services/api'
import './Page.css'
import './RegistroValor.css'

function RegistroValor({ onLogout }) {
  const navigate = useNavigate()
  const { colaboradorId, colaborador } = useAuth()
  const isAdmin = colaborador?.is_admin || false
  const [valoresDisponiveis, setValoresDisponiveis] = useState([])
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState({
    descricao: '',
    valoresSelecionados: [],
    reflexao: '',
    impacto: ''
  })

  useEffect(() => {
    if (colaboradorId) {
      loadValores()
      loadRegistros()
    }
  }, [colaboradorId])

  const loadValores = async () => {
    try {
      const response = await valoresAPI.getAll()
      setValoresDisponiveis(response.valores || [])
    } catch (error) {
      console.error('Erro ao carregar valores:', error)
    }
  }

  const loadRegistros = async () => {
    try {
      setLoading(true)
      const response = await registrosValorAPI.getAll({ colaborador_id: colaboradorId })
      setRegistros(response.registros || [])
    } catch (error) {
      console.error('Erro ao carregar registros:', error)
      alert('Erro ao carregar registros. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (campo, valor) => {
    setFormulario(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const toggleValor = (valorId) => {
    setFormulario(prev => {
      const valores = prev.valoresSelecionados
      const jaSelecionado = valores.includes(valorId)

      if (jaSelecionado) {
        return {
          ...prev,
          valoresSelecionados: valores.filter(id => id !== valorId)
        }
      } else {
        return {
          ...prev,
          valoresSelecionados: [...valores, valorId]
        }
      }
    })
  }

  const handleSalvarRegistro = async () => {
    if (
      formulario.descricao.trim() &&
      formulario.valoresSelecionados.length > 0 &&
      formulario.reflexao.trim() &&
      formulario.impacto.trim()
    ) {
      try {
        await registrosValorAPI.create(colaboradorId, {
          descricao: formulario.descricao,
          reflexao: formulario.reflexao,
          impacto: formulario.impacto,
          valores_ids: formulario.valoresSelecionados
        })

        setFormulario({
          descricao: '',
          valoresSelecionados: [],
          reflexao: '',
          impacto: ''
        })
        setMostrarFormulario(false)
        await loadRegistros()
        alert('Registro salvo com sucesso!')
      } catch (error) {
        console.error('Erro ao salvar registro:', error)
        alert('Erro ao salvar registro. Tente novamente.')
      }
    }
  }

  const handleCancelar = () => {
    setFormulario({
      descricao: '',
      valoresSelecionados: [],
      reflexao: '',
      impacto: ''
    })
    setMostrarFormulario(false)
  }

  const isFormularioValido = () => {
    return (
      formulario.descricao.trim() &&
      formulario.valoresSelecionados.length > 0 &&
      formulario.reflexao.trim() &&
      formulario.impacto.trim()
    )
  }

  const formatarData = (dataISO) => {
    if (!dataISO) return ''
    const data = new Date(dataISO)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Voltar
          </button>
          <h1 className="page-title">Registro de valor</h1>
          <div className="header-buttons">
            {isAdmin && (
              <button className="admin-button" onClick={() => navigate('/admin')}>
                Administração
              </button>
            )}
            <button className="logout-button" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="registro-main">
        <div className="registro-content">
          <div className="registro-header">
            <h2 className="registro-title">Registros de Valor</h2>
            <p className="registro-subtitle">
              Registre ações que refletem os valores da organização
            </p>
            {!mostrarFormulario && (
              <button
                className="adicionar-button"
                onClick={() => setMostrarFormulario(true)}
              >
                + Adicionar Novo Registro
              </button>
            )}
          </div>

          {mostrarFormulario && (
            <div className="formulario-container">
              <h3 className="formulario-title">Novo Registro de Valor</h3>

              <div className="formulario-campo">
                <label className="campo-label">
                  Descreva o que aconteceu <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  O que foi feito, em que contexto e por quem (pode ser você ou outra pessoa).
                </p>
                <textarea
                  className="campo-textarea"
                  placeholder="Descreva detalhadamente o que aconteceu..."
                  value={formulario.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="formulario-campo">
                <label className="campo-label">
                  Seleção de valor <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Selecione um ou mais valores que essa ação reflete.
                </p>
                <div className="valores-grid">
                  {valoresDisponiveis.map((valor) => {
                    const isSelecionado = formulario.valoresSelecionados.includes(valor.id)
                    return (
                      <div
                        key={valor.id}
                        className={`valor-card ${isSelecionado ? 'selecionado' : ''}`}
                        onClick={() => toggleValor(valor.id)}
                      >
                        <div className="valor-icone">{valor.icone || '💎'}</div>
                        <div className="valor-nome">{valor.nome}</div>
                        {isSelecionado && (
                          <div className="valor-check">✓</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="formulario-campo">
                <label className="campo-label">
                  Como essa ação reflete o(s) valor(es)? <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Explique por que você acredita que essa ação está alinhada ao(s) valor(es) escolhido(s).
                </p>
                <textarea
                  className="campo-textarea"
                  placeholder="Explique como a ação reflete os valores selecionados..."
                  value={formulario.reflexao}
                  onChange={(e) => handleInputChange('reflexao', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="formulario-campo">
                <label className="campo-label">
                  Impacto da ação <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Que impacto essa atitude gerou no time, nos resultados ou na cultura?
                </p>
                <textarea
                  className="campo-textarea"
                  placeholder="Descreva o impacto gerado..."
                  value={formulario.impacto}
                  onChange={(e) => handleInputChange('impacto', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="formulario-actions">
                <button
                  className="cancelar-button"
                  onClick={handleCancelar}
                >
                  Cancelar
                </button>
                <button
                  className={`salvar-button ${isFormularioValido() ? 'enabled' : 'disabled'}`}
                  onClick={handleSalvarRegistro}
                  disabled={!isFormularioValido()}
                >
                  Salvar Registro
                </button>
              </div>
            </div>
          )}

          <div className="registros-lista">
            <h3 className="lista-title">
              {registros.length > 0 ? `Meus Registros (${registros.length})` : 'Nenhum registro encontrado'}
            </h3>

            {registros.length === 0 && !mostrarFormulario && (
              <div className="empty-state">
                <div className="empty-icon">💎</div>
                <p className="empty-text">Você ainda não registrou nenhuma ação de valor.</p>
                <p className="empty-subtext">Clique em "Adicionar Novo Registro" para começar!</p>
              </div>
            )}

            {registros.map((registro) => (
              <div key={registro.id} className="registro-card">
                <div className="registro-card-header">
                  <div className="registro-data">
                    <span className="data-icon">📅</span>
                    <span className="data-text">{formatarData(registro.created_at)}</span>
                  </div>
                  <div className="registro-valores">
                    {registro.valores && registro.valores.map((valor, index) => (
                      <span key={index} className="valor-badge">
                        {valor.icone} {valor.nome}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="registro-card-body">
                  <div className="registro-secao">
                    <h4 className="secao-title">O que aconteceu</h4>
                    <p className="secao-conteudo">{registro.descricao}</p>
                  </div>

                  <div className="registro-secao">
                    <h4 className="secao-title">Como reflete o(s) valor(es)</h4>
                    <p className="secao-conteudo">{registro.reflexao}</p>
                  </div>

                  <div className="registro-secao">
                    <h4 className="secao-title">Impacto da ação</h4>
                    <p className="secao-conteudo">{registro.impacto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default RegistroValor
