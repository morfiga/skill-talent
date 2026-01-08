import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { entregasOutstandingAPI } from '../services/api'
import { handleApiError } from '../utils/errorHandler'
import './EntregaOutstanding.css'
import './Page.css'

function EntregaOutstanding({ onLogout }) {
  const navigate = useNavigate()
  const { colaboradorId, colaborador } = useAuth()
  const { success, error: showError } = useToast()
  const isAdmin = colaborador?.is_admin || false
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [entregaEditando, setEntregaEditando] = useState(null)
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
      handleApiError(error, 'carregar entregas', '/entregas-outstanding', showError)
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
        if (entregaEditando) {
          // Editando uma entrega existente
          await entregasOutstandingAPI.update(entregaEditando.id, {
            descricao: formulario.descricao,
            impacto: formulario.impacto,
            evidencias: formulario.evidencias
          })
          success('Entrega atualizada com sucesso!')
        } else {
          // Criando nova entrega
          await entregasOutstandingAPI.create(colaboradorId, {
            descricao: formulario.descricao,
            impacto: formulario.impacto,
            evidencias: formulario.evidencias
          })
          success('Entrega registrada com sucesso!')
        }

        setFormulario({
          descricao: '',
          impacto: '',
          evidencias: ''
        })
        setMostrarFormulario(false)
        setEntregaEditando(null)
        await loadEntregas()
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.detail?.includes('pendente')) {
          showError('Esta entrega não pode ser editada pois já foi aprovada ou reprovada.')
          setMostrarFormulario(false)
          setEntregaEditando(null)
          await loadEntregas()
        } else {
          handleApiError(error, entregaEditando ? 'atualizar entrega' : 'salvar entrega', '/entregas-outstanding', showError)
        }
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
    setEntregaEditando(null)
  }

  const handleEditarEntrega = (entrega) => {
    setEntregaEditando(entrega)
    setFormulario({
      descricao: entrega.descricao,
      impacto: entrega.impacto,
      evidencias: entrega.evidencias
    })
    setMostrarFormulario(true)
  }

  const handleExcluirEntrega = async (entregaId) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrega? Esta ação não pode ser desfeita.')) {
      try {
        await entregasOutstandingAPI.delete(entregaId)
        await loadEntregas()
        success('Entrega excluída com sucesso!')
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.detail?.includes('pendente')) {
          showError('Esta entrega não pode ser excluída pois já foi aprovada ou reprovada.')
          await loadEntregas()
        } else {
          handleApiError(error, 'excluir entrega', '/entregas-outstanding', showError)
        }
      }
    }
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
              Queremos reconhecer entregas que foram além do esperado: aquelas que moveram a Ada de um jeito visível. São iniciativas que mudaram um processo, aceleraram resultados ou encantaram nossos clientes. Conte-nos o que você fez e por que isso merece destaque.
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
              <h3 className="formulario-title">{entregaEditando ? 'Editar Entrega Outstanding' : 'Nova Entrega Outstanding'}</h3>

              <div className="formulario-campo">
                <label className="campo-label">
                  O que você fez e por que considera essa entrega outstanding <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Dê contexto: qual problema você quis resolver, o que te motivou, e o que foi além do “escopo normal”.
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
                  Qual transformação essa entrega trouxe para o time, para nossos clientes ou para a Ada como um todo? <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Pense em termos de avanço de cultura, eficiência, receita, experiência do cliente, ou aprendizado coletivo.
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
                  Quais fatos, números ou indicadores mostram o impacto real dessa entrega? <span className="required">*</span>
                </label>
                <p className="campo-descricao">
                  Podem ser métricas com tempo, custo, conversão, aumento de receita, etc.
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
                  {entregaEditando ? 'Atualizar Entrega' : 'Salvar Entrega'}
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
                  <div className="entrega-header-left">
                    <div className="entrega-data">
                      <span className="data-icon">📅</span>
                      <span className="data-text">{formatarData(entrega.created_at)}</span>
                    </div>
                  </div>
                  <div className="entrega-header-right">
                    <div className={`status-badge status-${entrega.status_aprovacao || 'pendente'}`}>
                      {entrega.status_aprovacao === 'aprovado' && '✓ Aprovado'}
                      {entrega.status_aprovacao === 'reprovado' && '✗ Reprovado'}
                      {(!entrega.status_aprovacao || entrega.status_aprovacao === 'pendente') && '⏳ Pendente'}
                    </div>
                    <div className="entrega-actions">
                      <button
                        className="edit-button"
                        onClick={() => handleEditarEntrega(entrega)}
                        title="Editar entrega"
                        disabled={entrega.status_aprovacao !== 'pendente' && entrega.status_aprovacao}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleExcluirEntrega(entrega.id)}
                        title="Excluir entrega"
                        disabled={entrega.status_aprovacao !== 'pendente' && entrega.status_aprovacao}
                      >
                        🗑️
                      </button>
                    </div>
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

                  {entrega.observacao_aprovacao && (
                    <div className="entrega-secao observacao-aprovacao">
                      <h4 className="secao-title">
                        {entrega.status_aprovacao === 'aprovado' ? 'Observação da Aprovação' : 'Motivo da Reprovação'}
                      </h4>
                      <p className="secao-conteudo">{entrega.observacao_aprovacao}</p>
                      {entrega.aprovado_por && (
                        <p className="aprovado-info">
                          Por {entrega.aprovado_por.nome} em {formatarData(entrega.aprovado_em)}
                        </p>
                      )}
                    </div>
                  )}
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
