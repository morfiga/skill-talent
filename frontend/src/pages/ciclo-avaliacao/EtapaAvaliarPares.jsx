import { useCallback, useEffect, useState } from 'react'
import Avatar from '../../components/Avatar'
import { avaliacoesAPI, ciclosAvaliacaoAPI, eixosAvaliacaoAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAvaliarPares({ colaboradorId, cicloAberto, cicloAtivo, onIniciarAvaliacao, onVoltar }) {
  const [paresParaAvaliar, setParesParaAvaliar] = useState([])
  const [avaliacoesPares, setAvaliacoesPares] = useState({})
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

  const loadAvaliacoesPares = useCallback(async () => {
    if (!cicloAberto) return

    try {
      const response = await avaliacoesAPI.getAll({
        ciclo_id: cicloAberto.id,
        avaliador_id: colaboradorId,
        tipo: 'par'
      })
      const avaliacoes = response.avaliacoes || []

      const paresObj = {}
      avaliacoes.forEach(avaliacao => {
        const eixosObj = {}
        avaliacao.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        paresObj[avaliacao.avaliado_id] = {
          eixos: eixosObj,
          avaliacaoGeral: avaliacao.avaliacao_geral || ''
        }
      })
      setAvaliacoesPares(paresObj)
    } catch (error) {
      console.error('Erro ao carregar avaliações de pares:', error)
    }
  }, [cicloAberto, colaboradorId])

  const loadParesParaAvaliar = useCallback(async () => {
    if (!cicloAberto) return

    try {
      setLoading(true)

      // Buscar ciclo ativo para obter pares_para_avaliar
      let cicloComPares = cicloAtivo
      if (!cicloComPares || !cicloComPares.pares_para_avaliar) {
        // Se não foi passado ou não tem pares_para_avaliar, buscar do backend
        cicloComPares = await ciclosAvaliacaoAPI.getAtivo()
      }

      // Usar pares_para_avaliar do ciclo ativo
      const pares = cicloComPares?.pares_para_avaliar || []
      setParesParaAvaliar(pares)

      // Carregar avaliações existentes
      await loadAvaliacoesPares()
    } catch (error) {
      console.error('Erro ao carregar pares para avaliar:', error)
    } finally {
      setLoading(false)
    }
  }, [cicloAberto, cicloAtivo, loadAvaliacoesPares])

  useEffect(() => {
    loadEixosAvaliacao()
  }, [loadEixosAvaliacao])

  useEffect(() => {
    loadParesParaAvaliar()
  }, [loadParesParaAvaliar])

  const getStatusAvaliacaoPar = (colaboradorId) => {
    const avaliacao = avaliacoesPares[colaboradorId]
    if (!avaliacao) return 'pendente'

    const completa = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = avaliacao.eixos[eixo.id.toString()]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    }) && avaliacao.avaliacaoGeral.trim() !== ''

    return completa ? 'concluida' : 'em-andamento'
  }

  if (loading) {
    return <div>Carregando pares para avaliar...</div>
  }

  const paresComStatus = paresParaAvaliar.map(par => ({
    ...par,
    status: getStatusAvaliacaoPar(par.id)
  }))

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 3: Avaliar Pares</h2>
        <p className="ciclo-step-description">
          Avalie os colaboradores que escolheram você como par
        </p>
      </div>

      <div className="pares-avaliar-section">
        <h3 className="pares-avaliar-title">Colaboradores para Avaliar</h3>
        {paresComStatus.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            Nenhum colaborador selecionou você como par ainda.
          </p>
        ) : (
          <div className="pares-avaliar-grid">
            {paresComStatus.map((colaborador) => {
              const status = colaborador.status
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
                  key={colaborador.id}
                  className="par-avaliar-card"
                  onClick={() => onIniciarAvaliacao(colaborador)}
                >
                  <Avatar
                    avatar={colaborador.avatar}
                    nome={colaborador.nome}
                    size={60}
                    className="par-avaliar-avatar"
                  />
                  <div className="par-avaliar-info">
                    <p className="par-avaliar-nome">{colaborador.nome}</p>
                    <p className="par-avaliar-cargo">{colaborador.cargo}</p>
                    <p className="par-avaliar-departamento">{colaborador.departamento}</p>
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

export default EtapaAvaliarPares

