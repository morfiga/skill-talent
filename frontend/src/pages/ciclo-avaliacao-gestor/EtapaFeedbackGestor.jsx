import { useEffect, useMemo, useState } from 'react'
import { avaliacoesGestorAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import '../CicloAvaliacao.css'

function EtapaFeedbackGestor({ colaborador, cicloAberto, onVoltar, isAdminView = false }) {
    const [perguntas, setPerguntas] = useState(null)
    const [autoavaliacao, setAutoavaliacao] = useState({
        respostasFechadas: {},
        respostasAbertas: {}
    })
    const [avaliacoesRecebidas, setAvaliacoesRecebidas] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (cicloAberto && colaborador?.id) {
            loadFeedback()
        }
    }, [cicloAberto, colaborador?.id, isAdminView])

    const loadFeedback = async () => {
        if (!cicloAberto || !colaborador?.id) return

        try {
            setLoading(true)

            // Carregar perguntas
            const perguntasResponse = await avaliacoesGestorAPI.getPerguntas()
            setPerguntas(perguntasResponse)

            // Carregar autoavaliação do gestor (gestor_id = colaborador_id)
            const autoavaliacaoResponse = await avaliacoesGestorAPI.getAll({
                ciclo_id: cicloAberto.id,
                colaborador_id: colaborador.id,
                gestor_id: colaborador.id
            })
            const autoavaliacoes = autoavaliacaoResponse.avaliacoes || []

            if (autoavaliacoes.length > 0) {
                const autoavaliacaoData = autoavaliacoes[0]
                const respostasFechadas = {}
                const respostasAbertas = {}

                autoavaliacaoData.respostas?.forEach(resposta => {
                    if (resposta.resposta_escala !== null) {
                        respostasFechadas[resposta.pergunta_codigo] = resposta.resposta_escala
                    }
                    if (resposta.resposta_texto !== null) {
                        respostasAbertas[resposta.pergunta_codigo] = resposta.resposta_texto
                    }
                })

                setAutoavaliacao({
                    respostasFechadas,
                    respostasAbertas
                })
            }

            // Carregar avaliações recebidas pelo gestor (de seus liderados)
            const avaliacoesResponse = await avaliacoesGestorAPI.getAll({
                ciclo_id: cicloAberto.id,
                gestor_id: colaborador.id
            })
            const todasAvaliacoes = avaliacoesResponse.avaliacoes || []

            // Filtrar para excluir a autoavaliação
            const avaliacoesRecebidasData = todasAvaliacoes.filter(
                av => av.colaborador_id !== colaborador.id
            )
            setAvaliacoesRecebidas(avaliacoesRecebidasData)
        } catch (error) {
            handleApiError(error, 'carregar feedback', '/avaliacoes-gestor')
        } finally {
            setLoading(false)
        }
    }

    // Calcular média das respostas fechadas por pergunta
    const calcularMediaPerguntasFechadas = useMemo(() => {
        if (!perguntas || avaliacoesRecebidas.length === 0) return {}

        const medias = {}
        const perguntasFechadas = perguntas.perguntas_fechadas || {}

        Object.keys(perguntasFechadas).forEach(codigo => {
            const valores = []
            avaliacoesRecebidas.forEach(avaliacao => {
                const resposta = avaliacao.respostas?.find(r => r.pergunta_codigo === codigo && r.resposta_escala !== null)
                if (resposta) {
                    valores.push(resposta.resposta_escala)
                }
            })

            if (valores.length > 0) {
                medias[codigo] = valores.reduce((sum, val) => sum + val, 0) / valores.length
            } else {
                medias[codigo] = 0
            }
        })

        return medias
    }, [perguntas, avaliacoesRecebidas])

    // Agrupar perguntas abertas por código
    const perguntasAbertasAgrupadas = useMemo(() => {
        if (!perguntas || avaliacoesRecebidas.length === 0) return {}

        const agrupadas = {}
        const perguntasAbertas = perguntas.perguntas_abertas || {}

        Object.keys(perguntasAbertas).forEach(codigo => {
            agrupadas[codigo] = []
            avaliacoesRecebidas.forEach(avaliacao => {
                const resposta = avaliacao.respostas?.find(r => r.pergunta_codigo === codigo && r.resposta_texto !== null)
                if (resposta && resposta.resposta_texto.trim() !== '') {
                    agrupadas[codigo].push({
                        resposta: resposta.resposta_texto
                    })
                }
            })
        })

        return agrupadas
    }, [perguntas, avaliacoesRecebidas])

    const getPerguntasPorCategoria = (categoriaCodigo) => {
        if (!perguntas) return { fechadas: [], abertas: [] }

        const fechadas = Object.entries(perguntas.perguntas_fechadas || {})
            .filter(([codigo, info]) => info.categoria === categoriaCodigo)
            .map(([codigo, info]) => ({ codigo, ...info }))

        const abertas = Object.entries(perguntas.perguntas_abertas || {})
            .filter(([codigo, info]) => info.categoria === categoriaCodigo)
            .map(([codigo, info]) => ({ codigo, ...info }))

        return { fechadas, abertas }
    }

    // Calcular média por categoria
    const calcularMediaPorCategoria = useMemo(() => {
        if (!perguntas) return {}

        const mediasPorCategoria = {}
        const categorias = Object.keys(perguntas.categorias || {})

        categorias.forEach(categoriaCodigo => {
            const perguntasFechadas = Object.entries(perguntas.perguntas_fechadas || {})
                .filter(([codigo, info]) => info.categoria === categoriaCodigo)
                .map(([codigo]) => codigo)

            // Média da autoavaliação para esta categoria
            const valoresAuto = perguntasFechadas
                .map(codigo => autoavaliacao.respostasFechadas[codigo])
                .filter(val => val !== undefined && val !== null && val > 0)

            const mediaAuto = valoresAuto.length > 0
                ? valoresAuto.reduce((sum, val) => sum + val, 0) / valoresAuto.length
                : 0

            // Média recebida para esta categoria
            const valoresRecebidos = perguntasFechadas
                .map(codigo => calcularMediaPerguntasFechadas[codigo])
                .filter(val => val !== undefined && val !== null && val > 0)

            const mediaRecebida = valoresRecebidos.length > 0
                ? valoresRecebidos.reduce((sum, val) => sum + val, 0) / valoresRecebidos.length
                : 0

            mediasPorCategoria[categoriaCodigo] = {
                autoavaliacao: mediaAuto,
                mediaRecebida: mediaRecebida
            }
        })

        return mediasPorCategoria
    }, [perguntas, autoavaliacao.respostasFechadas, calcularMediaPerguntasFechadas])

    if (loading) {
        return <div>Carregando feedback...</div>
    }

    if (!perguntas) {
        return <div>Erro ao carregar perguntas. Tente novamente.</div>
    }

    const categorias = Object.entries(perguntas.categorias || {})

    return (
        <>
            <div className="ciclo-header">
                <h2 className="ciclo-step-title">Feedback</h2>
                <p className="ciclo-step-description">
                    Visualize sua autoavaliação comparada com a média recebida de seus liderados
                </p>
            </div>

            <div className="feedback-section">
                {/* Gráfico Comparativo - Perguntas Fechadas */}
                {categorias.map(([categoriaCodigo, categoriaNome]) => {
                    const { fechadas } = getPerguntasPorCategoria(categoriaCodigo)
                    if (fechadas.length === 0) return null

                    return (
                        <div key={categoriaCodigo} className="grafico-container">
                            <h3 className="grafico-title">{categoriaNome} - Comparativo</h3>
                            <div className="grafico-area">
                                <div className="grafico-eixos">
                                    {fechadas.map((pergunta) => {
                                        const autoavaliacaoValor = autoavaliacao.respostasFechadas[pergunta.codigo] || 0
                                        const mediaRecebida = calcularMediaPerguntasFechadas[pergunta.codigo] || 0

                                        return (
                                            <div key={pergunta.codigo} className="grafico-barra-container">
                                                <div className="grafico-label">{pergunta.texto}</div>
                                                <div className="grafico-barras">
                                                    <div className="grafico-barra-wrapper">
                                                        <div
                                                            className="grafico-barra autoavaliacao"
                                                            style={{ height: `${(autoavaliacaoValor / 5) * 100}%` }}
                                                            title={`Autoavaliação: ${autoavaliacaoValor || '-'}`}
                                                        />
                                                        <span className="grafico-barra-valor autoavaliacao">{autoavaliacaoValor || '-'}</span>
                                                    </div>
                                                    <div className="grafico-barra-wrapper">
                                                        <div
                                                            className="grafico-barra media-recebida"
                                                            style={{ height: `${(mediaRecebida / 5) * 100}%` }}
                                                            title={`Média Recebida: ${mediaRecebida > 0 ? mediaRecebida.toFixed(1) : '-'}`}
                                                        />
                                                        <span className="grafico-barra-valor media-recebida">{mediaRecebida > 0 ? mediaRecebida.toFixed(1) : '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="grafico-legend">
                                    <div className="legend-item">
                                        <div className="legend-color autoavaliacao"></div>
                                        <span>Autoavaliação</span>
                                        <span className="media-categoria-valor autoavaliacao">
                                            {calcularMediaPorCategoria[categoriaCodigo]?.autoavaliacao > 0
                                                ? calcularMediaPorCategoria[categoriaCodigo].autoavaliacao.toFixed(1)
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-color media-recebida"></div>
                                        <span>Média Recebida</span>
                                        <span className="media-categoria-valor media-recebida">
                                            {calcularMediaPorCategoria[categoriaCodigo]?.mediaRecebida > 0
                                                ? calcularMediaPorCategoria[categoriaCodigo].mediaRecebida.toFixed(1)
                                                : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {/* Listagem de Perguntas Abertas */}
                {categorias.map(([categoriaCodigo, categoriaNome]) => {
                    const { abertas } = getPerguntasPorCategoria(categoriaCodigo)
                    if (abertas.length === 0) return null

                    return (
                        <div key={categoriaCodigo} className="perguntas-abertas-container">
                            <h3 className="perguntas-abertas-title">{categoriaNome} - Feedback dos Liderados</h3>
                            {abertas.map((pergunta) => {
                                const respostas = perguntasAbertasAgrupadas[pergunta.codigo] || []

                                if (respostas.length === 0) {
                                    return (
                                        <div key={pergunta.codigo} className="pergunta-aberta-card">
                                            <h4 className="pergunta-aberta-texto">{pergunta.texto}</h4>
                                            <p className="sem-respostas">Nenhuma resposta recebida ainda.</p>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={pergunta.codigo} className="pergunta-aberta-card">
                                        <h4 className="pergunta-aberta-texto">{pergunta.texto}</h4>
                                        <div className="respostas-lista">
                                            {respostas.map((resposta, index) => (
                                                <div key={index} className="resposta-item">
                                                    {resposta.colaborador_nome && (
                                                        <div className="resposta-header">
                                                            <span className="resposta-autor">{resposta.colaborador_nome}</span>
                                                        </div>
                                                    )}
                                                    <div className="resposta-conteudo">
                                                        {resposta.resposta}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}

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

export default EtapaFeedbackGestor
