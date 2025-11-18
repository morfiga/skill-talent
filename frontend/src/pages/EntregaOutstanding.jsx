import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { entregasOutstandingAPI } from '../services/api'
import './EntregaOutstanding.css'
import './Page.css'

function EntregaOutstanding({ onLogout }) {
  const navigate = useNavigate()
  const { colaboradorId, colaborador } = useAuth()
  const isAdmin = colaborador?.is_admin || false
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState({
    descricao: '',
    impacto: '',
    evidencias: ''
  })

  useEffect(() => {
    if (colaboradorId) {
      loadEntregas()
    }
  }, [colaboradorId])

  const loadEntregas = async () => {
    try {
      setLoading(true)
      const response = await entregasOutstandingAPI.getAll({ colaborador_id: colaboradorId })
      setEntregas(response.entregas || [])
    } catch (error) {
      console.error('Erro ao carregar entregas:', error)
      alert('Erro ao carregar entregas. Tente novamente.')
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

  const handleSalvarEntrega = async () => {
    if (formulario.descricao.trim() && formulario.impacto.trim() && formulario.evidencias.trim()) {
      try {
        await entregasOutstandingAPI.create(colaboradorId, {
          descricao: formulario.descricao,
          impacto: formulario.impacto,
          evidencias: formulario.evidencias
        })

        setFormulario({
          descricao: '',
          impacto: '',
          evidencias: ''
        })
        setMostrarFormulario(false)
        await loadEntregas()
        alert('Entrega registrada com sucesso!')
      } catch (error) {
        console.error('Erro ao salvar entrega:', error)
        alert('Erro ao salvar entrega. Tente novamente.')
      }
    }
  }

  const handleCancelar = () => {
    setFormulario({
      descricao: '',
      impacto: '',
      evidencias: ''
    })
    setMostrarFormulario(false)
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
          <h1 className="page-title">Entrega outstanding</h1>
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

      <main className="entrega-main">
        <div className="entrega-content">
          <div className="entrega-header">
            <h2 className="entrega-title">Entregas Outstanding</h2>
            <p className="entrega-subtitle">
              Registre entregas excepcionais que tiveram impacto significativo
            </p>
            {!mostrarFormulario && (
              <button
                className="adicionar-button"
                onClick={() => setMostrarFormulario(true)}
              >
                + Adicionar Nova Entrega
              </button>
            )}
          </div>

          {mostrarFormulario && (
            <div className="formulario-container">
              <h3 className="formulario-title">Nova Entrega Outstanding</h3>

              <div className="formulario-campo">
                <label className="campo-label">
                  Descrição <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Explique o que foi feito e por que considera essa entrega outstanding.
                </p>
                <textarea
                  className="campo-textarea"
                  placeholder="Descreva detalhadamente a entrega..."
                  value={formulario.descricao}
                  onChange={(e) => handleInputChange('descricao', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="formulario-campo">
                <label className="campo-label">
                  Impacto gerado <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Descreva o impacto direto que essa entrega teve no time, nos clientes ou na empresa.
                </p>
                <textarea
                  className="campo-textarea"
                  placeholder="Descreva o impacto gerado..."
                  value={formulario.impacto}
                  onChange={(e) => handleInputChange('impacto', e.target.value)}
                  rows={5}
                />
              </div>

              <div className="formulario-campo">
                <label className="campo-label">
                  Evidências ou resultados mensuráveis <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Quais números, métricas ou fatos demonstram o impacto?
                </p>
                <textarea
                  className="campo-textarea"
                  placeholder="Informe métricas, números ou fatos que comprovam o impacto..."
                  value={formulario.evidencias}
                  onChange={(e) => handleInputChange('evidencias', e.target.value)}
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
                  className={`salvar-button ${formulario.descricao.trim() && formulario.impacto.trim() && formulario.evidencias.trim() ? 'enabled' : 'disabled'}`}
                  onClick={handleSalvarEntrega}
                  disabled={!formulario.descricao.trim() || !formulario.impacto.trim() || !formulario.evidencias.trim()}
                >
                  Salvar Entrega
                </button>
              </div>
            </div>
          )}

          <div className="entregas-lista">
            <h3 className="lista-title">
              {entregas.length > 0 ? `Minhas Entregas (${entregas.length})` : 'Nenhuma entrega registrada'}
            </h3>

            {entregas.length === 0 && !mostrarFormulario && (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p className="empty-text">Você ainda não registrou nenhuma entrega outstanding.</p>
                <p className="empty-subtext">Clique em "Adicionar Nova Entrega" para começar!</p>
              </div>
            )}

            {entregas.map((entrega) => (
              <div key={entrega.id} className="entrega-card">
                <div className="entrega-card-header">
                  <div className="entrega-data">
                    <span className="data-icon">📅</span>
                    <span className="data-text">{formatarData(entrega.created_at)}</span>
                  </div>
                </div>

                <div className="entrega-card-body">
                  <div className="entrega-secao">
                    <h4 className="secao-title">Descrição</h4>
                    <p className="secao-conteudo">{entrega.descricao}</p>
                  </div>

                  <div className="entrega-secao">
                    <h4 className="secao-title">Impacto gerado</h4>
                    <p className="secao-conteudo">{entrega.impacto}</p>
                  </div>

                  <div className="entrega-secao">
                    <h4 className="secao-title">Evidências ou resultados mensuráveis</h4>
                    <p className="secao-conteudo">{entrega.evidencias}</p>
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

export default EntregaOutstanding
