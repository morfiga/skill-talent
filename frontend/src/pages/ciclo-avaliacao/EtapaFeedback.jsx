import { useEffect, useMemo, useState } from 'react'
import { avaliacoesAPI, eixosAvaliacaoAPI, niveisCarreiraAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
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
  const [feedbackLiberado, setFeedbackLiberado] = useState(false)

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

      // Verificar se o feedback está liberado
      // Se houver avaliação do gestor ou avaliações de pares, o feedback foi liberado
      const liberado = !!(feedback.avaliacao_gestor || (feedback.avaliacoes_pares && feedback.avaliacoes_pares.length > 0))
      setFeedbackLiberado(liberado)

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
          // Usar avaliador_id como chave para identificar quem avaliou
          paresObj[avaliacao.avaliador_id] = {
            eixos: eixosObj,
            avaliacaoGeral: avaliacao.avaliacao_geral || '',
            avaliador_nome: avaliacao.avaliador?.nome || 'Par'
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
      handleApiError(error, 'carregar feedback', '/avaliacoes/feedback')
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

  // Agrupar justificativas por eixo das avaliações de pares
  const justificativasPorEixo = useMemo(() => {
    if (!eixosAvaliacao || Object.keys(avaliacoesPares).length === 0) return {}

    const agrupadas = {}

    eixosAvaliacao.forEach(eixo => {
      agrupadas[eixo.id] = []
      Object.entries(avaliacoesPares).forEach(([avaliadorId, avaliacao]) => {
        const eixoData = avaliacao.eixos[eixo.id]
        if (eixoData && eixoData.justificativa && eixoData.justificativa.trim() !== '') {
          agrupadas[eixo.id].push({
            avaliador_id: avaliadorId,
            avaliador_nome: avaliacao.avaliador_nome || 'Par',
            nivel: eixoData.nivel,
            justificativa: eixoData.justificativa
          })
        }
      })
      const eixoDataGestor = avaliacaoGestor.eixos[eixo.id]
      if (eixoDataGestor && eixoDataGestor.justificativa && eixoDataGestor.justificativa.trim() !== '') {
        agrupadas[eixo.id].push({
          avaliador_id: 'gestor',
          avaliador_nome: 'Gestor',
          nivel: eixoDataGestor.nivel,
          justificativa: eixoDataGestor.justificativa
        })
      }
    })

    return agrupadas
  }, [eixosAvaliacao, avaliacoesPares])

  // Agrupar feedbacks gerais do gestor e pares
  const feedbacksGerais = useMemo(() => {
    if (!avaliacaoGestor || !avaliacoesPares) return {}

    const feedbacks = []

    if (avaliacaoGestor.avaliacaoGeral) {
      feedbacks.push({
        avaliador_id: 'gestor',
        avaliador_nome: 'Gestor',
        avaliacaoGeral: avaliacaoGestor.avaliacaoGeral
      })
    }
    Object.entries(avaliacoesPares).forEach(([avaliadorId, avaliacao]) => {
      if (avaliacao.avaliacaoGeral) {
        feedbacks.push({
          avaliador_id: avaliadorId,
          avaliador_nome: avaliacao.avaliador_nome || 'Par',
          avaliacaoGeral: avaliacao.avaliacaoGeral
        })
      }
    })
    return feedbacks
  }, [avaliacaoGestor, avaliacoesPares])

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
        <h2 className="ciclo-step-title">Feedback</h2>
        <p className="ciclo-step-description">
          Visualize sua avaliação comparativa e análise de desempenho
        </p>
      </div>

      {/* Mensagem de feedback não liberado */}
      {!feedbackLiberado && (
        <div className="info-banner" style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>⏳</span>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '600' }}>
                Feedback em Análise
              </h3>
              <p style={{ margin: 0, fontSize: '1rem', opacity: 0.95 }}>
                Seu feedback ainda está sendo preparado pelo seu gestor. Por enquanto, você pode visualizar apenas sua autoavaliação.
                Assim que seu gestor liberar, você terá acesso ao feedback completo com a avaliação dele e dos seus pares.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="feedback-section">
        <div className="grafico-container">
          <h3 className="grafico-title">
            {feedbackLiberado ? 'Comparativo de Avaliação' : 'Sua Autoavaliação'}
          </h3>
          <div className="grafico-area">
            <div className="grafico-eixos">
              {eixosAvaliacao.map((eixo) => {
                const nivelAuto = autoavaliacao.eixos[eixo.id]?.nivel || 0
                const nivelGestor = feedbackLiberado ? (avaliacaoGestor.eixos[eixo.id]?.nivel || 0) : 0
                const nivelMediaPares = feedbackLiberado ? (feedbackData?.media_pares_por_eixo?.[eixo.id] || calcularMediaPares[eixo.id] || 0) : 0

                return (
                  <div key={eixo.id} className="grafico-barra-container">
                    <div className="grafico-label">{eixo.nome}</div>
                    <div className="grafico-barras">
                      <div
                        className="grafico-barra autoavaliacao"
                        style={{ height: `${(nivelAuto / 5) * 100}%` }}
                        title={`Autoavaliação: ${nivelAuto || '-'}`}
                      />
                      {feedbackLiberado && (
                        <>
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
                        </>
                      )}
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
              {feedbackLiberado && (
                <>
                  <div className="legend-item">
                    <div className="legend-color gestor"></div>
                    <span>Gestor</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color media-pares"></div>
                    <span>Média Pares</span>
                  </div>
                </>
              )}
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
                  {feedbackLiberado && (
                    <>
                      <th>Gestor</th>
                      <th>Média Pares</th>
                    </>
                  )}
                  <th>Esperado ({colaborador?.nivel_carreira || '-'})</th>
                </tr>
              </thead>
              <tbody>
                {eixosAvaliacao.map((eixo, index) => {
                  const nivelAuto = autoavaliacao.eixos[eixo.id]?.nivel || 0
                  const nivelGestor = feedbackLiberado ? (avaliacaoGestor.eixos[eixo.id]?.nivel || 0) : 0
                  const nivelMediaPares = feedbackLiberado ? (feedbackData?.media_pares_por_eixo?.[eixo.id] || calcularMediaPares[eixo.id] || 0) : 0
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
                      {feedbackLiberado && (
                        <>
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
                                <span className={`status-indicator ${compararNivel(nivelMediaPares.toFixed(1), nivelEsperado)}`}>
                                  {compararNivel(nivelMediaPares.toFixed(1), nivelEsperado) === 'atende' ? '✓' : compararNivel(nivelMediaPares.toFixed(1), nivelEsperado) === 'abaixo' ? '↓' : '↑'}
                                </span>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="esperado-cell">{nivelEsperado}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Listagem de Justificativas por Eixo - Apenas quando feedback liberado */}
        {feedbackLiberado && eixosAvaliacao.length > 0 && (
          <div className="perguntas-abertas-container">
            <h3 className="perguntas-abertas-title">Justificativas Recebidas</h3>
            {eixosAvaliacao.map((eixo) => {
              const justificativas = justificativasPorEixo[eixo.id] || []

              if (justificativas.length === 0) {
                return (
                  <div key={eixo.id} className="pergunta-aberta-card">
                    <h4 className="pergunta-aberta-texto">{eixo.nome}</h4>
                    <p className="sem-respostas">Nenhuma justificativa recebida ainda.</p>
                  </div>
                )
              }

              return (
                <div key={eixo.id} className="pergunta-aberta-card">
                  <h4 className="pergunta-aberta-texto">{eixo.nome}</h4>
                  <div className="respostas-lista">
                    {justificativas.map((item, index) => (
                      <div key={index} className="resposta-item">
                        <div className="resposta-header">
                          <span className="resposta-autor">{item.avaliador_nome}</span>
                          <span className="resposta-nivel">Nível: {item.nivel}</span>
                        </div>
                        <div className="resposta-conteudo">
                          {item.justificativa}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Comentários Gerais do Gestor e Pares - Apenas quando feedback liberado */}
        {feedbackLiberado && feedbacksGerais.length > 0 && (
          <div className="perguntas-abertas-container">
            <h3 className="perguntas-abertas-title">Comentários</h3>
            <div className="pergunta-aberta-card">
              <h4 className="pergunta-aberta-texto">Feedback Geral</h4>
              <div className="respostas-lista">
                {feedbacksGerais.map((feedback) => (
                  <div key={feedback.avaliador_id} className="resposta-item">
                    <div className="resposta-header">
                      <span className="resposta-autor">{feedback.avaliador_nome}</span>
                    </div>
                    <div className="resposta-conteudo">
                      {feedback.avaliacaoGeral}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

