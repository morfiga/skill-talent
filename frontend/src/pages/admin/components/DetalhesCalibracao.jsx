import { useState } from 'react'
import Avatar from '../../../components/Avatar'
import ListaEntregasOutstanding from './ListaEntregasOutstanding'
import ListaRegistrosValor from './ListaRegistrosValor'

function DetalhesCalibracao({
  colaborador,
  avaliacoes,
  avaliacoesGestor,
  eixosAvaliacao,
  perguntas,
  onVoltar,
  loading
}) {
  const [comentariosExpandidos, setComentariosExpandidos] = useState({})

  const toggleComentarios = (avaliacaoId) => {
    setComentariosExpandidos(prev => ({
      ...prev,
      [avaliacaoId]: !prev[avaliacaoId]
    }))
  }

  const getNivelEixo = (avaliacao, eixoId) => {
    const eixosList = avaliacao.eixos_detalhados || avaliacao.eixos || []
    if (!Array.isArray(eixosList)) return '-'
    const eixoAvaliado = eixosList.find(e => e.eixo_id === eixoId)
    return eixoAvaliado ? eixoAvaliado.nivel : '-'
  }

  const getNivelClass = (nivel) => {
    if (nivel >= 4) return 'nivel-badge high'
    if (nivel <= 2) return 'nivel-badge low'
    if (nivel === 3) return 'nivel-badge medium'
    return 'nivel-badge'
  }

  const getRespostaEscalaClass = (escala) => {
    if (escala >= 4) return 'resposta-escala alta'
    if (escala <= 2) return 'resposta-escala baixa'
    return 'resposta-escala media'
  }

  const getTextoPergunta = (codigo) => {
    if (!codigo) return ''

    // Procurar em perguntas fechadas
    if (perguntas?.perguntas_fechadas?.[codigo]) {
      return perguntas.perguntas_fechadas[codigo].texto
    }

    // Procurar em perguntas abertas
    if (perguntas?.perguntas_abertas?.[codigo]) {
      return perguntas.perguntas_abertas[codigo].texto
    }

    // Fallback: retornar o código se não encontrar
    return codigo
  }

  return (
    <div>
      <div className="detalhes-header">
        <button className="voltar-button" onClick={onVoltar}>
          ← Voltar para Lista
        </button>
        <div className="detalhes-info">
          <Avatar
            avatar={colaborador.avatar}
            nome={colaborador.nome}
            size={60}
          />
          <div>
            <h3 className="detalhes-nome">{colaborador.nome}</h3>
            <p className="detalhes-cargo">
              {colaborador.cargo || ''} {colaborador.departamento ? `• ${colaborador.departamento}` : ''}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p className="empty-text">Carregando avaliações...</p>
        </div>
      ) : avaliacoes.length === 0 && avaliacoesGestor.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p className="empty-text">Nenhuma avaliação encontrada para este colaborador.</p>
        </div>
      ) : (
        <div>
          {/* Entregas Outstanding e Registros de Valor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <ListaEntregasOutstanding colaboradorId={colaborador.id} />
            <ListaRegistrosValor colaboradorId={colaborador.id} />
          </div>

          {/* Avaliações de Competências */}
          {avaliacoes.length > 0 && (
            <>
              <h3 className="secao-titulo">Avaliações ({avaliacoes.length})</h3>
              {eixosAvaliacao.length > 0 ? (
                <div className="table-container" style={{ overflowX: 'auto' }}>
                  <table className="colaboradores-table avaliacoes-table">
                    <thead>
                      <tr>
                        <th className="sticky-col">Tipo / Avaliador</th>
                        {eixosAvaliacao.map((eixo) => (
                          <th key={eixo.id} className="col-center">
                            {eixo.nome}
                          </th>
                        ))}
                        <th className="col-comentarios">Comentários</th>
                      </tr>
                    </thead>
                    <tbody>
                      {avaliacoes.map((avaliacao) => {
                        const comentariosAberto = comentariosExpandidos[avaliacao.id] || false
                        const eixosList = avaliacao.eixos_detalhados || avaliacao.eixos || []
                        const temComentarios = avaliacao.avaliacao_geral ||
                          (Array.isArray(eixosList) && eixosList.some(e => e.justificativa))

                        return (
                          <>
                            <tr key={avaliacao.id}>
                              <td className="sticky-col">
                                <div className="avaliador-info">
                                  <div className="avaliador-tipo">
                                    {avaliacao.tipo === 'autoavaliacao' ? 'Autoavaliação' :
                                      avaliacao.tipo === 'gestor' ? 'Avaliação do Gestor' :
                                        'Avaliação de Par'}
                                  </div>
                                  {avaliacao.avaliador && avaliacao.tipo !== 'autoavaliacao' && (
                                    <div className="avaliador-nome">
                                      {avaliacao.avaliador.nome}
                                    </div>
                                  )}
                                </div>
                              </td>
                              {eixosAvaliacao.map((eixo) => {
                                const nivel = getNivelEixo(avaliacao, eixo.id)
                                return (
                                  <td key={eixo.id} className="cell-center">
                                    {nivel !== '-' ? (
                                      <span className={getNivelClass(nivel)}>
                                        {nivel}
                                      </span>
                                    ) : (
                                      <span className="nivel-vazio">-</span>
                                    )}
                                  </td>
                                )
                              })}
                              <td>
                                {temComentarios ? (
                                  <button
                                    className="action-button"
                                    onClick={() => toggleComentarios(avaliacao.id)}
                                  >
                                    {comentariosAberto ? 'Ocultar' : 'Ver'}
                                  </button>
                                ) : (
                                  <span className="nivel-vazio">-</span>
                                )}
                              </td>
                            </tr>
                            {comentariosAberto && temComentarios && (
                              <tr key={`${avaliacao.id}-comentarios`}>
                                <td colSpan={eixosAvaliacao.length + 2} className="comentarios-expandidos">
                                  <div className="comentarios-container">
                                    {avaliacao.avaliacao_geral && (
                                      <div className="comentario-secao">
                                        <h5 className="comentario-titulo">Avaliação Geral</h5>
                                        <p className="comentario-texto">{avaliacao.avaliacao_geral}</p>
                                      </div>
                                    )}
                                    {eixosList && eixosList.length > 0 && (
                                      <div>
                                        <h5 className="comentario-titulo">Justificativas por Eixo</h5>
                                        <div className="justificativas-grid">
                                          {eixosList
                                            .filter(e => e.justificativa)
                                            .map((eixo) => (
                                              <div key={eixo.id} className="justificativa-card">
                                                <div className="justificativa-header">
                                                  <strong className="justificativa-eixo">
                                                    {eixo.eixo?.nome || `Eixo ${eixo.eixo_id}`}
                                                  </strong>
                                                  <span className="justificativa-nivel">
                                                    Nível {eixo.nivel}
                                                  </span>
                                                </div>
                                                <p className="justificativa-texto">{eixo.justificativa}</p>
                                              </div>
                                            ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">⏳</div>
                  <p className="empty-text">Carregando eixos de avaliação...</p>
                </div>
              )}
            </>
          )}

          {/* Avaliações de Gestor */}
          {avaliacoesGestor.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h3 className="secao-titulo-gestor">
                👔 Avaliações de Gestor Recebidas ({avaliacoesGestor.filter(av => av.colaborador_id !== av.gestor_id).length})
              </h3>
              <p className="secao-subtitulo">
                Avaliações que os liderados fizeram do gestor
              </p>

              {avaliacoesGestor.filter(av => av.colaborador_id !== av.gestor_id).map((avaliacao) => {
                const respostasFechadas = avaliacao.respostas?.filter(r => r.resposta_escala !== null) || []
                const respostasAbertas = avaliacao.respostas?.filter(r => r.resposta_texto !== null) || []
                const isExpanded = comentariosExpandidos[`gestor-${avaliacao.id}`] || false

                return (
                  <div key={avaliacao.id} className="avaliacao-gestor-card">
                    <div className="avaliacao-gestor-header">
                      <div className="avaliador-gestor-info">
                        <Avatar
                          avatar={avaliacao.colaborador?.avatar}
                          nome={avaliacao.colaborador?.nome || 'Avaliador'}
                          size={40}
                        />
                        <div className="avaliador-gestor-detalhes">
                          <div className="avaliador-gestor-nome">
                            {avaliacao.colaborador?.nome || 'Avaliador'}
                          </div>
                          <div className="avaliador-gestor-cargo">
                            {avaliacao.colaborador?.cargo || ''}
                          </div>
                        </div>
                      </div>
                      <button
                        className="action-button"
                        onClick={() => toggleComentarios(`gestor-${avaliacao.id}`)}
                      >
                        {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="avaliacao-gestor-body">
                        {respostasFechadas.length > 0 && (
                          <div className="perguntas-secao">
                            <h5 className="comentario-titulo">Perguntas de Escala (1-5)</h5>
                            <div className="perguntas-grid">
                              {respostasFechadas.map((resposta, idx) => (
                                <div key={idx} className="pergunta-card">
                                  <div className="pergunta-conteudo">
                                    <div className="pergunta-texto-area">
                                      <div className="pergunta-titulo">
                                        {getTextoPergunta(resposta.pergunta_codigo)}
                                      </div>
                                      {resposta.justificativa && (
                                        <div className="pergunta-justificativa">
                                          "{resposta.justificativa}"
                                        </div>
                                      )}
                                    </div>
                                    <span className={getRespostaEscalaClass(resposta.resposta_escala)}>
                                      {resposta.resposta_escala}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {respostasAbertas.length > 0 && (
                          <div className="perguntas-secao">
                            <h5 className="comentario-titulo">Perguntas Abertas</h5>
                            <div className="perguntas-grid">
                              {respostasAbertas.map((resposta, idx) => (
                                <div key={idx} className="pergunta-card">
                                  <div className="pergunta-titulo aberta">
                                    {getTextoPergunta(resposta.pergunta_codigo)}
                                  </div>
                                  <div className="pergunta-resposta-texto">
                                    {resposta.resposta_texto}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Autoavaliação de Gestor */}
              {avaliacoesGestor.filter(av => av.colaborador_id === av.gestor_id).length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h4 className="secao-titulo" style={{ color: '#1976d2' }}>
                    📝 Autoavaliação de Gestor
                  </h4>
                  {avaliacoesGestor.filter(av => av.colaborador_id === av.gestor_id).map((avaliacao) => {
                    const respostasFechadas = avaliacao.respostas?.filter(r => r.resposta_escala !== null) || []
                    const respostasAbertas = avaliacao.respostas?.filter(r => r.resposta_texto !== null) || []
                    const isExpanded = comentariosExpandidos[`auto-gestor-${avaliacao.id}`] || false

                    return (
                      <div key={avaliacao.id} className="avaliacao-gestor-card">
                        <div className="avaliacao-gestor-header auto">
                          <div className="avaliador-gestor-nome">
                            Autoavaliação como Gestor
                          </div>
                          <button
                            className="action-button"
                            onClick={() => toggleComentarios(`auto-gestor-${avaliacao.id}`)}
                          >
                            {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="avaliacao-gestor-body">
                            {respostasFechadas.length > 0 && (
                              <div className="perguntas-secao">
                                <h5 className="comentario-titulo">Perguntas de Escala (1-5)</h5>
                                <div className="perguntas-grid">
                                  {respostasFechadas.map((resposta, idx) => (
                                    <div key={idx} className="pergunta-card">
                                      <div className="pergunta-conteudo">
                                        <div className="pergunta-texto-area">
                                          <div className="pergunta-titulo">
                                            {getTextoPergunta(resposta.pergunta_codigo)}
                                          </div>
                                          {resposta.justificativa && (
                                            <div className="pergunta-justificativa">
                                              "{resposta.justificativa}"
                                            </div>
                                          )}
                                        </div>
                                        <span className={getRespostaEscalaClass(resposta.resposta_escala)}>
                                          {resposta.resposta_escala}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {respostasAbertas.length > 0 && (
                              <div className="perguntas-secao">
                                <h5 className="comentario-titulo">Perguntas Abertas</h5>
                                <div className="perguntas-grid">
                                  {respostasAbertas.map((resposta, idx) => (
                                    <div key={idx} className="pergunta-card">
                                      <div className="pergunta-titulo aberta-gestor">
                                        {getTextoPergunta(resposta.pergunta_codigo)}
                                      </div>
                                      <div className="pergunta-resposta-texto">
                                        {resposta.resposta_texto}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DetalhesCalibracao
