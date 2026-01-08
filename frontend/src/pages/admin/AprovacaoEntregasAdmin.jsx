import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { registrosValorAPI } from '../../services/api'

function AprovacaoEntregasAdmin() {
    const [registros, setRegistros] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedRegistro, setSelectedRegistro] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [modalAction, setModalAction] = useState(null) // 'aprovar' ou 'reprovar'
    const [observacao, setObservacao] = useState('')
    const { showToast } = useToast()

    useEffect(() => {
        carregarRegistrosPendentes()
    }, [])

    const carregarRegistrosPendentes = async () => {
        try {
            setLoading(true)
            const response = await registrosValorAPI.getAdminPendentes()
            setRegistros(response.registros || [])
        } catch (error) {
            console.error('Erro ao carregar registros pendentes:', error)
            showToast('Erro ao carregar registros pendentes', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleAprovar = (registro) => {
        setSelectedRegistro(registro)
        setModalAction('aprovar')
        setObservacao('')
        setShowModal(true)
    }

    const handleReprovar = (registro) => {
        setSelectedRegistro(registro)
        setModalAction('reprovar')
        setObservacao('')
        setShowModal(true)
    }

    const confirmarAcao = async () => {
        if (modalAction === 'reprovar' && !observacao.trim()) {
            showToast('Observação é obrigatória para reprovar', 'error')
            return
        }

        try {
            if (modalAction === 'aprovar') {
                await registrosValorAPI.aprovar(selectedRegistro.id, { observacao: observacao || null })
            } else {
                await registrosValorAPI.reprovar(selectedRegistro.id, { observacao })
            }

            showToast(
                `Registro ${modalAction === 'aprovar' ? 'aprovado' : 'reprovado'} com sucesso!`,
                'success'
            )

            setShowModal(false)
            setSelectedRegistro(null)
            setObservacao('')
            carregarRegistrosPendentes()
        } catch (error) {
            console.error(`Erro ao ${modalAction} registro:`, error)
            showToast(
                error.response?.data?.detail || `Erro ao ${modalAction} registro`,
                'error'
            )
        }
    }

    const formatarData = (dataString) => {
        if (!dataString) return '-'
        const data = new Date(dataString)
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="admin-section">
                <div className="section-header">
                    <h2 className="section-title">Aprovação de Entregas de Valor</h2>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <p className="empty-text">Carregando registros...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="admin-section">
            <div className="section-header">
                <h2 className="section-title">Aprovação de Entregas de Valor</h2>
                <p className="section-subtitle">
                    {registros.length} {registros.length === 1 ? 'registro pendente' : 'registros pendentes'}
                </p>
            </div>

            {registros.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">✅</div>
                    <p className="empty-text">Nenhum registro pendente de aprovação</p>
                </div>
            ) : (
                <div className="registros-grid">
                    {registros.map((registro) => (
                        <div key={registro.id} className="registro-card">
                            <div className="registro-header">
                                <div className="colaborador-info">
                                    <h3 className="colaborador-nome">{registro.colaborador?.nome}</h3>
                                    <span className="colaborador-cargo">{registro.colaborador?.cargo}</span>
                                </div>
                                <span className="registro-data">{formatarData(registro.created_at)}</span>
                            </div>

                            <div className="registro-valores">
                                {registro.valores?.map((valor) => (
                                    <span key={valor.id} className="valor-badge">
                                        {valor.icone} {valor.nome}
                                    </span>
                                ))}
                            </div>

                            <div className="registro-content">
                                <div className="registro-field">
                                    <label className="field-label">Descrição:</label>
                                    <p className="field-text">{registro.descricao}</p>
                                </div>

                                <div className="registro-field">
                                    <label className="field-label">Impacto:</label>
                                    <p className="field-text">{registro.impacto}</p>
                                </div>
                            </div>

                            <div className="registro-actions">
                                <button
                                    className="btn-aprovar"
                                    onClick={() => handleAprovar(registro)}
                                >
                                    ✓ Aprovar
                                </button>
                                <button
                                    className="btn-reprovar"
                                    onClick={() => handleReprovar(registro)}
                                >
                                    ✗ Reprovar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {modalAction === 'aprovar' ? 'Aprovar' : 'Reprovar'} Registro
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="registro-resumo">
                                <p><strong>Colaborador:</strong> {selectedRegistro?.colaborador?.nome}</p>
                                <p><strong>Descrição:</strong> {selectedRegistro?.descricao}</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Observação {modalAction === 'reprovar' && <span className="required">*</span>}
                                </label>
                                <textarea
                                    className="form-textarea"
                                    value={observacao}
                                    onChange={(e) => setObservacao(e.target.value)}
                                    placeholder={
                                        modalAction === 'aprovar'
                                            ? 'Observação opcional...'
                                            : 'Informe o motivo da reprovação...'
                                    }
                                    rows={4}
                                    required={modalAction === 'reprovar'}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                Cancelar
                            </button>
                            <button
                                className={modalAction === 'aprovar' ? 'btn-primary' : 'btn-danger'}
                                onClick={confirmarAcao}
                            >
                                Confirmar {modalAction === 'aprovar' ? 'Aprovação' : 'Reprovação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
        .registros-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .registro-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          transition: box-shadow 0.2s;
        }

        .registro-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .registro-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .colaborador-info {
          flex: 1;
        }

        .colaborador-nome {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 0.25rem 0;
        }

        .colaborador-cargo {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .registro-data {
          font-size: 0.875rem;
          color: #6b7280;
          white-space: nowrap;
        }

        .registro-valores {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .valor-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: #f3f4f6;
          border-radius: 9999px;
          font-size: 0.875rem;
          color: #374151;
        }

        .registro-content {
          margin-bottom: 1rem;
        }

        .registro-field {
          margin-bottom: 1rem;
        }

        .registro-field:last-child {
          margin-bottom: 0;
        }

        .field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .field-text {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0;
        }

        .registro-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-aprovar,
        .btn-reprovar {
          flex: 1;
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-aprovar {
          background: #10b981;
          color: white;
        }

        .btn-aprovar:hover {
          background: #059669;
        }

        .btn-reprovar {
          background: #ef4444;
          color: white;
        }

        .btn-reprovar:hover {
          background: #dc2626;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .modal-close {
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

        .modal-close:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .registro-resumo {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .registro-resumo p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: #374151;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .required {
          color: #ef4444;
        }

        .form-textarea {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: inherit;
          resize: vertical;
        }

        .form-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-secondary,
        .btn-primary,
        .btn-danger {
          padding: 0.625rem 1.25rem;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        @media (max-width: 768px) {
          .registros-grid {
            grid-template-columns: 1fr;
          }

          .modal-content {
            width: 95%;
          }
        }
      `}</style>
        </div>
    )
}

export default AprovacaoEntregasAdmin

