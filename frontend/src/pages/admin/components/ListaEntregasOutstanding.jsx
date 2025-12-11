import { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { entregasOutstandingAPI } from '../../../services/api'
import { handleApiError } from '../../../utils/errorHandler'

function ListaEntregasOutstanding({ colaboradorId }) {
  const { error: showError } = useToast()
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState({})

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
      handleApiError(error, 'carregar entregas outstanding', '/entregas-outstanding', showError)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (entregaId) => {
    setExpandidos(prev => ({
      ...prev,
      [entregaId]: !prev[entregaId]
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="entregas-container">
        <h4 className="secao-titulo-menor">🚀 Entregas Outstanding</h4>
        <div className="empty-state-pequeno">
          <p className="empty-text-pequeno">Carregando entregas...</p>
        </div>
      </div>
    )
  }

  if (entregas.length === 0) {
    return (
      <div className="entregas-container">
        <h4 className="secao-titulo-menor">🚀 Entregas Outstanding</h4>
        <div className="empty-state-pequeno">
          <p className="empty-text-pequeno">Nenhuma entrega outstanding registrada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="entregas-container">
      <h4 className="secao-titulo-menor">🚀 Entregas Outstanding ({entregas.length})</h4>
      <div className="entregas-lista">
        {entregas.map((entrega) => {
          const isExpanded = expandidos[entrega.id] || false
          return (
            <div key={entrega.id} className="entrega-card">
              <div className="entrega-header">
                <div className="entrega-info">
                  <div className="entrega-data">
                    {formatDate(entrega.created_at)}
                  </div>
                  <div className="entrega-descricao-preview">
                    {entrega.descricao}
                  </div>
                </div>
                <button
                  className="action-button"
                  onClick={() => toggleExpanded(entrega.id)}
                >
                  {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                </button>
              </div>

              {isExpanded && (
                <div className="entrega-detalhes">
                  <div className="entrega-secao">
                    <h5 className="entrega-label">Descrição:</h5>
                    <p className="entrega-texto">{entrega.descricao}</p>
                  </div>
                  <div className="entrega-secao">
                    <h5 className="entrega-label">Impacto:</h5>
                    <p className="entrega-texto">{entrega.impacto}</p>
                  </div>
                  <div className="entrega-secao">
                    <h5 className="entrega-label">Evidências:</h5>
                    <p className="entrega-texto">{entrega.evidencias}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ListaEntregasOutstanding

