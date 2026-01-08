import { useEffect, useState } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { entregasOutstandingAPI } from '../../../services/api'
import { handleApiError } from '../../../utils/errorHandler'

function ListaEntregasOutstanding({ colaboradorId }) {
  const { error: showError, success: showSuccess } = useToast()
  const [entregas, setEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [selectedEntrega, setSelectedEntrega] = useState(null)
  const [observacao, setObservacao] = useState('')

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

  const handleAprovar = (entrega) => {
    setSelectedEntrega(entrega)
    setModalAction('aprovar')
    setObservacao('')
    setShowModal(true)
  }

  const handleReprovar = (entrega) => {
    setSelectedEntrega(entrega)
    setModalAction('reprovar')
    setObservacao('')
    setShowModal(true)
  }

  const confirmarAcao = async () => {
    if (modalAction === 'reprovar' && !observacao.trim()) {
      showError('Observação é obrigatória para reprovar')
      return
    }

    try {
      if (modalAction === 'aprovar') {
        await entregasOutstandingAPI.aprovar(selectedEntrega.id, { observacao: observacao || null })
      } else {
        await entregasOutstandingAPI.reprovar(selectedEntrega.id, { observacao })
      }

      showSuccess(
        `Entrega ${modalAction === 'aprovar' ? 'aprovada' : 'reprovada'} com sucesso!`
      )

      setShowModal(false)
      setSelectedEntrega(null)
      setObservacao('')
      loadEntregas()
    } catch (error) {
      handleApiError(error, `${modalAction} entrega`, '/entregas-outstanding', showError)
    }
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

  const getStatusBadge = (status) => {
    const statusMap = {
      pendente: { label: '⏳ Pendente', class: 'status-pendente' },
      aprovado: { label: '✓ Aprovado', class: 'status-aprovado' },
      reprovado: { label: '✗ Reprovado', class: 'status-reprovado' }
    }
    const statusInfo = statusMap[status] || statusMap.pendente
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>
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
          const isPendente = !entrega.status_aprovacao || entrega.status_aprovacao === 'pendente'
          
          return (
            <div key={entrega.id} className="entrega-card">
              <div className="entrega-header">
                <div className="entrega-info">
                  <div className="entrega-top-line">
                    <div className="entrega-data">
                      {formatDate(entrega.created_at)}
                    </div>
                    {getStatusBadge(entrega.status_aprovacao)}
                  </div>
                  <div className="entrega-descricao-preview">
                    {entrega.descricao}
                  </div>
                </div>
                <div className="entrega-actions-column">
                  <button
                    className="action-button"
                    onClick={() => toggleExpanded(entrega.id)}
                  >
                    {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                  </button>
                  {isPendente && (
                    <div className="aprovacao-buttons">
                      <button
                        className="btn-aprovar-mini"
                        onClick={() => handleAprovar(entrega)}
                        title="Aprovar entrega"
                      >
                        ✓ Aprovar
                      </button>
                      <button
                        className="btn-reprovar-mini"
                        onClick={() => handleReprovar(entrega)}
                        title="Reprovar entrega"
                      >
                        ✗ Reprovar
                      </button>
                    </div>
                  )}
                </div>
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
                  {entrega.observacao_aprovacao && (
                    <div className="entrega-secao observacao-aprovacao">
                      <h5 className="entrega-label">
                        {entrega.status_aprovacao === 'aprovado' ? 'Observação da Aprovação:' : 'Motivo da Reprovação:'}
                      </h5>
                      <p className="entrega-texto">{entrega.observacao_aprovacao}</p>
                      {entrega.aprovado_por && (
                        <p className="aprovado-info">
                          Por {entrega.aprovado_por.nome} em {formatDate(entrega.aprovado_em)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="modal-overlay-mini" onClick={() => setShowModal(false)}>
          <div className="modal-content-mini" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-mini">
              <h3 className="modal-title-mini">
                {modalAction === 'aprovar' ? 'Aprovar' : 'Reprovar'} Entrega
              </h3>
              <button className="modal-close-mini" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body-mini">
              <div className="entrega-resumo-mini">
                <p><strong>Descrição:</strong> {selectedEntrega?.descricao}</p>
              </div>

              <div className="form-group-mini">
                <label className="form-label-mini">
                  Observação {modalAction === 'reprovar' && <span className="required">*</span>}
                </label>
                <textarea
                  className="form-textarea-mini"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder={
                    modalAction === 'aprovar'
                      ? 'Observação opcional...'
                      : 'Informe o motivo da reprovação...'
                  }
                  rows={3}
                  required={modalAction === 'reprovar'}
                />
              </div>
            </div>

            <div className="modal-footer-mini">
              <button className="btn-secondary-mini" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                className={modalAction === 'aprovar' ? 'btn-primary-mini' : 'btn-danger-mini'}
                onClick={confirmarAcao}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .entrega-top-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
        }

        .status-pendente {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffc107;
        }

        .status-aprovado {
          background: #d4edda;
          color: #155724;
          border: 1px solid #28a745;
        }

        .status-reprovado {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #dc3545;
        }

        .entrega-actions-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }

        .aprovacao-buttons {
          display: flex;
          gap: 6px;
        }

        .btn-aprovar-mini,
        .btn-reprovar-mini {
          padding: 4px 10px;
          border: none;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-aprovar-mini {
          background: #10b981;
          color: white;
        }

        .btn-aprovar-mini:hover {
          background: #059669;
        }

        .btn-reprovar-mini {
          background: #ef4444;
          color: white;
        }

        .btn-reprovar-mini:hover {
          background: #dc2626;
        }

        .observacao-aprovacao {
          background: #fff9e6;
          border-left: 3px solid #ffc107;
          padding-left: 12px;
        }

        .aprovado-info {
          font-size: 0.75rem;
          color: #666;
          margin-top: 6px;
          font-style: italic;
        }

        .modal-overlay-mini {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .modal-content-mini {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title-mini {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .modal-close-mini {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .modal-close-mini:hover {
          background: #f3f4f6;
        }

        .modal-body-mini {
          padding: 1.25rem;
        }

        .entrega-resumo-mini {
          background: #f9fafb;
          padding: 0.875rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .entrega-resumo-mini p {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
        }

        .form-group-mini {
          margin-bottom: 1rem;
        }

        .form-label-mini {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .required {
          color: #ef4444;
        }

        .form-textarea-mini {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
        }

        .form-textarea-mini:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer-mini {
          display: flex;
          justify-content: flex-end;
          gap: 0.625rem;
          padding: 1.25rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-secondary-mini,
        .btn-primary-mini,
        .btn-danger-mini {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary-mini {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary-mini:hover {
          background: #e5e7eb;
        }

        .btn-primary-mini {
          background: #3b82f6;
          color: white;
        }

        .btn-primary-mini:hover {
          background: #2563eb;
        }

        .btn-danger-mini {
          background: #ef4444;
          color: white;
        }

        .btn-danger-mini:hover {
          background: #dc2626;
        }

        @media (max-width: 768px) {
          .aprovacao-buttons {
            flex-direction: column;
          }

          .modal-content-mini {
            width: 95%;
          }
        }
      `}</style>
    </div>
  )
}

export default ListaEntregasOutstanding
