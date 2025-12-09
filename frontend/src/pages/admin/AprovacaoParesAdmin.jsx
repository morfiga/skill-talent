import { useEffect, useState } from 'react'
import Avatar from '../../components/Avatar'
import { useToast } from '../../contexts/ToastContext'
import { ciclosAPI, ciclosAvaliacaoAPI, colaboradoresAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'

function AprovacaoParesAdmin() {
  const { success, error: showError, warning } = useToast()
  const [cicloAprovacao, setCicloAprovacao] = useState(null)
  const [ciclosAvaliacaoLiderados, setCiclosAvaliacaoLiderados] = useState([])
  const [loading, setLoading] = useState(true)
  const [lideradoEditando, setLideradoEditando] = useState(null)
  const [paresSelecionados, setParesSelecionados] = useState([])
  const [colaboradoresDisponiveis, setColaboradoresDisponiveis] = useState([])
  const [mostrarFormularioPares, setMostrarFormularioPares] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCicloAprovacao()
  }, [])

  const loadCicloAprovacao = async () => {
    try {
      setLoading(true)
      setError(null)

      await loadColaboradoresParaPares()

      const response = await ciclosAPI.getAll()
      const ciclosAprovacao = (response.ciclos || []).filter(c => c.etapa_atual === 'aprovacao_pares')

      if (ciclosAprovacao.length > 0) {
        const ciclo = ciclosAprovacao[0]
        setCicloAprovacao(ciclo)
        await loadCiclosAvaliacaoLiderados(ciclo.id)
      } else {
        setCicloAprovacao(null)
        setCiclosAvaliacaoLiderados([])
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar ciclo de aprovação', '/ciclos', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const loadCiclosAvaliacaoLiderados = async (cicloId) => {
    try {
      const response = await ciclosAvaliacaoAPI.getLiderados(cicloId)
      setCiclosAvaliacaoLiderados(response.ciclos || [])
    } catch (err) {
      const { message } = handleApiError(err, 'carregar ciclos de avaliação dos liderados', '/ciclos-avaliacao/gestor/liderados', showError)
      setError(message)
    }
  }

  const loadColaboradoresParaPares = async () => {
    try {
      const response = await colaboradoresAPI.getAll()
      setColaboradoresDisponiveis(response.colaboradores || [])
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err)
    }
  }

  const handleEditarPares = async (cicloAvaliacao) => {
    setLideradoEditando(cicloAvaliacao)
    const paresIds = cicloAvaliacao.pares_selecionados?.map(ps => ps.par_id) || []
    setParesSelecionados(paresIds)
    await loadColaboradoresParaPares()
    setMostrarFormularioPares(true)
  }

  const handleTogglePar = (colaboradorId) => {
    setParesSelecionados(prev => {
      if (prev.includes(colaboradorId)) {
        return prev.filter(id => id !== colaboradorId)
      } else {
        if (prev.length < 4) {
          return [...prev, colaboradorId]
        }
        return prev
      }
    })
  }

  const handleSalvarPares = async () => {
    if (paresSelecionados.length !== 4) {
      warning('É necessário selecionar exatamente 4 pares')
      return
    }

    try {
      setError(null)
      await ciclosAvaliacaoAPI.updateParesLiderado(lideradoEditando.id, {
        pares_ids: paresSelecionados
      })
      success('Pares atualizados com sucesso!')
      handleCancelarPares()
      if (cicloAprovacao) {
        await loadCiclosAvaliacaoLiderados(cicloAprovacao.id)
      }
    } catch (err) {
      const { message } = handleApiError(err, 'salvar pares', '/ciclos-avaliacao/gestor/pares', showError)
      setError(message)
    }
  }

  const handleCancelarPares = () => {
    setLideradoEditando(null)
    setParesSelecionados([])
    setMostrarFormularioPares(false)
    setError(null)
  }

  return (
    <>
      <div className="admin-panel-header">
        <div>
          <h2 className="panel-title">Aprovação de Pares</h2>
          <p className="panel-subtitle">
            {cicloAprovacao
              ? `Aprove ou altere os pares escolhidos pelos seus liderados - ${cicloAprovacao.nome}`
              : 'Nenhum ciclo na etapa de aprovação de pares'}
          </p>
        </div>
      </div>

      {mostrarFormularioPares && lideradoEditando && (
        <div className="formulario-container">
          <h3 className="formulario-title">
            Editar pares de {lideradoEditando.colaborador?.nome || 'Liderado'}
          </h3>
          <p className="campo-descricao">
            Selecione exatamente 4 colaboradores como pares. Você pode alterar os pares escolhidos pelo liderado.
          </p>

          <div className="pares-info">
            <p className="pares-contador">
              Pares selecionados: {paresSelecionados.length} / 4
            </p>
            {paresSelecionados.length === 4 && (
              <p className="pares-confirmacao">
                ✓ Quantidade correta de pares selecionados
              </p>
            )}
          </div>

          <div className="pares-grid">
            {colaboradoresDisponiveis
              .filter(col => col.id !== lideradoEditando.colaborador_id)
              .map(col => {
                const isSelected = paresSelecionados.includes(col.id)
                return (
                  <div
                    key={col.id}
                    className={`par-card ${isSelected ? 'selecionado' : ''}`}
                    onClick={() => handleTogglePar(col.id)}
                  >
                    <Avatar
                      avatar={col.avatar}
                      nome={col.nome}
                      size={40}
                    />
                    <div className="par-info">
                      <div className="par-nome">{col.nome}</div>
                      <div className="par-cargo">{col.cargo || '-'}</div>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="formulario-actions">
            <button className="cancelar-button" onClick={handleCancelarPares}>
              Cancelar
            </button>
            <button
              className={`salvar-button ${paresSelecionados.length === 4 ? 'enabled' : 'disabled'}`}
              onClick={handleSalvarPares}
              disabled={paresSelecionados.length !== 4}
            >
              Salvar Pares
            </button>
          </div>
        </div>
      )}

      <div className="colaboradores-lista">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p className="empty-text">Carregando dados de aprovação...</p>
          </div>
        ) : !cicloAprovacao ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p className="empty-text">
              Nenhum ciclo está na etapa de aprovação de pares no momento.
            </p>
            <p className="secao-subtitulo">
              Avance um ciclo para a etapa "Aprovação de Pares" para gerenciar os pares dos liderados.
            </p>
          </div>
        ) : ciclosAvaliacaoLiderados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p className="empty-text">
              Nenhum liderado encontrado ou nenhum liderado selecionou pares ainda.
            </p>
          </div>
        ) : (
          <>
            <h3 className="lista-title">
              Liderados ({ciclosAvaliacaoLiderados.length})
            </h3>
            <div className="table-container">
              <table className="colaboradores-table">
                <thead>
                  <tr>
                    <th>Colaborador</th>
                    <th>Pares Selecionados</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ciclosAvaliacaoLiderados.map((cicloAvaliacao) => {
                    const pares = cicloAvaliacao.pares_selecionados || []
                    return (
                      <tr key={cicloAvaliacao.id}>
                        <td>
                          <div className="colaborador-com-avatar">
                            <Avatar
                              avatar={cicloAvaliacao.colaborador?.avatar}
                              nome={cicloAvaliacao.colaborador?.nome}
                              size={50}
                            />
                            <div className="colaborador-detalhes">
                              <div className="colaborador-nome">
                                {cicloAvaliacao.colaborador?.nome}
                              </div>
                              <div className="colaborador-email">
                                {cicloAvaliacao.colaborador?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="pares-badges">
                            {pares.length > 0 ? (
                              pares.map((parSelecionado) => {
                                const par = colaboradoresDisponiveis.find(c => c.id === parSelecionado.par_id) ||
                                  (parSelecionado.par ? {
                                    id: parSelecionado.par_id,
                                    nome: parSelecionado.par.nome || `ID: ${parSelecionado.par_id}`,
                                    avatar: parSelecionado.par.avatar,
                                    cargo: parSelecionado.par.cargo
                                  } : null)
                                return par ? (
                                  <span key={parSelecionado.id} className="par-badge">
                                    <Avatar
                                      avatar={par.avatar}
                                      nome={par.nome}
                                      size={24}
                                    />
                                    {par.nome}
                                  </span>
                                ) : (
                                  <span key={parSelecionado.id} className="par-vazio">
                                    ID: {parSelecionado.par_id}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="par-vazio">Nenhum par selecionado</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="colaborador-actions">
                            <button
                              className="action-button edit"
                              onClick={() => handleEditarPares(cicloAvaliacao)}
                              title="Editar Pares"
                            >
                              ✏️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default AprovacaoParesAdmin
