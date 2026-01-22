import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { ciclosAPI, colaboradoresAPI, feedbackLiberacaoAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import EtapaFeedbackGestor from '../ciclo-avaliacao-gestor/EtapaFeedbackGestor'
import EtapaFeedback from '../ciclo-avaliacao/EtapaFeedback'
import TabelaFeedback from './components/TabelaFeedback'

function FeedbackAdmin() {
  const { success: showSuccess, error: showError } = useToast()
  const [ciclos, setCiclos] = useState([])
  const [cicloSelecionado, setCicloSelecionado] = useState(null)
  const [colaboradores, setColaboradores] = useState([])
  const [liberacoes, setLiberacoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState(null)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null)
  const [modoVisualizacao, setModoVisualizacao] = useState('colaborador') // 'colaborador' ou 'gestor'

  useEffect(() => {
    loadCiclos()
  }, [])

  useEffect(() => {
    if (cicloSelecionado) {
      loadDados()
    }
  }, [cicloSelecionado])

  const loadCiclos = async () => {
    try {
      setLoading(true)
      const response = await ciclosAPI.getAll()
      const ciclosFeedback = (response.ciclos || []).filter(c =>
        c.etapa_atual === 'feedback'
      )
      setCiclos(ciclosFeedback)

      if (ciclosFeedback.length > 0) {
        setCicloSelecionado(ciclosFeedback[0])
      }
    } catch (err) {
      handleApiError(err, 'carregar ciclos', '/ciclos', showError)
    } finally {
      setLoading(false)
    }
  }

  const loadDados = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar colaboradores
      const colaboradoresResponse = await colaboradoresAPI.getAll()
      const todosColaboradores = colaboradoresResponse.colaboradores || []
      setColaboradores(todosColaboradores)

      // Carregar liberações
      try {
        const liberacoesResponse = await feedbackLiberacaoAPI.getByCiclo(cicloSelecionado.id)
        setLiberacoes(liberacoesResponse.liberacoes || [])
      } catch (err) {
        // Se não houver liberações ainda, usar array vazio
        if (err.status === 404) {
          setLiberacoes([])
        } else {
          throw err
        }
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar dados', '/feedback-liberacao', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeCiclo = (cicloId) => {
    const ciclo = ciclos.find(c => c.id === parseInt(cicloId))
    if (ciclo) {
      setCicloSelecionado(ciclo)
      setColaboradorSelecionado(null)
    }
  }

  const handleVisualizarFeedback = (colaborador, modo) => {
    setColaboradorSelecionado(colaborador)
    setModoVisualizacao(modo)
  }

  const handleVoltar = () => {
    setColaboradorSelecionado(null)
  }

  const handleLiberar = async (colaboradorId) => {
    try {
      setLoading(true)
      await feedbackLiberacaoAPI.liberar(cicloSelecionado.id, colaboradorId)
      showSuccess('Feedback liberado com sucesso!')
      await loadDados()
    } catch (err) {
      handleApiError(err, 'liberar feedback', '/feedback-liberacao', showError)
    } finally {
      setLoading(false)
    }
  }

  const handleRevogar = async (colaboradorId) => {
    try {
      setLoading(true)
      await feedbackLiberacaoAPI.revogar(cicloSelecionado.id, colaboradorId)
      showSuccess('Feedback revogado com sucesso!')
      await loadDados()
    } catch (err) {
      handleApiError(err, 'revogar feedback', '/feedback-liberacao', showError)
    } finally {
      setLoading(false)
    }
  }

  // Criar mapa de liberações por colaborador
  const liberacoesMap = liberacoes.reduce((map, lib) => {
    map[lib.colaborador_id] = lib
    return map
  }, {})

  // Adicionar status de liberação aos colaboradores
  const colaboradoresComStatus = colaboradores.map(col => ({
    ...col,
    feedback_liberado: liberacoesMap[col.id]?.liberado || false,
    liberacao: liberacoesMap[col.id] || null
  }))

  const colaboradoresFiltrados = colaboradoresComStatus.filter(col =>
    col.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.email?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.cargo?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.departamento?.toLowerCase().includes(filtro.toLowerCase())
  )

  const totalLiberados = colaboradoresComStatus.filter(c => c.feedback_liberado).length
  const totalPendentes = colaboradoresComStatus.length - totalLiberados

  // Se um colaborador foi selecionado, mostrar a visualização do feedback
  if (colaboradorSelecionado) {
    if (modoVisualizacao === 'colaborador') {
      return (
        <div>
          <div className="admin-panel-header" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="voltar-button" onClick={handleVoltar}>
                ← Voltar
              </button>
              <div>
                <h2 className="panel-title" style={{ margin: 0 }}>Feedback - {colaboradorSelecionado.nome}</h2>
                <p className="panel-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Visualização do feedback como colaborador no ciclo "{cicloSelecionado?.nome}"
                </p>
              </div>
            </div>
          </div>
          <EtapaFeedback
            colaborador={colaboradorSelecionado}
            cicloAberto={cicloSelecionado}
            isAdminView={true}
          />
        </div>
      )
    } else {
      return (
        <div>
          <div className="admin-panel-header" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="voltar-button" onClick={handleVoltar}>
                ← Voltar
              </button>
              <div>
                <h2 className="panel-title" style={{ margin: 0 }}>Feedback - {colaboradorSelecionado.nome}</h2>
                <p className="panel-subtitle" style={{ margin: '4px 0 0 0' }}>
                  Visualização do feedback como gestor no ciclo "{cicloSelecionado?.nome}"
                </p>
              </div>
            </div>
          </div>
          <EtapaFeedbackGestor
            colaborador={colaboradorSelecionado}
            cicloAberto={cicloSelecionado}
            isAdminView={true}
          />
        </div>
      )
    }
  }

  return (
    <>
      <div className="admin-panel-header">
        <div>
          <h2 className="panel-title">Feedbacks</h2>
          <p className="panel-subtitle">
            {cicloSelecionado
              ? `Libere e visualize o feedback dos colaboradores no ciclo "${cicloSelecionado.nome}"`
              : 'Selecione um ciclo na etapa de feedback'}
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && !cicloSelecionado ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p className="empty-text">Carregando ciclos...</p>
        </div>
      ) : !cicloSelecionado ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-text">
            Nenhum ciclo na etapa de feedback encontrado.
          </p>
          <p className="secao-subtitulo">
            Avance um ciclo para a etapa de "Feedback" para poder liberar os feedbacks.
          </p>
        </div>
      ) : (
        <>
          <div className="admin-filtros filtros-com-select">
            <select
              className="campo-input select-ciclo"
              value={cicloSelecionado?.id || ''}
              onChange={(e) => handleChangeCiclo(e.target.value)}
            >
              {ciclos.map(ciclo => (
                <option key={ciclo.id} value={ciclo.id}>
                  {ciclo.nome}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="filtro-input filtro-expandido"
              placeholder="Buscar colaborador..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>

          {/* Resumo de status */}
          <div className="stats-container" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-value">{totalLiberados}</div>
              <div className="stat-label">✅ Liberados</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalPendentes}</div>
              <div className="stat-label">⏳ Pendentes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{colaboradores.length}</div>
              <div className="stat-label">👥 Total</div>
            </div>
          </div>

          {colaboradoresFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p className="empty-text">
                {filtro
                  ? 'Nenhum colaborador encontrado com o filtro aplicado.'
                  : 'Nenhum colaborador encontrado.'}
              </p>
            </div>
          ) : (
            <TabelaFeedback
              colaboradores={colaboradoresFiltrados}
              onLiberar={handleLiberar}
              onRevogar={handleRevogar}
              onVisualizarFeedback={handleVisualizarFeedback}
              colaboradorId={colaboradorSelecionado?.id}
              loading={loading}
            />
          )}
        </>
      )}
    </>
  )
}

export default FeedbackAdmin

