import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ciclosAPI, ciclosAvaliacaoAPI, colaboradoresAPI } from '../../services/api'
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
  const isAdmin = colaborador?.is_admin || false
  const [loading, setLoading] = useState(true)
  const [cicloAberto, setCicloAberto] = useState(null)
  const [cicloAtivo, setCicloAtivo] = useState(null)
  const [parSendoAvaliado, setParSendoAvaliado] = useState(null)
  const [etapaAtual, setEtapaAtual] = useState(1)
  const [isGestor, setIsGestor] = useState(false)

  console.log('[DEBUG] CicloAvaliacao - Componente renderizado', {
    colaboradorId,
    isAdmin,
    etapa,
    pathname: location.pathname,
    loading,
    cicloAberto: cicloAberto?.id,
    cicloAtivo: cicloAtivo?.id,
    etapaAtual,
    isGestor
  })

  // Função para verificar se etapa está liberada
  const etapaEstaLiberada = useCallback((etapaNum) => {
    if (!cicloAberto) {
      console.log('[DEBUG] etapaEstaLiberada - cicloAberto é null', { etapaNum })
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

    console.log('[DEBUG] etapaEstaLiberada', {
      etapaNum,
      etapaAtualCiclo: cicloAberto.etapa_atual,
      liberada
    })

    return liberada
  }, [cicloAberto])

  // Determinar etapa atual baseada na URL ou estado
  useEffect(() => {
    console.log('[DEBUG] useEffect - Determinar etapa atual', {
      pathname: location.pathname,
      etapa
    })

    if (location.pathname.includes('/3/par')) {
      // Rota especial para avaliar par individual
      console.log('[DEBUG] Rota especial /3/par detectada, definindo etapaAtual = 3')
      setEtapaAtual(3)
    } else if (etapa) {
      const etapaNum = parseInt(etapa)
      // Máximo é 5 etapas para colaboradores
      const maxEtapas = 5
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
        navigate(`/ciclo-avaliacao/${primeiraEtapa}`)
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
      console.log('[DEBUG] Carregando dados iniciais e verificando se é gestor')
      loadInitialData()
      checkIsGestor()
    } else {
      console.log('[DEBUG] colaboradorId não disponível, pulando carregamento')
    }
  }, [colaboradorId])

  // Redirecionar gestores para o componente específico
  useEffect(() => {
    if (isGestor && cicloAberto) {
      console.log('[DEBUG] Usuário é gestor, redirecionando para ciclo-avaliacao-gestor')
      navigate('/ciclo-avaliacao-gestor/1')
    }
  }, [isGestor, cicloAberto, navigate])

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

  const checkIsGestor = async () => {
    if (!colaboradorId) {
      console.log('[DEBUG] checkIsGestor - colaboradorId não disponível')
      return
    }
    console.log('[DEBUG] checkIsGestor - Verificando se é gestor', { colaboradorId })
    try {
      const response = await colaboradoresAPI.getLiderados(colaboradorId)
      const temLiderados = response.colaboradores && response.colaboradores.length > 0
      console.log('[DEBUG] checkIsGestor - Resultado', {
        temLiderados,
        quantidadeLiderados: response.colaboradores?.length || 0
      })
      setIsGestor(temLiderados)
    } catch (error) {
      console.error('[DEBUG] checkIsGestor - Erro ao verificar se é gestor:', error)
      setIsGestor(false)
    }
  }

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

  const handleParesSalvos = (ciclo) => {
    console.log('[DEBUG] handleParesSalvos - Pares salvos', {
      cicloId: ciclo?.id,
      ciclo
    })
    setCicloAtivo(ciclo)
    // Não navegar automaticamente - usuário pode navegar manualmente
  }

  const handleIniciarAvaliacaoPar = (colaborador) => {
    console.log('[DEBUG] handleIniciarAvaliacaoPar - Iniciando avaliação de par', {
      parId: colaborador?.id,
      parNome: colaborador?.nome,
      colaborador
    })
    setParSendoAvaliado(colaborador)
    // Salvar par no localStorage para recuperar na rota
    localStorage.setItem('parSendoAvaliado', JSON.stringify(colaborador))
    console.log('[DEBUG] handleIniciarAvaliacaoPar - Navegando para /ciclo-avaliacao/3/par')
    navigate('/ciclo-avaliacao/3/par')
  }

  const handleAvaliacaoParFinalizada = () => {
    console.log('[DEBUG] handleAvaliacaoParFinalizada - Avaliação de par finalizada')
    setParSendoAvaliado(null)
    localStorage.removeItem('parSendoAvaliado')
    // Não navegar automaticamente - usuário pode navegar manualmente
  }

  // Carregar par do localStorage quando necessário
  useEffect(() => {
    console.log('[DEBUG] useEffect - Carregar par do localStorage', {
      pathname: location.pathname,
      isRotaPar: location.pathname.includes('/3/par')
    })
    if (location.pathname.includes('/3/par')) {
      const parSalvo = localStorage.getItem('parSendoAvaliado')
      if (parSalvo) {
        try {
          const par = JSON.parse(parSalvo)
          console.log('[DEBUG] Par carregado do localStorage', { par })
          setParSendoAvaliado(par)
        } catch (error) {
          console.error('[DEBUG] Erro ao carregar par do localStorage:', error)
        }
      } else {
        console.log('[DEBUG] Nenhum par encontrado no localStorage')
      }
    }
  }, [location.pathname])

  // Removido handleAvaliacaoGestorFinalizada - não há mais navegação automática

  const handleNavegarEtapa = (etapaNum) => {
    console.log('[DEBUG] handleNavegarEtapa - Tentando navegar para etapa', { etapaNum })
    if (!etapaEstaLiberada(etapaNum)) {
      console.log('[DEBUG] handleNavegarEtapa - Etapa não liberada, bloqueando navegação', { etapaNum })
      alert('Esta etapa ainda não foi liberada pelo administrador.')
      return
    }
    console.log('[DEBUG] handleNavegarEtapa - Navegando para etapa', { etapaNum })
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

  // Se estiver na rota de avaliar par individual
  if (location.pathname.includes('/3/par')) {
    console.log('[DEBUG] Renderizando - Rota de avaliar par individual', {
      parSendoAvaliado: parSendoAvaliado?.id
    })
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
              if (!etapaLiberada) {
                console.log('[DEBUG] Renderizando - Etapa não liberada', { etapaAtual })
              } else {
                console.log('[DEBUG] Renderizando - Etapas do ciclo', {
                  etapaAtual,
                  isGestor,
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
                  {console.log('[DEBUG] Renderizando - Etapas do ciclo', {
                    etapaAtual,
                    cicloAbertoId: cicloAberto?.id,
                    cicloAtivoId: cicloAtivo?.id
                  })}
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

