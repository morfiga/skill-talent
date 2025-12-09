import { useEffect, useState } from 'react'
import RatingSlider from '../../components/RatingSlider'
import { useToast } from '../../contexts/ToastContext'
import { avaliacoesGestorAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import '../CicloAvaliacao.css'

function EtapaAvaliacaoGestor({ colaboradorId, colaborador, cicloAberto, onVoltar }) {
  const { success, error: showError, warning } = useToast()
  const [perguntas, setPerguntas] = useState(null)
  const [respostasFechadas, setRespostasFechadas] = useState({})
  const [justificativas, setJustificativas] = useState({})
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
      const justificativasInicial = {}
      Object.keys(response.perguntas_fechadas).forEach(codigo => {
        fechadasInicial[codigo] = null
        justificativasInicial[codigo] = ''
      })
      setRespostasFechadas(fechadasInicial)
      setJustificativas(justificativasInicial)

      // Inicializar respostas abertas
      const abertasInicial = {}
      Object.keys(response.perguntas_abertas).forEach(codigo => {
        abertasInicial[codigo] = ''
      })
      setRespostasAbertas(abertasInicial)
    } catch (error) {
      handleApiError(error, 'carregar perguntas', '/avaliacoes-gestor/perguntas', showError)
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

        // Carregar respostas fechadas e justificativas
        const fechadas = {}
        const justificativasCarregadas = {}
        avaliacao.respostas?.forEach(resposta => {
          if (resposta.resposta_escala !== null) {
            fechadas[resposta.pergunta_codigo] = resposta.resposta_escala
            justificativasCarregadas[resposta.pergunta_codigo] = resposta.justificativa || ''
          }
        })
        setRespostasFechadas(prev => ({ ...prev, ...fechadas }))
        setJustificativas(prev => ({ ...prev, ...justificativasCarregadas }))

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
      handleApiError(error, 'carregar avaliação existente', '/avaliacoes-gestor', showError)
    }
  }

  const handleRespostaFechadaChange = (perguntaCodigo, escala) => {
    setRespostasFechadas(prev => ({
      ...prev,
      [perguntaCodigo]: escala
    }))
  }

  const handleJustificativaChange = (perguntaCodigo, texto) => {
    setJustificativas(prev => ({
      ...prev,
      [perguntaCodigo]: texto
    }))
  }

  const isJustificativaObrigatoria = (perguntaCodigo) => {
    const escala = respostasFechadas[perguntaCodigo]
    return escala === 1 || escala === 5
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

    // Verificar se justificativas obrigatórias foram preenchidas (escala 1 ou 5)
    const todasJustificativasPreenchidas = Object.keys(perguntas.perguntas_fechadas).every(
      codigo => {
        const escala = respostasFechadas[codigo]
        if (escala === 1 || escala === 5) {
          return justificativas[codigo] && justificativas[codigo].trim() !== ''
        }
        return true
      }
    )

    // Verificar se todas as perguntas abertas foram respondidas
    const todasAbertasRespondidas = Object.keys(perguntas.perguntas_abertas).every(
      codigo => respostasAbertas[codigo] && respostasAbertas[codigo].trim() !== ''
    )

    return todasFechadasRespondidas && todasJustificativasPreenchidas && todasAbertasRespondidas
  }

  const handleSalvar = async () => {
    if (!isAvaliacaoCompleta() || !cicloAberto) {
      warning('Por favor, complete todas as perguntas antes de salvar.')
      return
    }

    try {
      setSalvando(true)

      // Preparar dados para envio
      const respostasFechadasArray = Object.keys(perguntas.perguntas_fechadas).map(codigo => ({
        pergunta_codigo: codigo,
        resposta_escala: respostasFechadas[codigo],
        justificativa: justificativas[codigo] || null
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
        success('Avaliação atualizada com sucesso!')
      } else {
        // Criar nova avaliação
        await avaliacoesGestorAPI.create(data)
        success('Avaliação salva com sucesso!')
        // Recarregar para obter o ID da avaliação criada
        await loadAvaliacaoExistente()
      }
    } catch (error) {
      handleApiError(error, 'salvar avaliação', '/avaliacoes-gestor', showError)
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
                  <RatingSlider
                    value={respostasFechadas[pergunta.codigo]}
                    onChange={(value) => handleRespostaFechadaChange(pergunta.codigo, value)}
                  />
                  {/* Campo de Justificativa */}
                  <div className="justificativa-container">
                    <label className="justificativa-label">
                      Justificativa {isJustificativaObrigatoria(pergunta.codigo) ? (
                        <span className="required">*</span>
                      ) : (
                        <span className="optional">(opcional)</span>
                      )}
                    </label>
                    <textarea
                      className={`justificativa-textarea ${isJustificativaObrigatoria(pergunta.codigo) && !justificativas[pergunta.codigo]?.trim() ? 'required-field' : ''}`}
                      placeholder={isJustificativaObrigatoria(pergunta.codigo)
                        ? "Justifique sua resposta..."
                        : "Justifique sua resposta (opcional)..."
                      }
                      value={justificativas[pergunta.codigo] || ''}
                      onChange={(e) => handleJustificativaChange(pergunta.codigo, e.target.value)}
                      rows={2}
                    />
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

