import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { ciclosAPI } from '../../services/api'
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
    const { warning, info } = useToast()
    const isAdmin = colaborador?.is_admin || false
    const [loading, setLoading] = useState(true)
    const [cicloAberto, setCicloAberto] = useState(null)
    const [etapaAtual, setEtapaAtual] = useState(1)
    const [lideradoSendoAvaliado, setLideradoSendoAvaliado] = useState(null)

    // Função para verificar se etapa está liberada
    const etapaEstaLiberada = useCallback((etapaNum) => {
        if (!cicloAberto) {
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

        return liberada
    }, [cicloAberto])

    // Determinar etapa atual baseada na URL
    useEffect(() => {
        if (location.pathname.includes('/2/liderado')) {
            // Rota especial para avaliar liderado individual
            setEtapaAtual(2)
        } else if (etapa) {
            const etapaNum = parseInt(etapa)
            // Para gestores, máximo é 3 etapas
            const maxEtapas = 3
            if (etapaNum >= 1 && etapaNum <= maxEtapas) {
                setEtapaAtual(etapaNum)
            }
        }
    }, [etapa, location.pathname])

    // Verificar se a etapa atual está liberada ao carregar
    useEffect(() => {
        if (cicloAberto && etapaAtual && !etapaEstaLiberada(etapaAtual)) {
            // Redirecionar para a primeira etapa liberada ou dashboard
            const primeiraEtapa = 1
            if (etapaEstaLiberada(primeiraEtapa)) {
                navigate(`/ciclo-avaliacao-gestor/${primeiraEtapa}`)
            } else {
                navigate('/dashboard')
            }
        }
    }, [cicloAberto, etapaAtual, navigate, etapaEstaLiberada])

    useEffect(() => {
        if (colaboradorId) {
            loadInitialData()
        }
    }, [colaboradorId])

    const loadInitialData = async () => {
        try {
            setLoading(true)
            await loadCicloAberto()
        } catch (error) {
            handleApiError(error, 'carregar ciclo aberto', '/ciclos/ativo/aberto', null)
        } finally {
            setLoading(false)
        }
    }

    const loadCicloAberto = async () => {
        const ciclo = await ciclosAPI.getAtivoAberto()
        setCicloAberto(ciclo)
    }

    const handleNavegarEtapa = (etapaNum) => {
        if (!etapaEstaLiberada(etapaNum)) {
            info('Esta etapa ainda não foi liberada pelo administrador.')
            return
        }
        navigate(`/ciclo-avaliacao-gestor/${etapaNum}`)
    }

    const handleIniciarAvaliacaoLiderado = (liderado) => {
        setLideradoSendoAvaliado(liderado)
        // Salvar liderado no localStorage para recuperar na rota
        localStorage.setItem('lideradoSendoAvaliado', JSON.stringify(liderado))
        navigate('/ciclo-avaliacao-gestor/2/liderado')
    }

    // Carregar liderado do localStorage quando necessário
    useEffect(() => {
        if (location.pathname.includes('/2/liderado')) {
            const lideradoSalvo = localStorage.getItem('lideradoSendoAvaliado')
            if (lideradoSalvo) {
                const liderado = JSON.parse(lideradoSalvo)
                setLideradoSendoAvaliado(liderado)
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
        return (
            <div className="page-container">
                <div style={{ textAlign: 'center', padding: '40px' }}>Carregando...</div>
            </div>
        )
    }

    if (!cicloAberto) {
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

