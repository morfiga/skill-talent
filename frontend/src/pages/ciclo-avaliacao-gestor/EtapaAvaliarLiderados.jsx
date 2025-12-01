import { useCallback, useEffect, useState } from 'react'
import Avatar from '../../components/Avatar'
import { avaliacoesAPI, colaboradoresAPI, eixosAvaliacaoAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAvaliarLiderados({ colaboradorId, cicloAberto, onIniciarAvaliacao, onVoltar }) {
  const [liderados, setLiderados] = useState([])
  const [avaliacoesLiderados, setAvaliacoesLiderados] = useState({})
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [loading, setLoading] = useState(true)

  const loadEixosAvaliacao = useCallback(async () => {
    try {
      const response = await eixosAvaliacaoAPI.getAll()
      setEixosAvaliacao(response.eixos || [])
    } catch (error) {
      console.error('Erro ao carregar eixos:', error)
    }
  }, [])

  const loadAvaliacoesLiderados = useCallback(async () => {
    if (!cicloAberto) return

    try {
      const response = await avaliacoesAPI.getAll({
        ciclo_id: cicloAberto.id,
        avaliador_id: colaboradorId,
        tipo: 'gestor'
      })
      const avaliacoes = response.avaliacoes || []

      const lideradosObj = {}
      avaliacoes.forEach(avaliacao => {
        const eixosObj = {}
        avaliacao.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        lideradosObj[avaliacao.avaliado_id] = {
          eixos: eixosObj,
          avaliacaoGeral: avaliacao.avaliacao_geral || ''
        }
      })
      setAvaliacoesLiderados(lideradosObj)
    } catch (error) {
      console.error('Erro ao carregar avaliações de liderados:', error)
    }
  }, [cicloAberto, colaboradorId])

  const loadLiderados = useCallback(async () => {
    if (!colaboradorId) return

    try {
      setLoading(true)
      const response = await colaboradoresAPI.getLiderados(colaboradorId)
      setLiderados(response.colaboradores || [])

      // Carregar avaliações existentes
      await loadAvaliacoesLiderados()
    } catch (error) {
      console.error('Erro ao carregar liderados:', error)
      alert('Erro ao carregar liderados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [colaboradorId, loadAvaliacoesLiderados])

  useEffect(() => {
    loadEixosAvaliacao()
  }, [loadEixosAvaliacao])

  useEffect(() => {
    loadLiderados()
  }, [loadLiderados])

  const getStatusAvaliacaoLiderado = (colaboradorId) => {
    const avaliacao = avaliacoesLiderados[colaboradorId]
    if (!avaliacao) return 'pendente'

    const completa = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = avaliacao.eixos[eixo.id.toString()]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    }) && avaliacao.avaliacaoGeral.trim() !== ''

    return completa ? 'concluida' : 'em-andamento'
  }

  if (loading) {
    return <div>Carregando liderados...</div>
  }

  const lideradosComStatus = liderados.map(liderado => ({
    ...liderado,
    status: getStatusAvaliacaoLiderado(liderado.id)
  }))

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Avaliar Liderados</h2>
        <p className="ciclo-step-description">
          Avalie seus liderados em cada eixo e forneça feedback construtivo
        </p>
      </div>

      <div className="pares-avaliar-section">
        <h3 className="pares-avaliar-title">Liderados para Avaliar</h3>
        {lideradosComStatus.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            Você não possui liderados cadastrados.
          </p>
        ) : (
          <div className="pares-avaliar-grid">
            {lideradosComStatus.map((liderado) => {
              const status = liderado.status
              const statusLabels = {
                pendente: 'Pendente',
                'em-andamento': 'Em andamento',
                concluida: 'Concluída'
              }
              const statusColors = {
                pendente: '#ff9800',
                'em-andamento': '#50e550',
                concluida: '#4caf50'
              }

              return (
                <div
                  key={liderado.id}
                  className="par-avaliar-card"
                  onClick={() => onIniciarAvaliacao(liderado)}
                >
                  <Avatar
                    avatar={liderado.avatar}
                    nome={liderado.nome}
                    size={60}
                    className="par-avaliar-avatar"
                  />
                  <div className="par-avaliar-info">
                    <p className="par-avaliar-nome">{liderado.nome}</p>
                    <p className="par-avaliar-cargo">{liderado.cargo}</p>
                    <p className="par-avaliar-departamento">{liderado.departamento}</p>
                  </div>
                  <div
                    className="par-avaliar-status"
                    style={{ backgroundColor: statusColors[status] + '20', color: statusColors[status] }}
                  >
                    {statusLabels[status]}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="ciclo-actions">
        {onVoltar && (
          <button className="voltar-button" onClick={onVoltar}>
            ← Voltar
          </button>
        )}
      </div>
    </>
  )
}

export default EtapaAvaliarLiderados
