import { useState, useEffect } from 'react'
import { eixosAvaliacaoAPI, avaliacoesAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAvaliacaoGestor({ colaboradorId, colaborador, cicloAberto, onFinalizado, onVoltar }) {
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [avaliacaoGestor, setAvaliacaoGestor] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    loadEixosAvaliacao()
  }, [])

  useEffect(() => {
    if (cicloAberto && colaboradorId && colaborador?.gestor_id) {
      loadAvaliacaoExistente()
    }
  }, [cicloAberto, colaboradorId, colaborador?.gestor_id])

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
    if (!cicloAberto || !colaborador?.gestor_id) return

    try {
      const response = await avaliacoesAPI.getAll({ 
        ciclo_id: cicloAberto.id,
        avaliador_id: colaboradorId,
        avaliado_id: colaborador.gestor_id,
        tipo: 'gestor'
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
        setAvaliacaoGestor({
          eixos: eixosObj,
          avaliacaoGeral: avaliacao.avaliacao_geral || ''
        })
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação do gestor existente:', error)
    }
  }

  const handleSelecionarNivel = (eixoId, nivel) => {
    setAvaliacaoGestor(prev => ({
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
    setAvaliacaoGestor(prev => ({
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
    setAvaliacaoGestor(prev => ({
      ...prev,
      avaliacaoGeral: valor
    }))
  }

  const isAvaliacaoCompleta = () => {
    const todosEixosCompletos = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = avaliacaoGestor.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    })

    const avaliacaoGeralPreenchida = avaliacaoGestor.avaliacaoGeral.trim() !== ''

    return todosEixosCompletos && avaliacaoGeralPreenchida
  }

  const handleSalvar = async () => {
    if (isAvaliacaoCompleta() && cicloAberto && colaborador?.gestor_id) {
      try {
        setSalvando(true)
        const eixos = {}
        eixosAvaliacao.forEach(eixo => {
          const avaliacaoEixo = avaliacaoGestor.eixos[eixo.id]
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
            avaliado_id: colaborador.gestor_id,
            tipo: 'gestor'
          })
          const avaliacoes = response.avaliacoes || []
          
          if (avaliacoes.length > 0) {
            // Atualizar avaliação existente
            await avaliacoesAPI.update(avaliacoes[0].id, {
              avaliacao_geral: avaliacaoGestor.avaliacaoGeral,
              eixos: eixos
            })
            alert('Avaliação do gestor atualizada com sucesso!')
          } else {
            // Criar nova avaliação
            await avaliacoesAPI.create({
              ciclo_id: cicloAberto.id,
              avaliador_id: colaboradorId,
              avaliado_id: colaborador.gestor_id,
              tipo: 'gestor',
              avaliacao_geral: avaliacaoGestor.avaliacaoGeral,
              eixos: eixos
            })
            alert('Avaliação do gestor salva com sucesso!')
          }
        } catch (createError) {
          // Se erro 400 (avaliação duplicada), tentar atualizar
          if (createError.message?.includes('Já existe') || createError.message?.includes('400')) {
            const response = await avaliacoesAPI.getAll({ 
              ciclo_id: cicloAberto.id,
              avaliador_id: colaboradorId,
              avaliado_id: colaborador.gestor_id,
              tipo: 'gestor'
            })
            const avaliacoes = response.avaliacoes || []
            if (avaliacoes.length > 0) {
              await avaliacoesAPI.update(avaliacoes[0].id, {
                avaliacao_geral: avaliacaoGestor.avaliacaoGeral,
                eixos: eixos
              })
              alert('Avaliação do gestor atualizada com sucesso!')
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        }
      } catch (error) {
        console.error('Erro ao salvar avaliação do gestor:', error)
        alert('Erro ao salvar avaliação do gestor. Tente novamente.')
      } finally {
        setSalvando(false)
      }
    } else if (!isAvaliacaoCompleta()) {
      alert('Por favor, complete todos os campos obrigatórios antes de salvar.')
    }
  }

  if (loading) {
    return <div>Carregando eixos de avaliação...</div>
  }

  if (!colaborador?.gestor_id) {
    return (
      <>
        <div className="ciclo-header">
          <h2 className="ciclo-step-title">Etapa 4: Avaliação do Gestor</h2>
          <p className="ciclo-step-description">
            Você não possui um gestor cadastrado.
          </p>
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

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 4: Avaliação do Gestor</h2>
        <p className="ciclo-step-description">
          Avalie o desempenho do seu gestor em cada eixo e forneça feedback construtivo
        </p>
      </div>

      <div className="autoavaliacao-section">
        {eixosAvaliacao.map((eixo) => {
          const avaliacaoEixo = avaliacaoGestor.eixos[eixo.id] || {}
          const nivelSelecionado = avaliacaoEixo.nivel

          return (
            <div key={eixo.id} className="eixo-card">
              <h3 className="eixo-nome">{eixo.nome}</h3>

              <div className="niveis-container">
                <p className="niveis-label">Selecione o nível do seu gestor:</p>
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
                  placeholder="Compartilhe seu feedback sobre seu gestor neste eixo..."
                  value={avaliacaoEixo.justificativa || ''}
                  onChange={(e) => handleJustificativaChange(eixo.id, e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )
        })}

        <div className="avaliacao-geral-container">
          <h3 className="avaliacao-geral-title">Feedback Geral sobre o Gestor</h3>
          <label className="avaliacao-geral-label">
            Compartilhe seu feedback geral sobre seu gestor <span className="required">*</span>
          </label>
          <textarea
            className="avaliacao-geral-textarea"
            placeholder="Descreva suas percepções gerais sobre seu gestor, pontos fortes, oportunidades de desenvolvimento e recomendações..."
            value={avaliacaoGestor.avaliacaoGeral}
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

export default EtapaAvaliacaoGestor

