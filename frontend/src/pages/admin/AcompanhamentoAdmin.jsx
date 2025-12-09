import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { ciclosAPI, colaboradoresAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import TabelaAcompanhamentoColaboradores from './components/TabelaAcompanhamentoColaboradores'
import TabelaAcompanhamentoGestores from './components/TabelaAcompanhamentoGestores'

function AcompanhamentoAdmin() {
  const { error: showError } = useToast()
  const [ciclos, setCiclos] = useState([])
  const [cicloAcompanhamento, setCicloAcompanhamento] = useState(null)
  const [dadosAcompanhamento, setDadosAcompanhamento] = useState(null)
  const [todosColaboradores, setTodosColaboradores] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAcompanhamento()
  }, [])

  const loadAcompanhamento = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar colaboradores para identificar gestores
      const colaboradoresResponse = await colaboradoresAPI.getAll()
      setTodosColaboradores(colaboradoresResponse.colaboradores || [])

      const response = await ciclosAPI.getAll()
      setCiclos(response.ciclos || [])

      const ciclosAtivos = (response.ciclos || []).filter(c =>
        c.status === 'aberto' || c.status === 'em_andamento'
      )

      if (ciclosAtivos.length > 0) {
        const ciclo = ciclosAtivos[0]
        setCicloAcompanhamento(ciclo)

        const acompanhamentoResponse = await ciclosAPI.getAcompanhamento(ciclo.id)
        setDadosAcompanhamento(acompanhamentoResponse)
      } else {
        setCicloAcompanhamento(null)
        setDadosAcompanhamento(null)
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar acompanhamento', '/ciclos/acompanhamento', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeCiclo = async (cicloId) => {
    try {
      setLoading(true)
      setError(null)

      const ciclo = ciclos.find(c => c.id === parseInt(cicloId))
      if (ciclo) {
        setCicloAcompanhamento(ciclo)
        const acompanhamentoResponse = await ciclosAPI.getAcompanhamento(ciclo.id)
        setDadosAcompanhamento(acompanhamentoResponse)
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar acompanhamento', '/ciclos/acompanhamento', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const colaboradoresFiltrados = (dadosAcompanhamento?.colaboradores || []).filter(col =>
    col.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.email?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.cargo?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.departamento?.toLowerCase().includes(filtro.toLowerCase())
  )

  const getEtapaLabel = (etapa) => {
    const labels = {
      'escolha_pares': 'Escolha de Pares',
      'aprovacao_pares': 'Aprovação de Pares',
      'avaliacoes': 'Avaliações',
      'calibracao': 'Calibração',
      'feedback': 'Feedback'
    }
    return labels[etapa] || etapa
  }

  return (
    <>
      <div className="admin-panel-header">
        <div>
          <h2 className="panel-title">Acompanhamento do Ciclo</h2>
          <p className="panel-subtitle">
            {cicloAcompanhamento
              ? `Acompanhe o progresso dos colaboradores no ciclo "${cicloAcompanhamento.nome}"`
              : 'Selecione um ciclo para ver o acompanhamento'}
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p className="empty-text">Carregando dados de acompanhamento...</p>
        </div>
      ) : !cicloAcompanhamento ? (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <p className="empty-text">
            Nenhum ciclo ativo encontrado.
          </p>
          <p className="secao-subtitulo">
            Crie um ciclo com status "Aberto" ou "Em Andamento" para ver o acompanhamento.
          </p>
        </div>
      ) : (
        <>
          <div className="admin-filtros filtros-com-select">
            <select
              className="campo-input select-ciclo"
              value={cicloAcompanhamento?.id || ''}
              onChange={(e) => handleChangeCiclo(e.target.value)}
            >
              {ciclos.filter(c => c.status === 'aberto' || c.status === 'em_andamento').map(ciclo => (
                <option key={ciclo.id} value={ciclo.id}>
                  {ciclo.nome} ({getEtapaLabel(ciclo.etapa_atual)})
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

          <div className="colaboradores-lista">
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
              <>
                {/* Separar gestores e colaboradores */}
                {(() => {
                  const gestoresIds = new Set(todosColaboradores.map(c => c.gestor_id).filter(Boolean))
                  const gestoresFiltrados = colaboradoresFiltrados.filter(c => gestoresIds.has(c.colaborador_id))
                  const colaboradoresSemGestorFiltrados = colaboradoresFiltrados.filter(c => !gestoresIds.has(c.colaborador_id))

                  return (
                    <>
                      <h3 className="lista-title">
                        👔 Gestores ({gestoresFiltrados.length})
                      </h3>

                      {gestoresFiltrados.length === 0 ? (
                        <div className="empty-state" style={{ marginBottom: '30px' }}>
                          <p className="empty-text">
                            {filtro ? 'Nenhum gestor encontrado com o filtro aplicado.' : 'Nenhum gestor encontrado.'}
                          </p>
                        </div>
                      ) : (
                        <TabelaAcompanhamentoGestores gestores={gestoresFiltrados} />
                      )}

                      <h3 className="lista-title">
                        👥 Colaboradores ({colaboradoresSemGestorFiltrados.length})
                      </h3>

                      {colaboradoresSemGestorFiltrados.length === 0 ? (
                        <div className="empty-state">
                          <p className="empty-text">
                            {filtro ? 'Nenhum colaborador encontrado com o filtro aplicado.' : 'Nenhum colaborador encontrado.'}
                          </p>
                        </div>
                      ) : (
                        <TabelaAcompanhamentoColaboradores colaboradores={colaboradoresSemGestorFiltrados} />
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default AcompanhamentoAdmin
