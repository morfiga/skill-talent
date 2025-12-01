import { useEffect, useState } from 'react'
import { avaliacoesGestorAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaAvaliacaoGestor({ colaboradorId, colaborador, cicloAberto, onVoltar }) {
  const [perguntas, setPerguntas] = useState(null)
  const [respostasFechadas, setRespostasFechadas] = useState({})
  const [respostasAbertas, setRespostasAbertas] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [avaliacaoExistente, setAvaliacaoExistente] = useState(null)

  useEffect(() => {
    loadPerguntas()
  }, [])

  useEffect(() => {
    if (cicloAberto && colaboradorId) {
      loadAvaliacaoExistente()
    }
  }, [cicloAberto, colaboradorId])

  const loadPerguntas = async () => {
    try {
      const response = await avaliacoesGestorAPI.getPerguntas()
      setPerguntas(response)

      // Inicializar respostas fechadas
      const fechadasInicial = {}
      Object.keys(response.perguntas_fechadas).forEach(codigo => {
        fechadasInicial[codigo] = null
      })
      setRespostasFechadas(fechadasInicial)

      // Inicializar respostas abertas
      const abertasInicial = {}
      Object.keys(response.perguntas_abertas).forEach(codigo => {
        abertasInicial[codigo] = ''
      })
      setRespostasAbertas(abertasInicial)
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error)
      alert('Erro ao carregar perguntas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const loadAvaliacaoExistente = async () => {
    if (!cicloAberto) return

    try {
      const response = await avaliacoesGestorAPI.getAll({
        ciclo_id: cicloAberto.id,
        colaborador_id: colaboradorId
      })
      const avaliacoes = response.avaliacoes || []

      if (avaliacoes.length > 0) {
        const avaliacao = avaliacoes[0]
        setAvaliacaoExistente(avaliacao)

        // Carregar respostas fechadas
        const fechadas = {}
        avaliacao.respostas?.forEach(resposta => {
          if (resposta.resposta_escala !== null) {
            fechadas[resposta.pergunta_codigo] = resposta.resposta_escala
          }
        })
        setRespostasFechadas(prev => ({ ...prev, ...fechadas }))

        // Carregar respostas abertas
        const abertas = {}
        avaliacao.respostas?.forEach(resposta => {
          if (resposta.resposta_texto !== null) {
            abertas[resposta.pergunta_codigo] = resposta.resposta_texto
          }
        })
        setRespostasAbertas(prev => ({ ...prev, ...abertas }))
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação existente:', error)
    }
  }

  const handleRespostaFechadaChange = (perguntaCodigo, escala) => {
    setRespostasFechadas(prev => ({
      ...prev,
      [perguntaCodigo]: escala
    }))
  }

  const handleRespostaAbertaChange = (perguntaCodigo, texto) => {
    setRespostasAbertas(prev => ({
      ...prev,
      [perguntaCodigo]: texto
    }))
  }

  const isAvaliacaoCompleta = () => {
    if (!perguntas) return false

    // Verificar se todas as perguntas fechadas foram respondidas
    const todasFechadasRespondidas = Object.keys(perguntas.perguntas_fechadas).every(
      codigo => respostasFechadas[codigo] !== null && respostasFechadas[codigo] !== undefined
    )

    // Verificar se todas as perguntas abertas foram respondidas
    const todasAbertasRespondidas = Object.keys(perguntas.perguntas_abertas).every(
      codigo => respostasAbertas[codigo] && respostasAbertas[codigo].trim() !== ''
    )

    return todasFechadasRespondidas && todasAbertasRespondidas
  }

  const handleSalvar = async () => {
    if (!isAvaliacaoCompleta() || !cicloAberto) {
      alert('Por favor, complete todas as perguntas antes de salvar.')
      return
    }

    try {
      setSalvando(true)

      // Preparar dados para envio
      const respostasFechadasArray = Object.keys(perguntas.perguntas_fechadas).map(codigo => ({
        pergunta_codigo: codigo,
        resposta_escala: respostasFechadas[codigo]
      }))

      const respostasAbertasArray = Object.keys(perguntas.perguntas_abertas).map(codigo => ({
        pergunta_codigo: codigo,
        resposta_texto: respostasAbertas[codigo]
      }))

      const data = {
        ciclo_id: cicloAberto.id,
        respostas_fechadas: respostasFechadasArray,
        respostas_abertas: respostasAbertasArray
      }

      if (avaliacaoExistente) {
        // Atualizar avaliação existente
        await avaliacoesGestorAPI.update(avaliacaoExistente.id, data)
        alert('Avaliação atualizada com sucesso!')
      } else {
        // Criar nova avaliação
        await avaliacoesGestorAPI.create(data)
        alert('Avaliação salva com sucesso!')
        // Recarregar para obter o ID da avaliação criada
        await loadAvaliacaoExistente()
      }
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error)
      alert('Erro ao salvar avaliação. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const getPerguntasPorCategoria = (categoriaCodigo) => {
    if (!perguntas) return { fechadas: [], abertas: [] }

    const fechadas = Object.entries(perguntas.perguntas_fechadas)
      .filter(([codigo, info]) => info.categoria === categoriaCodigo)
      .map(([codigo, info]) => ({ codigo, ...info }))

    const abertas = Object.entries(perguntas.perguntas_abertas)
      .filter(([codigo, info]) => info.categoria === categoriaCodigo)
      .map(([codigo, info]) => ({ codigo, ...info }))

    return { fechadas, abertas }
  }

  if (loading) {
    return <div>Carregando perguntas...</div>
  }

  if (!perguntas) {
    return <div>Erro ao carregar perguntas. Tente novamente.</div>
  }

  if (!colaborador?.gestor_id) {
    return (
      <>
        <div className="ciclo-header">
          <h2 className="ciclo-step-title">Avaliação do Gestor</h2>
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

  const categorias = Object.entries(perguntas.categorias)

  return (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Avaliação do Gestor</h2>
        <p className="ciclo-step-description">
          Avalie seu gestor respondendo as perguntas abaixo. Seja honesto e construtivo em suas respostas.
        </p>
      </div>

      <div className="autoavaliacao-section">
        {categorias.map(([categoriaCodigo, categoriaNome]) => {
          const { fechadas, abertas } = getPerguntasPorCategoria(categoriaCodigo)

          // Pular categoria se não houver perguntas
          if (fechadas.length === 0 && abertas.length === 0) return null

          return (
            <div key={categoriaCodigo} className="categoria-card">
              <h3 className="categoria-nome">{categoriaNome}</h3>

              {/* Perguntas Fechadas */}
              {fechadas.map((pergunta) => (
                <div key={pergunta.codigo} className="pergunta-card">
                  <p className="pergunta-texto">{pergunta.texto}</p>
                  <div className="escala-container">
                    <div className="escala-buttons">
                      {[1, 2, 3, 4, 5].map((escala) => (
                        <button
                          key={escala}
                          className={`escala-button ${respostasFechadas[pergunta.codigo] === escala ? 'selecionado' : ''
                            }`}
                          onClick={() => handleRespostaFechadaChange(pergunta.codigo, escala)}
                        >
                          {escala}
                        </button>
                      ))}
                    </div>
                    <div className="escala-labels">
                      <span>Discordo totalmente</span>
                      <span>Concordo totalmente</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Perguntas Abertas */}
              {abertas.map((pergunta) => (
                <div key={pergunta.codigo} className="pergunta-card">
                  <label className="pergunta-label">
                    {pergunta.texto} <span className="required">*</span>
                  </label>
                  <textarea
                    className="pergunta-textarea"
                    placeholder="Digite sua resposta..."
                    value={respostasAbertas[pergunta.codigo] || ''}
                    onChange={(e) => handleRespostaAbertaChange(pergunta.codigo, e.target.value)}
                    rows={4}
                  />
                </div>
              ))}
            </div>
          )
        })}
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

