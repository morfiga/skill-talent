import { useState, useEffect } from 'react'
import { eixosAvaliacaoAPI, avaliacoesAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAvaliarParIndividual({ colaboradorId, cicloAberto, parSendoAvaliado, onFinalizado, onVoltar }) {
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [avaliacao, setAvaliacao] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (parSendoAvaliado) {
      loadEixosAvaliacao()
    }
  }, [parSendoAvaliado])

  useEffect(() => {
    if (parSendoAvaliado && cicloAberto && colaboradorId) {
      loadAvaliacaoExistente()
    }
  }, [parSendoAvaliado, cicloAberto, colaboradorId])

  const loadEixosAvaliacao = async () => {
    try {
      const response = await eixosAvaliacaoAPI.getAll()
      const eixos = response.eixos.map(eixo => ({
        id: eixo.id.toString(),
        codigo: eixo.codigo,
        nome: eixo.nome,
        niveis: eixo.niveis.map(nivel => ({
          nivel: nivel.nivel,
          descricao: nivel.descricao
        }))
      }))
      setEixosAvaliacao(eixos)
    } catch (error) {
      console.error('Erro ao carregar eixos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvaliacaoExistente = async () => {
    if (!cicloAberto || !parSendoAvaliado) return

    try {
      const response = await avaliacoesAPI.getAll({ 
        ciclo_id: cicloAberto.id,
        avaliador_id: colaboradorId,
        avaliado_id: parSendoAvaliado.id,
        tipo: 'par'
      })
      const avaliacoes = response.avaliacoes || []
      
      if (avaliacoes.length > 0) {
        const avaliacaoExistente = avaliacoes[0]
        const eixosObj = {}
        avaliacaoExistente.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        setAvaliacao({
          eixos: eixosObj,
          avaliacaoGeral: avaliacaoExistente.avaliacao_geral || ''
        })
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação existente:', error)
    }
  }

  const handleSelecionarNivel = (eixoId, nivel) => {
    setAvaliacao(prev => ({
      ...prev,
      eixos: {
        ...prev.eixos,
        [eixoId]: {
          ...prev.eixos[eixoId],
          nivel: nivel
        }
      }
    }))
  }

  const handleJustificativaChange = (eixoId, justificativa) => {
    setAvaliacao(prev => ({
      ...prev,
      eixos: {
        ...prev.eixos,
        [eixoId]: {
          ...prev.eixos[eixoId],
          justificativa: justificativa
        }
      }
    }))
  }

  const handleAvaliacaoGeralChange = (valor) => {
    setAvaliacao(prev => ({
      ...prev,
      avaliacaoGeral: valor
    }))
  }

  const isAvaliacaoCompleta = () => {
    const todosEixosCompletos = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = avaliacao.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    })

    const avaliacaoGeralPreenchida = avaliacao.avaliacaoGeral.trim() !== ''

    return todosEixosCompletos && avaliacaoGeralPreenchida
  }

  const handleSalvar = async () => {
    if (isAvaliacaoCompleta() && parSendoAvaliado && cicloAberto) {
      try {
        setSalvando(true)
        const eixos = {}
        eixosAvaliacao.forEach(eixo => {
          const avaliacaoEixo = avaliacao.eixos[eixo.id]
          if (avaliacaoEixo) {
            eixos[eixo.id] = {
              nivel: avaliacaoEixo.nivel,
              justificativa: avaliacaoEixo.justificativa
            }
          }
        })

        // Verificar se já existe avaliação
        try {
          const response = await avaliacoesAPI.getAll({ 
            ciclo_id: cicloAberto.id,
            avaliador_id: colaboradorId,
            avaliado_id: parSendoAvaliado.id,
            tipo: 'par'
          })
          const avaliacoes = response.avaliacoes || []
          
          if (avaliacoes.length > 0) {
            // Atualizar avaliação existente
            await avaliacoesAPI.update(avaliacoes[0].id, {
              avaliacao_geral: avaliacao.avaliacaoGeral,
              eixos: eixos
            })
            alert(`Avaliação de ${parSendoAvaliado.nome} atualizada com sucesso!`)
          } else {
            // Criar nova avaliação
            await avaliacoesAPI.create({
              ciclo_id: cicloAberto.id,
              avaliador_id: colaboradorId,
              avaliado_id: parSendoAvaliado.id,
              tipo: 'par',
              avaliacao_geral: avaliacao.avaliacaoGeral,
              eixos: eixos
            })
            alert(`Avaliação de ${parSendoAvaliado.nome} salva com sucesso!`)
          }
        } catch (createError) {
          // Se erro 400 (avaliação duplicada), tentar atualizar
          if (createError.message?.includes('Já existe') || createError.message?.includes('400')) {
            const response = await avaliacoesAPI.getAll({ 
              ciclo_id: cicloAberto.id,
              avaliador_id: colaboradorId,
              avaliado_id: parSendoAvaliado.id,
              tipo: 'par'
            })
            const avaliacoes = response.avaliacoes || []
            if (avaliacoes.length > 0) {
              await avaliacoesAPI.update(avaliacoes[0].id, {
                avaliacao_geral: avaliacao.avaliacaoGeral,
                eixos: eixos
              })
              alert(`Avaliação de ${parSendoAvaliado.nome} atualizada com sucesso!`)
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        }
      } catch (error) {
        console.error('Erro ao salvar avaliação do par:', error)
        alert('Erro ao salvar avaliação. Tente novamente.')
      } finally {
        setSalvando(false)
      }
    } else if (!isAvaliacaoCompleta()) {
      alert('Por favor, complete todos os campos obrigatórios antes de salvar.')
    }
  }

  if (!parSendoAvaliado) {
    return null
  }

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 3: Avaliar {parSendoAvaliado.nome}</h2>
        <p className="ciclo-step-description">
          Avalie o desempenho de {parSendoAvaliado.nome} em cada eixo e forneça feedback construtivo
        </p>
      </div>

      <div className="autoavaliacao-section">
        {eixosAvaliacao.map((eixo) => {
          const avaliacaoEixo = avaliacao.eixos[eixo.id] || {}
          const nivelSelecionado = avaliacaoEixo.nivel

          return (
            <div key={eixo.id} className="eixo-card">
              <h3 className="eixo-nome">{eixo.nome}</h3>

              <div className="niveis-container">
                <p className="niveis-label">
                  Selecione o nível de {parSendoAvaliado.nome}:
                </p>
                <div className="niveis-grid">
                  {eixo.niveis.map((nivel) => (
                    <button
                      key={nivel.nivel}
                      className={`nivel-button ${nivelSelecionado === nivel.nivel ? 'selecionado' : ''}`}
                      onClick={() => handleSelecionarNivel(eixo.id, nivel.nivel)}
                    >
                      <span className="nivel-numero">{nivel.nivel}</span>
                      <span className="nivel-descricao">{nivel.descricao}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="justificativa-container">
                <label className="justificativa-label">
                  Feedback <span className="required">*</span>
                </label>
                <textarea
                  className="justificativa-textarea"
                  placeholder={`Compartilhe seu feedback sobre ${parSendoAvaliado.nome} neste eixo...`}
                  value={avaliacaoEixo.justificativa || ''}
                  onChange={(e) => handleJustificativaChange(eixo.id, e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )
        })}

        <div className="avaliacao-geral-container">
          <h3 className="avaliacao-geral-title">
            Feedback Geral sobre {parSendoAvaliado.nome}
          </h3>
          <label className="avaliacao-geral-label">
            Compartilhe seu feedback geral sobre {parSendoAvaliado.nome} <span className="required">*</span>
          </label>
          <textarea
            className="avaliacao-geral-textarea"
            placeholder={`Descreva suas percepções gerais sobre ${parSendoAvaliado.nome}, pontos fortes, oportunidades de desenvolvimento e recomendações...`}
            value={avaliacao.avaliacaoGeral}
            onChange={(e) => handleAvaliacaoGeralChange(e.target.value)}
            rows={6}
          />
        </div>
      </div>

      <div className="ciclo-actions">
        {onVoltar && (
          <button className="voltar-button" onClick={onVoltar}>
            ← Voltar
          </button>
        )}
        <button
          className={`continuar-button ${isAvaliacaoCompleta() ? 'enabled' : 'disabled'}`}
          onClick={handleSalvar}
          disabled={!isAvaliacaoCompleta() || salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  )
}

export default EtapaAvaliarParIndividual

