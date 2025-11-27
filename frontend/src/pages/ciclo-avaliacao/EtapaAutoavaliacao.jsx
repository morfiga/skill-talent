import { useState, useEffect } from 'react'
import { eixosAvaliacaoAPI, avaliacoesAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAutoavaliacao({ colaboradorId, cicloAberto, onFinalizado, onVoltar }) {
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [autoavaliacao, setAutoavaliacao] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    loadEixosAvaliacao()
  }, [])

  useEffect(() => {
    if (cicloAberto && colaboradorId) {
      loadAvaliacaoExistente()
    }
  }, [cicloAberto, colaboradorId])

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
    if (!cicloAberto) return

    try {
      const response = await avaliacoesAPI.getAll({ 
        ciclo_id: cicloAberto.id,
        avaliado_id: colaboradorId,
        tipo: 'autoavaliacao'
      })
      const avaliacoes = response.avaliacoes || []
      
      if (avaliacoes.length > 0) {
        const avaliacao = avaliacoes[0]
        const eixosObj = {}
        avaliacao.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        setAutoavaliacao({
          eixos: eixosObj,
          avaliacaoGeral: avaliacao.avaliacao_geral || ''
        })
      }
    } catch (error) {
      console.error('Erro ao carregar autoavaliação existente:', error)
    }
  }

  const handleSelecionarNivel = (eixoId, nivel) => {
    setAutoavaliacao(prev => ({
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
    setAutoavaliacao(prev => ({
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
    setAutoavaliacao(prev => ({
      ...prev,
      avaliacaoGeral: valor
    }))
  }

  const isAutoavaliacaoCompleta = () => {
    const todosEixosCompletos = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = autoavaliacao.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    })

    const avaliacaoGeralPreenchida = autoavaliacao.avaliacaoGeral.trim() !== ''

    return todosEixosCompletos && avaliacaoGeralPreenchida
  }

  const handleSalvar = async () => {
    if (isAutoavaliacaoCompleta() && cicloAberto) {
      try {
        setSalvando(true)
        const eixos = {}
        eixosAvaliacao.forEach(eixo => {
          const avaliacaoEixo = autoavaliacao.eixos[eixo.id]
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
            avaliado_id: colaboradorId,
            tipo: 'autoavaliacao'
          })
          const avaliacoes = response.avaliacoes || []
          
          if (avaliacoes.length > 0) {
            // Atualizar avaliação existente
            await avaliacoesAPI.update(avaliacoes[0].id, {
              avaliacao_geral: autoavaliacao.avaliacaoGeral,
              eixos: eixos
            })
            alert('Autoavaliação atualizada com sucesso!')
          } else {
            // Criar nova avaliação
            await avaliacoesAPI.create({
              ciclo_id: cicloAberto.id,
              avaliado_id: colaboradorId,
              tipo: 'autoavaliacao',
              avaliacao_geral: autoavaliacao.avaliacaoGeral,
              eixos: eixos
            })
            alert('Autoavaliação salva com sucesso!')
          }
        } catch (createError) {
          // Se erro 400 (avaliação duplicada), tentar atualizar
          if (createError.message?.includes('Já existe') || createError.message?.includes('400')) {
            const response = await avaliacoesAPI.getAll({ 
              ciclo_id: cicloAberto.id,
              avaliado_id: colaboradorId,
              tipo: 'autoavaliacao'
            })
            const avaliacoes = response.avaliacoes || []
            if (avaliacoes.length > 0) {
              await avaliacoesAPI.update(avaliacoes[0].id, {
                avaliacao_geral: autoavaliacao.avaliacaoGeral,
                eixos: eixos
              })
              alert('Autoavaliação atualizada com sucesso!')
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        }
      } catch (error) {
        console.error('Erro ao salvar autoavaliação:', error)
        alert('Erro ao salvar autoavaliação. Tente novamente.')
      } finally {
        setSalvando(false)
      }
    } else if (!isAutoavaliacaoCompleta()) {
      alert('Por favor, complete todos os campos obrigatórios antes de salvar.')
    }
  }

  if (loading) {
    return <div>Carregando eixos de avaliação...</div>
  }

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 2: Autoavaliação</h2>
        <p className="ciclo-step-description">
          Avalie seu desempenho em cada eixo e justifique suas escolhas
        </p>
      </div>

      <div className="autoavaliacao-section">
        {eixosAvaliacao.map((eixo) => {
          const avaliacaoEixo = autoavaliacao.eixos[eixo.id] || {}
          const nivelSelecionado = avaliacaoEixo.nivel

          return (
            <div key={eixo.id} className="eixo-card">
              <h3 className="eixo-nome">{eixo.nome}</h3>

              <div className="niveis-container">
                <p className="niveis-label">Selecione seu nível:</p>
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
                  Justificativa <span className="required">*</span>
                </label>
                <textarea
                  className="justificativa-textarea"
                  placeholder="Explique por que você escolheu este nível..."
                  value={avaliacaoEixo.justificativa || ''}
                  onChange={(e) => handleJustificativaChange(eixo.id, e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )
        })}

        <div className="avaliacao-geral-container">
          <h3 className="avaliacao-geral-title">Avaliação Geral do Ciclo</h3>
          <label className="avaliacao-geral-label">
            Compartilhe suas reflexões sobre o ciclo de avaliação <span className="required">*</span>
          </label>
          <textarea
            className="avaliacao-geral-textarea"
            placeholder="Descreva suas percepções, aprendizados e expectativas para o próximo ciclo..."
            value={autoavaliacao.avaliacaoGeral}
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
          className={`continuar-button ${isAutoavaliacaoCompleta() ? 'enabled' : 'disabled'}`}
          onClick={handleSalvar}
          disabled={!isAutoavaliacaoCompleta() || salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  )
}

export default EtapaAutoavaliacao

