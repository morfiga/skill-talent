import Avatar from '../../../components/Avatar'
import ListaEntregasOutstanding from './ListaEntregasOutstanding'
import ListaRegistrosValor from './ListaRegistrosValor'

function DetalhesAcompanhamentoColaborador({ colaborador, onVoltar }) {
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

            <div className="detalhes-conteudo">
                <h3 className="secao-titulo">📊 Progresso no Ciclo</h3>
                <div className="progresso-grid">
                    {colaborador.tem_gestor && (
                        <div className="progresso-item">
                            <div className="progresso-label">Escolha de Pares</div>
                            {colaborador.escolheu_pares ? (
                                <span className="progresso-badge completo">✓ Completo</span>
                            ) : (
                                <span className="progresso-badge pendente">
                                    {colaborador.qtd_pares_escolhidos || 0}/4
                                </span>
                            )}
                        </div>
                    )}

                    {colaborador.tem_gestor && (
                        <div className="progresso-item">
                            <div className="progresso-label">Avaliações de Pares</div>
                            <span className={`progresso-badge ${colaborador.avaliacoes_pares_realizadas >= colaborador.avaliacoes_pares_total
                                && colaborador.avaliacoes_pares_total > 0
                                ? 'completo'
                                : 'parcial'
                                }`}>
                                {colaborador.avaliacoes_pares_realizadas || 0}/{colaborador.avaliacoes_pares_total}
                            </span>
                        </div>
                    )}

                    {colaborador.tem_gestor && (
                        <div className="progresso-item">
                            <div className="progresso-label">Autoavaliação</div>
                            {colaborador.fez_autoavaliacao ? (
                                <span className="progresso-badge completo">✓ Feita</span>
                            ) : (
                                <span className="progresso-badge pendente">Pendente</span>
                            )}
                        </div>
                    )}

                    {colaborador.tem_gestor && (
                        <div className="progresso-item">
                            <div className="progresso-label">Avaliação do Gestor</div>
                            {colaborador.fez_avaliacao_gestor ? (
                                <span className="progresso-badge completo">✓ Feita</span>
                            ) : (
                                <span className="progresso-badge pendente">Pendente</span>
                            )}
                        </div>
                    )}

                    {!colaborador.tem_gestor && (
                        <div className="progresso-item">
                            <div className="progresso-label">Autoavaliação</div>
                            {colaborador.fez_autoavaliacao_gestor ? (
                                <span className="progresso-badge completo">✓ Feita</span>
                            ) : (
                                <span className="progresso-badge pendente">Pendente</span>
                            )}
                        </div>
                    )}

                    {colaborador.avaliacoes_liderados_total > 0 && (
                        <div className="progresso-item">
                            <div className="progresso-label">Avaliações dos Liderados</div>
                            <span className={`progresso-badge ${colaborador.avaliacoes_liderados_realizadas >= colaborador.avaliacoes_liderados_total
                                ? 'completo'
                                : 'parcial'
                                }`}>
                                {colaborador.avaliacoes_liderados_realizadas || 0}/{colaborador.avaliacoes_liderados_total}
                            </span>
                        </div>
                    )}
                </div>

                <ListaEntregasOutstanding colaboradorId={colaborador.colaborador_id || colaborador.id} />
                <ListaRegistrosValor colaboradorId={colaborador.colaborador_id || colaborador.id} />
            </div>
        </div>
    )
}

export default DetalhesAcompanhamentoColaborador

