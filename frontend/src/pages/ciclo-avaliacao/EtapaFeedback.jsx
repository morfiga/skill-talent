import { useState, useEffect, useMemo } from 'react'
import { avaliacoesAPI, eixosAvaliacaoAPI, niveisCarreiraAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaFeedback({ colaborador, cicloAberto, onVoltar }) {
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [autoavaliacao, setAutoavaliacao] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [avaliacaoGestor, setAvaliacaoGestor] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [avaliacoesPares, setAvaliacoesPares] = useState({})
  const [niveisEsperados, setNiveisEsperados] = useState([0, 0, 0, 0])
  const [feedbackData, setFeedbackData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cicloAberto) {
      loadFeedback()
    }
  }, [cicloAberto])

  const loadFeedback = async () => {
    if (!cicloAberto) return

    try {
      setLoading(true)
      
      // Carregar eixos
      const eixosResponse = await eixosAvaliacaoAPI.getAll()
      const eixos = eixosResponse.eixos.map(eixo => ({
        id: eixo.id.toString(),
        codigo: eixo.codigo,
        nome: eixo.nome,
        niveis: eixo.niveis.map(nivel => ({
          nivel: nivel.nivel,
          descricao: nivel.descricao
        }))
      }))
      setEixosAvaliacao(eixos)

      // Carregar feedback
      const feedback = await avaliacoesAPI.getFeedback(cicloAberto.id)
      setFeedbackData(feedback)

      // Atualizar estados locais com dados do feedback
      if (feedback.autoavaliacao) {
        const eixosObj = {}
        feedback.autoavaliacao.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        setAutoavaliacao({
          eixos: eixosObj,
          avaliacaoGeral: feedback.autoavaliacao.avaliacao_geral || ''
        })
      }

      if (feedback.avaliacao_gestor) {
        const eixosObj = {}
        feedback.avaliacao_gestor.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        setAvaliacaoGestor({
          eixos: eixosObj,
          avaliacaoGeral: feedback.avaliacao_gestor.avaliacao_geral || ''
        })
      }

      if (feedback.avaliacoes_pares) {
        const paresObj = {}
        feedback.avaliacoes_pares.forEach(avaliacao => {
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
      }

      if (feedback.niveis_esperados) {
        setNiveisEsperados(feedback.niveis_esperados)
      } else if (colaborador?.nivel_carreira) {
        // Carregar níveis esperados do nível de carreira
        const niveisResponse = await niveisCarreiraAPI.getByNivel(colaborador.nivel_carreira)
        setNiveisEsperados(niveisResponse.niveis_esperados || [0, 0, 0, 0])
      }
    } catch (error) {
      console.error('Erro ao carregar feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular média dos pares para cada eixo
  const calcularMediaPares = useMemo(() => {
    const medias = {}

    eixosAvaliacao.forEach((eixo) => {
      const niveis = []
      Object.values(avaliacoesPares).forEach((avaliacao) => {
        if (avaliacao.eixos[eixo.id]?.nivel) {
          niveis.push(avaliacao.eixos[eixo.id].nivel)
        }
      })

      if (niveis.length > 0) {
        medias[eixo.id] = niveis.reduce((sum, nivel) => sum + nivel, 0) / niveis.length
      } else {
        medias[eixo.id] = 0
      }
    })

    return medias
  }, [avaliacoesPares, eixosAvaliacao])

  // Comparar nível atual com esperado
  const compararNivel = (nivelAtual, nivelEsperado) => {
    if (nivelAtual === nivelEsperado) return 'atende'
    if (nivelAtual < nivelEsperado) return 'abaixo'
    return 'supera'
  }

  if (loading) {
    return <div>Carregando feedback...</div>
  }

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 5: Feedback</h2>
        <p className="ciclo-step-description">
          Visualize sua avaliação comparativa e análise de desempenho
        </p>
      </div>

      <div className="feedback-section">
        <div className="grafico-container">
          <h3 className="grafico-title">Comparativo de Avaliação</h3>
          <div className="grafico-area">
            <div className="grafico-eixos">
              {eixosAvaliacao.map((eixo) => {
                const nivelAuto = autoavaliacao.eixos[eixo.id]?.nivel || 0
                const nivelGestor = avaliacaoGestor.eixos[eixo.id]?.nivel || 0
                const nivelMediaPares = feedbackData?.media_pares_por_eixo?.[eixo.id] || calcularMediaPares[eixo.id] || 0

                return (
                  <div key={eixo.id} className="grafico-barra-container">
                    <div className="grafico-label">{eixo.nome}</div>
                    <div className="grafico-barras">
                      <div
                        className="grafico-barra autoavaliacao"
                        style={{ height: `${(nivelAuto / 5) * 100}%` }}
                        title={`Autoavaliação: ${nivelAuto || '-'}`}
                      />
                      <div
                        className="grafico-barra gestor"
                        style={{ height: `${(nivelGestor / 5) * 100}%` }}
                        title={`Gestor: ${nivelGestor || '-'}`}
                      />
                      <div
                        className="grafico-barra media-pares"
                        style={{ height: `${(nivelMediaPares / 5) * 100}%` }}
                        title={`Média Pares: ${nivelMediaPares > 0 ? nivelMediaPares.toFixed(1) : '-'}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grafico-legend">
              <div className="legend-item">
                <div className="legend-color autoavaliacao"></div>
                <span>Autoavaliação</span>
              </div>
              <div className="legend-item">
                <div className="legend-color gestor"></div>
                <span>Gestor</span>
              </div>
              <div className="legend-item">
                <div className="legend-color media-pares"></div>
                <span>Média Pares</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tabela-container">
          <h3 className="tabela-title">Análise Detalhada por Eixo</h3>
          <div className="tabela-wrapper">
            <table className="tabela-comparativa">
              <thead>
                <tr>
                  <th>Eixo</th>
                  <th>Autoavaliação</th>
                  <th>Gestor</th>
                  <th>Média Pares</th>
                  <th>Esperado ({colaborador?.nivel_carreira || '-'})</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {eixosAvaliacao.map((eixo, index) => {
                  const nivelAuto = autoavaliacao.eixos[eixo.id]?.nivel || 0
                  const nivelGestor = avaliacaoGestor.eixos[eixo.id]?.nivel || 0
                  const nivelMediaPares = feedbackData?.media_pares_por_eixo?.[eixo.id] || calcularMediaPares[eixo.id] || 0
                  const nivelEsperado = niveisEsperados[index] || 0

                  const statusAuto = nivelAuto > 0 ? compararNivel(nivelAuto, nivelEsperado) : null

                  return (
                    <tr key={eixo.id}>
                      <td className="eixo-nome-cell">{eixo.nome}</td>
                      <td>
                        <div className="nivel-cell">
                          <span className="nivel-valor">{nivelAuto || '-'}</span>
                          {statusAuto && (
                            <span className={`status-indicator ${statusAuto}`}>
                              {statusAuto === 'atende' ? '✓' : statusAuto === 'abaixo' ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="nivel-cell">
                          <span className="nivel-valor">{nivelGestor || '-'}</span>
                          {nivelGestor > 0 && (
                            <span className={`status-indicator ${compararNivel(nivelGestor, nivelEsperado)}`}>
                              {compararNivel(nivelGestor, nivelEsperado) === 'atende' ? '✓' : compararNivel(nivelGestor, nivelEsperado) === 'abaixo' ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="nivel-cell">
                          <span className="nivel-valor">{nivelMediaPares > 0 ? nivelMediaPares.toFixed(1) : '-'}</span>
                          {nivelMediaPares > 0 && (
                            <span className={`status-indicator ${compararNivel(Math.round(nivelMediaPares), nivelEsperado)}`}>
                              {compararNivel(Math.round(nivelMediaPares), nivelEsperado) === 'atende' ? '✓' : compararNivel(Math.round(nivelMediaPares), nivelEsperado) === 'abaixo' ? '↓' : '↑'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="esperado-cell">{nivelEsperado}</td>
                      <td>
                        <div className="status-cell">
                          {statusAuto && (
                            <span className={`status-badge ${statusAuto}`}>{statusAuto}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ciclo-actions">
          {onVoltar && (
            <button className="voltar-button" onClick={onVoltar}>
              ← Voltar
            </button>
          )}
        </div>
      </div>
    </>
  )
}

export default EtapaFeedback

