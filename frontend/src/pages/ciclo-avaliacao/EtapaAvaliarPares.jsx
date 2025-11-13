import { useState, useEffect } from 'react'
import { ciclosAvaliacaoAPI, avaliacoesAPI, eixosAvaliacaoAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAvaliarPares({ colaboradorId, cicloAberto, onIniciarAvaliacao, onVoltar }) {
  const [paresParaAvaliar, setParesParaAvaliar] = useState([])
  const [avaliacoesPares, setAvaliacoesPares] = useState({})
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParesParaAvaliar()
    loadEixosAvaliacao()
  }, [cicloAberto])

  const loadEixosAvaliacao = async () => {
    try {
      const response = await eixosAvaliacaoAPI.getAll()
      setEixosAvaliacao(response.eixos || [])
    } catch (error) {
      console.error('Erro ao carregar eixos:', error)
    }
  }

  const loadParesParaAvaliar = async () => {
    if (!cicloAberto) return

    try {
      // Buscar ciclos de avaliação do ciclo aberto onde o colaborador atual foi selecionado como par
      const response = await ciclosAvaliacaoAPI.getAll()
      const ciclos = response.ciclos || []

      const pares = []
      ciclos.forEach(ciclo => {
        if (ciclo.ciclo_id === cicloAberto.id && ciclo.pares_selecionados) {
          const foiSelecionado = ciclo.pares_selecionados.some(
            ps => ps.par_id === colaboradorId
          )
          if (foiSelecionado && ciclo.colaborador_id !== colaboradorId) {
            pares.push(ciclo.colaborador)
          }
        }
      })

      setParesParaAvaliar(pares)
      
      // Carregar avaliações existentes
      await loadAvaliacoesPares()
    } catch (error) {
      console.error('Erro ao carregar pares para avaliar:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvaliacoesPares = async () => {
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
  }

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
                  <div className="par-avaliar-avatar">{colaborador.avatar}</div>
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

