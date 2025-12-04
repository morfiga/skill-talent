import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { ciclosAPI, ciclosAvaliacaoAPI, colaboradoresAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import '../CicloAvaliacao.css'
import '../Page.css'
import EtapaAutoavaliacao from './EtapaAutoavaliacao'
import EtapaAvaliacaoGestor from './EtapaAvaliacaoGestor'
import EtapaAvaliarPares from './EtapaAvaliarPares'
import EtapaAvaliarParIndividual from './EtapaAvaliarParIndividual'
import EtapaEscolhaPares from './EtapaEscolhaPares'
import EtapaFeedback from './EtapaFeedback'

function CicloAvaliacao({ onLogout }) {
  const navigate = useNavigate()
  const { etapa } = useParams()
  const location = useLocation()
  const { colaboradorId, colaborador } = useAuth()
  const { info } = useToast()
  const isAdmin = colaborador?.is_admin || false
  const [loading, setLoading] = useState(true)
  const [cicloAberto, setCicloAberto] = useState(null)
  const [cicloAtivo, setCicloAtivo] = useState(null)
  const [parSendoAvaliado, setParSendoAvaliado] = useState(null)
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [isGestor, setIsGestor] = useState(false)

  // Função para verificar se etapa está liberada
  const etapaEstaLiberada = useCallback((etapaNum) => {
    if (!cicloAberto) {
      return false
    }

    // Mapear etapas numéricas para etapas do ciclo (apenas para colaboradores)
    // Etapa 1: Escolha de Pares -> escolha_pares
    // Etapas 2, 3, 4: Autoavaliação, Avaliar Pares, Avaliação Gestor -> avaliacoes (só após aprovacao_pares)
    // Etapa 5: Feedback -> feedback

    let liberada = false

    if (etapaNum === 1) {
      liberada = cicloAberto.etapa_atual === 'escolha_pares' ||
        cicloAberto.etapa_atual === 'aprovacao_pares' ||
        cicloAberto.etapa_atual === 'avaliacoes' ||
        cicloAberto.etapa_atual === 'feedback'
    } else if (etapaNum >= 2 && etapaNum <= 4) {
      // Só libera após a aprovação de pares
      liberada = cicloAberto.etapa_atual === 'avaliacoes' ||
        cicloAberto.etapa_atual === 'feedback'
    } else if (etapaNum === 5) {
      liberada = cicloAberto.etapa_atual === 'feedback'
    }

    return liberada
  }, [cicloAberto])

  // Determinar etapa atual baseada na URL ou estado
  useEffect(() => {
    if (location.pathname.includes('/3/par')) {
      // Rota especial para avaliar par individual
      setEtapaAtual(3)
    } else if (etapa) {
      const etapaNum = parseInt(etapa)
      // Máximo é 5 etapas para colaboradores
      const maxEtapas = 5
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
        navigate(`/ciclo-avaliacao/${primeiraEtapa}`)
      } else {
        navigate('/dashboard')
      }
    }
  }, [cicloAberto, etapaAtual, navigate, etapaEstaLiberada])

  useEffect(() => {
    if (colaboradorId) {
      loadInitialData()
      checkIsGestor()
    }
  }, [colaboradorId])

  // Redirecionar gestores para o componente específico
  useEffect(() => {
    if (isGestor && cicloAberto) {
      navigate('/ciclo-avaliacao-gestor/1')
    }
  }, [isGestor, cicloAberto, navigate])

  useEffect(() => {
    if (cicloAberto && colaboradorId) {
      loadCicloAtivo()
    }
  }, [cicloAberto, colaboradorId])

  const checkIsGestor = async () => {
    if (!colaboradorId) {
      return
    }
    try {
      const response = await colaboradoresAPI.getLiderados(colaboradorId)
      const temLiderados = response.colaboradores && response.colaboradores.length > 0
      setIsGestor(temLiderados)
    } catch (error) {
      handleApiError(error, 'verificar se é gestor', '/colaboradores/{id}/liderados', null)
      setIsGestor(false)
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await loadCicloAberto()
    } catch (error) {
      handleApiError(error, 'carregar dados iniciais', '/ciclos/ativo/aberto', null)
    } finally {
      setLoading(false)
    }
  }

  const loadCicloAberto = async () => {
    try {
      const ciclo = await ciclosAPI.getAtivoAberto()
      setCicloAberto(ciclo)
    } catch (error) {
      handleApiError(error, 'carregar ciclo aberto', '/ciclos/ativo/aberto', null)
    }
  }

  const loadCicloAtivo = async () => {
    try {
      if (!cicloAberto) {
        return
      }

      const ciclo = await ciclosAvaliacaoAPI.getAtivo()
      setCicloAtivo(ciclo)
    } catch (error) {
      console.log('[DEBUG] loadCicloAtivo - Nenhum ciclo de avaliação ativo encontrado para este colaborador', error)
    }
  }

  const handleParesSalvos = (ciclo) => {
    setCicloAtivo(ciclo)
    // Não navegar automaticamente - usuário pode navegar manualmente
  }

  const handleIniciarAvaliacaoPar = (colaborador) => {
    setParSendoAvaliado(colaborador)
    // Salvar par no localStorage para recuperar na rota
    localStorage.setItem('parSendoAvaliado', JSON.stringify(colaborador))
    navigate('/ciclo-avaliacao/3/par')
  }

  const handleAvaliacaoParFinalizada = () => {
    setParSendoAvaliado(null)
    localStorage.removeItem('parSendoAvaliado')
    // Não navegar automaticamente - usuário pode navegar manualmente
  }

  // Carregar par do localStorage quando necessário
  useEffect(() => {
    if (location.pathname.includes('/3/par')) {
      const parSalvo = localStorage.getItem('parSendoAvaliado')
      if (parSalvo) {
        try {
          const par = JSON.parse(parSalvo)
          setParSendoAvaliado(par)
        } catch (error) {
          handleApiError(error, 'carregar par do localStorage', '/par-sendo-avaliado')
        }
      }
    }
  }, [location.pathname])

  // Removido handleAvaliacaoGestorFinalizada - não há mais navegação automática

  const handleNavegarEtapa = (etapaNum) => {
    if (!etapaEstaLiberada(etapaNum)) {
      info('Esta etapa ainda não foi liberada pelo administrador.')
      return
    }
    navigate(`/ciclo-avaliacao/${etapaNum}`)
  }

  // Renderizar menu lateral
  const renderMenuLateral = () => {
    const etapasColaborador = [
      {
        numero: 1,
        titulo: 'Escolha de Pares',
        descricao: 'Selecione 4 colaboradores',
        icone: '👥'
      },
      {
        numero: 2,
        titulo: 'Autoavaliação',
        descricao: 'Avalie seu desempenho',
        icone: '📝'
      },
      {
        numero: 3,
        titulo: 'Avaliar Pares',
        descricao: 'Avalie seus pares',
        icone: '⭐'
      },
      {
        numero: 4,
        titulo: 'Avaliação do Gestor',
        descricao: 'Avalie seu gestor',
        icone: '👔'
      },
      {
        numero: 5,
        titulo: 'Feedback',
        descricao: 'Veja sua avaliação',
        icone: '📊'
      }
    ]

    const etapas = etapasColaborador

    return (
      <div className="menu-lateral">
        <div className="menu-lateral-header">
          <h3 className="menu-lateral-title">Etapas do Ciclo</h3>
        </div>
        <div className="menu-lateral-etapas">
          {etapas.map((etapa) => {
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

  // Se estiver na rota de avaliar par individual
  if (location.pathname.includes('/3/par')) {
    return (
      <div className="page-container">
        <header className="page-header">
          <div className="header-content">
            <button className="back-button" onClick={() => navigate('/dashboard')}>
              ← Voltar
            </button>
            <h1 className="page-title">Ciclo de avaliação</h1>
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
              <EtapaAvaliarParIndividual
                colaboradorId={colaboradorId}
                cicloAberto={cicloAberto}
                parSendoAvaliado={parSendoAvaliado}
                onVoltar={() => navigate('/ciclo-avaliacao/3')}
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
          <h1 className="page-title">Ciclo de avaliação</h1>
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
                  {/* Renderizar etapas para colaboradores */}
                  {etapaAtual === 1 && (
                    <EtapaEscolhaPares
                      colaboradorId={colaboradorId}
                      cicloAberto={cicloAberto}
                      cicloAtivo={cicloAtivo}
                      onParesSalvos={handleParesSalvos}
                      onVoltar={() => navigate('/dashboard')}
                    />
                  )}
                  {etapaAtual === 2 && (
                    <EtapaAutoavaliacao
                      colaboradorId={colaboradorId}
                      cicloAberto={cicloAberto}
                      onVoltar={() => navigate('/ciclo-avaliacao/1')}
                    />
                  )}
                  {etapaAtual === 3 && (
                    <EtapaAvaliarPares
                      colaboradorId={colaboradorId}
                      cicloAberto={cicloAberto}
                      cicloAtivo={cicloAtivo}
                      onIniciarAvaliacao={handleIniciarAvaliacaoPar}
                      onVoltar={() => navigate('/ciclo-avaliacao/2')}
                    />
                  )}
                  {etapaAtual === 4 && (
                    <EtapaAvaliacaoGestor
                      colaboradorId={colaboradorId}
                      colaborador={colaborador}
                      cicloAberto={cicloAberto}
                      onVoltar={() => navigate('/ciclo-avaliacao/3')}
                    />
                  )}
                  {etapaAtual === 5 && (
                    <EtapaFeedback
                      colaborador={colaborador}
                      cicloAberto={cicloAberto}
                      onVoltar={() => navigate('/ciclo-avaliacao/4')}
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

export default CicloAvaliacao

