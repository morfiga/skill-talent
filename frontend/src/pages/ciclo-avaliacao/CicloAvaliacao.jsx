import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ciclosAPI, ciclosAvaliacaoAPI } from '../../services/api'
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
  const [loading, setLoading] = useState(true)
  const [cicloAberto, setCicloAberto] = useState(null)
  const [cicloAtivo, setCicloAtivo] = useState(null)
  const [parSendoAvaliado, setParSendoAvaliado] = useState(null)
  const [etapaAtual, setEtapaAtual] = useState(1)

  // Determinar etapa atual baseada na URL ou estado
  useEffect(() => {
    if (location.pathname.includes('/3/par')) {
      // Rota especial para avaliar par individual
      setEtapaAtual(3)
    } else if (etapa) {
      const etapaNum = parseInt(etapa)
      if (etapaNum >= 1 && etapaNum <= 5) {
        setEtapaAtual(etapaNum)
      }
    }
  }, [etapa, location.pathname])

  useEffect(() => {
    if (colaboradorId) {
      loadInitialData()
    }
  }, [colaboradorId])

  useEffect(() => {
    if (cicloAberto && colaboradorId) {
      loadCicloAtivo()
    }
  }, [cicloAberto, colaboradorId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await loadCicloAberto()
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      alert('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const loadCicloAberto = async () => {
    try {
      const ciclo = await ciclosAPI.getAtivoAberto()
      setCicloAberto(ciclo)
    } catch (error) {
      console.error('Erro ao carregar ciclo aberto:', error)
      alert('Nenhum ciclo aberto encontrado. Entre em contato com o administrador.')
    }
  }

  const loadCicloAtivo = async () => {
    try {
      if (!cicloAberto) return

      const ciclo = await ciclosAvaliacaoAPI.getAtivo()
      setCicloAtivo(ciclo)
    } catch (error) {
      console.log('Nenhum ciclo de avaliação ativo encontrado para este colaborador')
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
          setParSendoAvaliado(JSON.parse(parSalvo))
        } catch (error) {
          console.error('Erro ao carregar par do localStorage:', error)
        }
      }
    }
  }, [location.pathname])

  // Removido handleAvaliacaoGestorFinalizada - não há mais navegação automática

  const handleNavegarEtapa = (etapaNum) => {
    navigate(`/ciclo-avaliacao/${etapaNum}`)
  }

  // Renderizar menu lateral
  const renderMenuLateral = () => {
    const etapas = [
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

    return (
      <div className="menu-lateral">
        <div className="menu-lateral-header">
          <h3 className="menu-lateral-title">Etapas do Ciclo</h3>
        </div>
        <div className="menu-lateral-etapas">
          {etapas.map((etapa) => {
            const isAtiva = etapaAtual === etapa.numero
            const podeNavegar = true

            return (
              <div
                key={etapa.numero}
                className={`menu-etapa-item ${isAtiva ? 'ativa' : ''}`}
                onClick={() => podeNavegar && handleNavegarEtapa(etapa.numero)}
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
            <button className="logout-button" onClick={onLogout}>
              Sair
            </button>
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
          <button className="logout-button" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="ciclo-layout">
        {renderMenuLateral()}
        <main className="ciclo-main">
          <div className="ciclo-content">
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
          </div>
        </main>
      </div>
    </div>
  )
}

export default CicloAvaliacao

