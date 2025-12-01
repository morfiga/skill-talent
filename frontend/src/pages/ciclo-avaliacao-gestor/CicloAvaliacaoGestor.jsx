import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ciclosAPI, ciclosAvaliacaoAPI } from '../../services/api'
import '../CicloAvaliacao.css'
import '../Page.css'
import EtapaAutoavaliacaoGestor from './EtapaAutoavaliacaoGestor'
import EtapaAvaliarLideradoIndividual from './EtapaAvaliarLideradoIndividual'
import EtapaAvaliarLiderados from './EtapaAvaliarLiderados'
import EtapaFeedbackGestor from './EtapaFeedbackGestor'

function CicloAvaliacaoGestor({ onLogout }) {
    const navigate = useNavigate()
    const { etapa } = useParams()
    const location = useLocation()
    const { colaboradorId, colaborador } = useAuth()
    const isAdmin = colaborador?.is_admin || false
    const [loading, setLoading] = useState(true)
    const [cicloAberto, setCicloAberto] = useState(null)
    const [cicloAtivo, setCicloAtivo] = useState(null)
    const [etapaAtual, setEtapaAtual] = useState(1)
    const [lideradoSendoAvaliado, setLideradoSendoAvaliado] = useState(null)

    console.log('[DEBUG] CicloAvaliacaoGestor - Componente renderizado', {
        colaboradorId,
        isAdmin,
        etapa,
        pathname: location.pathname,
        loading,
        cicloAberto: cicloAberto?.id,
        cicloAtivo: cicloAtivo?.id,
        etapaAtual
    })

    // Função para verificar se etapa está liberada
    const etapaEstaLiberada = useCallback((etapaNum) => {
        if (!cicloAberto) {
            console.log('[DEBUG] etapaEstaLiberada - cicloAberto é null', { etapaNum })
            return false
        }

        // Para gestores:
        // Etapa 1: Autoavaliação -> avaliacoes
        // Etapa 2: Avaliar Liderados -> avaliacoes
        // Etapa 3: Feedback -> feedback

        let liberada = false

        if (etapaNum === 1 || etapaNum === 2) {
            // Autoavaliação e Avaliar Liderados
            liberada = cicloAberto.etapa_atual === 'avaliacoes' ||
                cicloAberto.etapa_atual === 'feedback'
        } else if (etapaNum === 3) {
            // Feedback
            liberada = cicloAberto.etapa_atual === 'feedback'
        }

        console.log('[DEBUG] etapaEstaLiberada', {
            etapaNum,
            etapaAtualCiclo: cicloAberto.etapa_atual,
            liberada
        })

        return liberada
    }, [cicloAberto])

    // Determinar etapa atual baseada na URL
    useEffect(() => {
        console.log('[DEBUG] useEffect - Determinar etapa atual', {
            pathname: location.pathname,
            etapa
        })

        if (location.pathname.includes('/2/liderado')) {
            // Rota especial para avaliar liderado individual
            console.log('[DEBUG] Rota especial /2/liderado detectada, definindo etapaAtual = 2')
            setEtapaAtual(2)
        } else if (etapa) {
            const etapaNum = parseInt(etapa)
            // Para gestores, máximo é 3 etapas
            const maxEtapas = 3
            if (etapaNum >= 1 && etapaNum <= maxEtapas) {
                console.log('[DEBUG] Definindo etapaAtual a partir da URL', { etapaNum, maxEtapas })
                setEtapaAtual(etapaNum)
            } else {
                console.log('[DEBUG] Etapa inválida na URL', { etapaNum, maxEtapas })
            }
        }
    }, [etapa, location.pathname])

    // Verificar se a etapa atual está liberada ao carregar
    useEffect(() => {
        console.log('[DEBUG] useEffect - Verificar etapa liberada', {
            cicloAberto: !!cicloAberto,
            etapaAtual
        })

        if (cicloAberto && etapaAtual && !etapaEstaLiberada(etapaAtual)) {
            console.log('[DEBUG] Etapa atual não está liberada, redirecionando...', { etapaAtual })
            // Redirecionar para a primeira etapa liberada ou dashboard
            const primeiraEtapa = 1
            if (etapaEstaLiberada(primeiraEtapa)) {
                console.log('[DEBUG] Redirecionando para primeira etapa liberada', { primeiraEtapa })
                navigate(`/ciclo-avaliacao-gestor/${primeiraEtapa}`)
            } else {
                console.log('[DEBUG] Nenhuma etapa liberada, redirecionando para dashboard')
                navigate('/dashboard')
            }
        } else if (cicloAberto && etapaAtual) {
            console.log('[DEBUG] Etapa atual está liberada', { etapaAtual })
        }
    }, [cicloAberto, etapaAtual, navigate, etapaEstaLiberada])

    useEffect(() => {
        console.log('[DEBUG] useEffect - colaboradorId mudou', { colaboradorId })
        if (colaboradorId) {
            console.log('[DEBUG] Carregando dados iniciais')
            loadInitialData()
        } else {
            console.log('[DEBUG] colaboradorId não disponível, pulando carregamento')
        }
    }, [colaboradorId])

    useEffect(() => {
        console.log('[DEBUG] useEffect - cicloAberto ou colaboradorId mudou', {
            cicloAberto: cicloAberto?.id,
            colaboradorId
        })
        if (cicloAberto && colaboradorId) {
            console.log('[DEBUG] Carregando ciclo ativo')
            loadCicloAtivo()
        }
    }, [cicloAberto, colaboradorId])

    const loadInitialData = async () => {
        console.log('[DEBUG] loadInitialData - Iniciando carregamento de dados iniciais')
        try {
            setLoading(true)
            await loadCicloAberto()
            console.log('[DEBUG] loadInitialData - Dados iniciais carregados com sucesso')
        } catch (error) {
            console.error('[DEBUG] loadInitialData - Erro ao carregar dados iniciais:', error)
            alert('Erro ao carregar dados. Tente novamente.')
        } finally {
            setLoading(false)
            console.log('[DEBUG] loadInitialData - Carregamento finalizado')
        }
    }

    const loadCicloAberto = async () => {
        console.log('[DEBUG] loadCicloAberto - Buscando ciclo aberto')
        try {
            const ciclo = await ciclosAPI.getAtivoAberto()
            console.log('[DEBUG] loadCicloAberto - Ciclo aberto encontrado', {
                cicloId: ciclo?.id,
                etapaAtual: ciclo?.etapa_atual,
                ciclo
            })
            setCicloAberto(ciclo)
        } catch (error) {
            console.error('[DEBUG] loadCicloAberto - Erro ao carregar ciclo aberto:', error)
            alert('Nenhum ciclo aberto encontrado. Entre em contato com o administrador.')
        }
    }

    const loadCicloAtivo = async () => {
        console.log('[DEBUG] loadCicloAtivo - Buscando ciclo ativo', {
            cicloAbertoId: cicloAberto?.id
        })
        try {
            if (!cicloAberto) {
                console.log('[DEBUG] loadCicloAtivo - cicloAberto não disponível, abortando')
                return
            }

            const ciclo = await ciclosAvaliacaoAPI.getAtivo()
            console.log('[DEBUG] loadCicloAtivo - Ciclo ativo encontrado', {
                cicloId: ciclo?.id,
                ciclo
            })
            setCicloAtivo(ciclo)
        } catch (error) {
            console.log('[DEBUG] loadCicloAtivo - Nenhum ciclo de avaliação ativo encontrado para este colaborador', error)
        }
    }

    const handleNavegarEtapa = (etapaNum) => {
        console.log('[DEBUG] handleNavegarEtapa - Tentando navegar para etapa', { etapaNum })
        if (!etapaEstaLiberada(etapaNum)) {
            console.log('[DEBUG] handleNavegarEtapa - Etapa não liberada, bloqueando navegação', { etapaNum })
            alert('Esta etapa ainda não foi liberada pelo administrador.')
            return
        }
        console.log('[DEBUG] handleNavegarEtapa - Navegando para etapa', { etapaNum })
        navigate(`/ciclo-avaliacao-gestor/${etapaNum}`)
    }

    const handleIniciarAvaliacaoLiderado = (liderado) => {
        console.log('[DEBUG] handleIniciarAvaliacaoLiderado - Iniciando avaliação de liderado', {
            lideradoId: liderado?.id,
            lideradoNome: liderado?.nome,
            liderado
        })
        setLideradoSendoAvaliado(liderado)
        // Salvar liderado no localStorage para recuperar na rota
        localStorage.setItem('lideradoSendoAvaliado', JSON.stringify(liderado))
        console.log('[DEBUG] handleIniciarAvaliacaoLiderado - Navegando para /ciclo-avaliacao-gestor/2/liderado')
        navigate('/ciclo-avaliacao-gestor/2/liderado')
    }

    const handleAvaliacaoLideradoFinalizada = () => {
        console.log('[DEBUG] handleAvaliacaoLideradoFinalizada - Avaliação de liderado finalizada')
        setLideradoSendoAvaliado(null)
        localStorage.removeItem('lideradoSendoAvaliado')
        // Não navegar automaticamente - usuário pode navegar manualmente
    }

    // Carregar liderado do localStorage quando necessário
    useEffect(() => {
        console.log('[DEBUG] useEffect - Carregar liderado do localStorage', {
            pathname: location.pathname,
            isRotaLiderado: location.pathname.includes('/2/liderado')
        })
        if (location.pathname.includes('/2/liderado')) {
            const lideradoSalvo = localStorage.getItem('lideradoSendoAvaliado')
            if (lideradoSalvo) {
                try {
                    const liderado = JSON.parse(lideradoSalvo)
                    console.log('[DEBUG] Liderado carregado do localStorage', { liderado })
                    setLideradoSendoAvaliado(liderado)
                } catch (error) {
                    console.error('[DEBUG] Erro ao carregar liderado do localStorage:', error)
                }
            } else {
                console.log('[DEBUG] Nenhum liderado encontrado no localStorage')
            }
        }
    }, [location.pathname])

    // Renderizar menu lateral
    const renderMenuLateral = () => {
        const etapasGestor = [
            {
                numero: 1,
                titulo: 'Autoavaliação',
                descricao: 'Avalie seu desempenho',
                icone: '📝'
            },
            {
                numero: 2,
                titulo: 'Avaliar Liderados',
                descricao: 'Avalie seus liderados',
                icone: '👥'
            },
            {
                numero: 3,
                titulo: 'Feedback',
                descricao: 'Veja sua avaliação',
                icone: '📊'
            }
        ]

        return (
            <div className="menu-lateral">
                <div className="menu-lateral-header">
                    <h3 className="menu-lateral-title">Etapas do Ciclo</h3>
                </div>
                <div className="menu-lateral-etapas">
                    {etapasGestor.map((etapa) => {
                        const isAtiva = etapaAtual === etapa.numero
                        const podeNavegar = etapaEstaLiberada(etapa.numero)
                        const etapaBloqueada = !podeNavegar

                        return (
                            <div
                                key={etapa.numero}
                                className={`menu-etapa-item ${isAtiva ? 'ativa' : ''} ${etapaBloqueada ? 'bloqueada' : ''}`}
                                onClick={() => podeNavegar && handleNavegarEtapa(etapa.numero)}
                                title={etapaBloqueada ? 'Esta etapa ainda não foi liberada pelo administrador' : ''}
                            >
                                <div className="menu-etapa-conteudo">
                                    <div className="menu-etapa-icone">{etapa.icone}</div>
                                    <div className="menu-etapa-info">
                                        <p className="menu-etapa-titulo">{etapa.titulo}</p>
                                        <p className="menu-etapa-descricao">{etapa.descricao}</p>
                                    </div>
                                </div>
                                {isAtiva && <div className="menu-etapa-indicador" />}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    if (loading) {
        console.log('[DEBUG] Renderizando estado de loading')
        return (
            <div className="page-container">
                <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
            </div>
        )
    }

    if (!cicloAberto) {
        console.log('[DEBUG] Renderizando - Nenhum ciclo aberto encontrado')
        return (
            <div className="page-container">
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    Nenhum ciclo aberto encontrado. Entre em contato com o administrador.
                </div>
            </div>
        )
    }

    // Se estiver na rota de avaliar liderado individual
    if (location.pathname.includes('/2/liderado')) {
        console.log('[DEBUG] Renderizando - Rota de avaliar liderado individual', {
            lideradoSendoAvaliado: lideradoSendoAvaliado?.id
        })
        return (
            <div className="page-container">
                <header className="page-header">
                    <div className="header-content">
                        <button className="back-button" onClick={() => navigate('/dashboard')}>
                            ← Voltar
                        </button>
                        <h1 className="page-title">Ciclo de avaliação - Gestor</h1>
                        <div className="header-buttons">
                            {isAdmin && (
                                <button className="admin-button" onClick={() => navigate('/admin')}>
                                    Administração
                                </button>
                            )}
                            <button className="logout-button" onClick={onLogout}>
                                Sair
                            </button>
                        </div>
                    </div>
                </header>

                <div className="ciclo-layout">
                    {renderMenuLateral()}
                    <main className="ciclo-main">
                        <div className="ciclo-content">
                            <EtapaAvaliarLideradoIndividual
                                colaboradorId={colaboradorId}
                                cicloAberto={cicloAberto}
                                lideradoSendoAvaliado={lideradoSendoAvaliado}
                                onVoltar={() => navigate('/ciclo-avaliacao-gestor/2')}
                            />
                        </div>
                    </main>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-content">
                    <button className="back-button" onClick={() => navigate('/dashboard')}>
                        ← Voltar
                    </button>
                    <h1 className="page-title">Ciclo de avaliação - Gestor</h1>
                    <div className="header-buttons">
                        {isAdmin && (
                            <button className="admin-button" onClick={() => navigate('/admin')}>
                                Administração
                            </button>
                        )}
                        <button className="logout-button" onClick={onLogout}>
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <div className="ciclo-layout">
                {renderMenuLateral()}
                <main className="ciclo-main">
                    <div className="ciclo-content">
                        {(() => {
                            const etapaLiberada = etapaEstaLiberada(etapaAtual)
                            if (!etapaLiberada) {
                                console.log('[DEBUG] Renderizando - Etapa não liberada', { etapaAtual })
                            } else {
                                console.log('[DEBUG] Renderizando - Etapas do ciclo', {
                                    etapaAtual,
                                    cicloAbertoId: cicloAberto?.id,
                                    cicloAtivoId: cicloAtivo?.id
                                })
                            }
                            return !etapaLiberada ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <h2>Etapa não liberada</h2>
                                    <p>Esta etapa ainda não foi liberada pelo administrador.</p>
                                    <p>Entre em contato com o administrador para mais informações.</p>
                                    <button
                                        className="back-button"
                                        onClick={() => navigate('/dashboard')}
                                        style={{ marginTop: '20px' }}
                                    >
                                        Voltar ao Dashboard
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {etapaAtual === 1 && (
                                        <EtapaAutoavaliacaoGestor
                                            colaboradorId={colaboradorId}
                                            cicloAberto={cicloAberto}
                                            onVoltar={() => navigate('/dashboard')}
                                        />
                                    )}
                                    {etapaAtual === 2 && (
                                        <EtapaAvaliarLiderados
                                            colaboradorId={colaboradorId}
                                            cicloAberto={cicloAberto}
                                            onIniciarAvaliacao={handleIniciarAvaliacaoLiderado}
                                            onVoltar={() => navigate('/ciclo-avaliacao-gestor/1')}
                                        />
                                    )}
                                    {etapaAtual === 3 && (
                                        <EtapaFeedbackGestor
                                            colaborador={colaborador}
                                            cicloAberto={cicloAberto}
                                            onVoltar={() => navigate('/ciclo-avaliacao-gestor/2')}
                                        />
                                    )}
                                </>
                            )
                        })()}
                    </div>
                </main>
            </div>
        </div>
    )
}

export default CicloAvaliacaoGestor

