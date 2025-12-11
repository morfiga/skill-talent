import { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { registrosValorAPI } from '../../../services/api'
import { handleApiError } from '../../../utils/errorHandler'

function ListaRegistrosValor({ colaboradorId }) {
  const { error: showError } = useToast()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState({})

  useEffect(() => {
    if (colaboradorId) {
      loadRegistros()
    }
  }, [colaboradorId])

  const loadRegistros = async () => {
    try {
      setLoading(true)
      const response = await registrosValorAPI.getAll({ colaborador_id: colaboradorId })
      setRegistros(response.registros || [])
    } catch (error) {
      handleApiError(error, 'carregar registros de valor', '/registros-valor', showError)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (registroId) => {
    setExpandidos(prev => ({
      ...prev,
      [registroId]: !prev[registroId]
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
      <div className="registros-container">
        <h4 className="secao-titulo-menor">💎 Registros de Valor</h4>
        <div className="empty-state-pequeno">
          <p className="empty-text-pequeno">Carregando registros...</p>
        </div>
      </div>
    )
  }

  if (registros.length === 0) {
    return (
      <div className="registros-container">
        <h4 className="secao-titulo-menor">💎 Registros de Valor</h4>
        <div className="empty-state-pequeno">
          <p className="empty-text-pequeno">Nenhum registro de valor encontrado.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="registros-container">
      <h4 className="secao-titulo-menor">💎 Registros de Valor ({registros.length})</h4>
      <div className="registros-lista">
        {registros.map((registro) => {
          const isExpanded = expandidos[registro.id] || false
          return (
            <div key={registro.id} className="registro-card">
              <div className="registro-header">
                <div className="registro-info">
                  <div className="registro-data">
                    {formatDate(registro.created_at)}
                  </div>
                  <div className="registro-valores">
                    {registro.valores && registro.valores.length > 0 ? (
                      <div className="valores-tags">
                        {registro.valores.map((valor, idx) => (
                          <span key={idx} className="valor-tag">
                            {valor.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="sem-valores">Sem valores associados</span>
                    )}
                  </div>
                  <div className="registro-descricao-preview">
                    {registro.descricao}
                  </div>
                </div>
                <button
                  className="action-button"
                  onClick={() => toggleExpanded(registro.id)}
                >
                  {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                </button>
              </div>

              {isExpanded && (
                <div className="registro-detalhes">
                  <div className="registro-secao">
                    <h5 className="registro-label">Descrição:</h5>
                    <p className="registro-texto">{registro.descricao}</p>
                  </div>
                  <div className="registro-secao">
                    <h5 className="registro-label">Impacto:</h5>
                    <p className="registro-texto">{registro.impacto}</p>
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

export default ListaRegistrosValor

