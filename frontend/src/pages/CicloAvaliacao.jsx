import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  avaliacoesAPI,
  ciclosAPI,
  ciclosAvaliacaoAPI,
  colaboradoresAPI,
  eixosAvaliacaoAPI,
  niveisCarreiraAPI
} from '../services/api'
import './CicloAvaliacao.css'
import './Page.css'

function CicloAvaliacao({ onLogout }) {
  const navigate = useNavigate()
  const { colaboradorId, colaborador } = useAuth()
  const [loading, setLoading] = useState(true)
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [colaboradores, setColaboradores] = useState([])
  const [niveisEsperados, setNiveisEsperados] = useState([0, 0, 0, 0])
  const [cicloAberto, setCicloAberto] = useState(null) // Ciclo geral aberto
  const [cicloAtivo, setCicloAtivo] = useState(null) // Ciclo de avaliação do colaborador
  const [etapaAtual, setEtapaAtual] = useState(1) // 1: Escolha de pares, 2: Autoavaliação, 3: Lista de pares, 4: Avaliar par específico, 5: Avaliação do gestor
  const [paresSelecionados, setParesSelecionados] = useState([])
  const [autoavaliacao, setAutoavaliacao] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [paresParaAvaliar, setParesParaAvaliar] = useState([])
  const [parSendoAvaliado, setParSendoAvaliado] = useState(null)
  const [avaliacoesPares, setAvaliacoesPares] = useState({}) // { colaboradorId: { eixos: {}, avaliacaoGeral: '' } }
  const [avaliacaoGestor, setAvaliacaoGestor] = useState({
    eixos: {},
    avaliacaoGeral: ''
  })
  const [feedbackData, setFeedbackData] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  useEffect(() => {
    if (colaboradorId) {
      loadInitialData()
    }
  }, [colaboradorId])

  // Recarregar ciclo ativo quando ciclo aberto for carregado
  useEffect(() => {
    if (cicloAberto && colaboradorId) {
      loadCicloAtivo()
    }
  }, [cicloAberto, colaboradorId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadEixosAvaliacao(),
        loadColaboradores(),
        loadNiveisEsperados(),
        loadCicloAberto(),
        loadCicloAtivo()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      alert('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const loadEixosAvaliacao = async () => {
    try {
      const response = await eixosAvaliacaoAPI.getAll()
      // Converter para o formato esperado pelo componente
      const eixos = response.eixos.map(eixo => ({
        id: eixo.id.toString(),
        codigo: eixo.codigo,
        nome: eixo.nome,
        niveis: eixo.niveis.map(nivel => ({
          nivel: nivel.nivel,
          descricao: nivel.descricao
        }))
      }))
      setEixosAvaliacao(eixos)
    } catch (error) {
      console.error('Erro ao carregar eixos:', error)
    }
  }

  const loadColaboradores = async () => {
    try {
      const response = await colaboradoresAPI.getAll()
      setColaboradores(response.colaboradores || [])
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error)
    }
  }

  const loadNiveisEsperados = async () => {
    try {
      if (colaborador?.nivel_carreira) {
        const response = await niveisCarreiraAPI.getByNivel(colaborador.nivel_carreira)
        setNiveisEsperados(response.niveis_esperados || [0, 0, 0, 0])
      }
    } catch (error) {
      console.error('Erro ao carregar níveis esperados:', error)
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
      if (!cicloAberto) {
        // Aguardar ciclo aberto ser carregado
        return
      }

      const ciclo = await ciclosAvaliacaoAPI.getAtivo()
      setCicloAtivo(ciclo)

      // Carregar pares selecionados
      if (ciclo.pares_selecionados) {
        const pares = ciclo.pares_selecionados.map(ps => ps.par)
        setParesSelecionados(pares)
      }

      // Carregar avaliações existentes (usar ciclo_id do ciclo aberto)
      await loadAvaliacoes(cicloAberto.id)
    } catch (error) {
      // Ciclo de avaliação não existe ainda, isso é normal
      console.log('Nenhum ciclo de avaliação ativo encontrado para este colaborador')
    }
  }

  const loadAvaliacoes = async (cicloId) => {
    try {
      const response = await avaliacoesAPI.getAll({ ciclo_id: cicloId })
      const avaliacoes = response.avaliacoes || []

      // Separar avaliações por tipo
      avaliacoes.forEach(avaliacao => {
        const eixosObj = {}
        avaliacao.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })

        if (avaliacao.tipo === 'autoavaliacao') {
          setAutoavaliacao({
            eixos: eixosObj,
            avaliacaoGeral: avaliacao.avaliacao_geral || ''
          })
        } else if (avaliacao.tipo === 'gestor') {
          setAvaliacaoGestor({
            eixos: eixosObj,
            avaliacaoGeral: avaliacao.avaliacao_geral || ''
          })
        } else if (avaliacao.tipo === 'par') {
          setAvaliacoesPares(prev => ({
            ...prev,
            [avaliacao.avaliado_id]: {
              eixos: eixosObj,
              avaliacaoGeral: avaliacao.avaliacao_geral || ''
            }
          }))
        }
      })

      // Carregar pares para avaliar (colaboradores que escolheram o usuário atual como par)
      await loadParesParaAvaliar(cicloId)
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error)
    }
  }

  const loadParesParaAvaliar = async (cicloId) => {
    try {
      if (!cicloAberto) return

      // Buscar ciclos de avaliação do ciclo aberto onde o colaborador atual foi selecionado como par
      const response = await ciclosAvaliacaoAPI.getAll()
      const ciclos = response.ciclos || []

      const pares = []
      ciclos.forEach(ciclo => {
        // Verificar se o ciclo de avaliação pertence ao ciclo aberto
        if (ciclo.ciclo_id === cicloAberto.id && ciclo.pares_selecionados) {
          const foiSelecionado = ciclo.pares_selecionados.some(
            ps => ps.par_id === colaboradorId
          )
          if (foiSelecionado && ciclo.colaborador_id !== colaboradorId) {
            pares.push(ciclo.colaborador)
          }
        }
      })

      setParesParaAvaliar(pares)
    } catch (error) {
      console.error('Erro ao carregar pares para avaliar:', error)
    }
  }

  const toggleSelecao = (colaborador) => {
    setParesSelecionados(prev => {
      const jaSelecionado = prev.find(p => p.id === colaborador.id)

      if (jaSelecionado) {
        // Deselecionar
        return prev.filter(p => p.id !== colaborador.id)
      } else {
        // Selecionar (máximo 4)
        if (prev.length < 4) {
          return [...prev, colaborador]
        }
        return prev
      }
    })
  }

  const handleContinuarPares = async () => {
    if (paresSelecionados.length === 4 && cicloAberto) {
      try {
        // Criar ou atualizar ciclo de avaliação
        const paresIds = paresSelecionados.map(p => p.id)
        let ciclo

        if (cicloAtivo) {
          // Ciclo de avaliação já existe
          ciclo = cicloAtivo
        } else {
          // Criar novo ciclo de avaliação vinculado ao ciclo aberto
          ciclo = await ciclosAvaliacaoAPI.create({
            ciclo_id: cicloAberto.id,
            pares_ids: paresIds
          })
          setCicloAtivo(ciclo)
        }

        setEtapaAtual(2)
      } catch (error) {
        console.error('Erro ao salvar pares:', error)
        alert('Erro ao salvar pares selecionados. Tente novamente.')
      }
    } else if (!cicloAberto) {
      alert('Nenhum ciclo aberto encontrado. Entre em contato com o administrador.')
    }
  }

  const handleSelecionarNivel = (eixoId, nivel) => {
    setAutoavaliacao(prev => ({
      ...prev,
      eixos: {
        ...prev.eixos,
        [eixoId]: {
          ...prev.eixos[eixoId],
          nivel: nivel
        }
      }
    }))
  }

  const handleJustificativaChange = (eixoId, justificativa) => {
    setAutoavaliacao(prev => ({
      ...prev,
      eixos: {
        ...prev.eixos,
        [eixoId]: {
          ...prev.eixos[eixoId],
          justificativa: justificativa
        }
      }
    }))
  }

  const handleAvaliacaoGeralChange = (valor) => {
    setAutoavaliacao(prev => ({
      ...prev,
      avaliacaoGeral: valor
    }))
  }

  const isAutoavaliacaoCompleta = () => {
    // Verificar se todos os eixos têm nível e justificativa
    const todosEixosCompletos = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = autoavaliacao.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    })

    // Verificar se a avaliação geral foi preenchida
    const avaliacaoGeralPreenchida = autoavaliacao.avaliacaoGeral.trim() !== ''

    return todosEixosCompletos && avaliacaoGeralPreenchida
  }

  const handleFinalizarAutoavaliacao = async () => {
    if (isAutoavaliacaoCompleta() && cicloAtivo && cicloAberto) {
      try {
        // Converter eixos para o formato da API
        const eixos = {}
        eixosAvaliacao.forEach(eixo => {
          const avaliacaoEixo = autoavaliacao.eixos[eixo.id]
          if (avaliacaoEixo) {
            eixos[eixo.id] = {
              nivel: avaliacaoEixo.nivel,
              justificativa: avaliacaoEixo.justificativa
            }
          }
        })

        await avaliacoesAPI.create({
          ciclo_id: cicloAberto.id,
          avaliado_id: colaboradorId,
          tipo: 'autoavaliacao',
          avaliacao_geral: autoavaliacao.avaliacaoGeral,
          eixos: eixos
        })

        alert('Autoavaliação salva com sucesso!')
        setEtapaAtual(3) // Ir para etapa de avaliar pares
      } catch (error) {
        console.error('Erro ao salvar autoavaliação:', error)
        alert('Erro ao salvar autoavaliação. Tente novamente.')
      }
    }
  }

  const handleVoltarEtapa = () => {
    if (etapaAtual === 2) {
      setEtapaAtual(1)
    } else if (etapaAtual === 4) {
      setEtapaAtual(3)
      setParSendoAvaliado(null)
    }
  }

  const handleIniciarAvaliacaoPar = (colaborador) => {
    setParSendoAvaliado(colaborador)
    // Carregar avaliação existente se houver
    const avaliacaoExistente = avaliacoesPares[colaborador.id] || {
      eixos: {},
      avaliacaoGeral: ''
    }
    setAutoavaliacao(avaliacaoExistente)
    setEtapaAtual(6) // Etapa 6 é para avaliar par específico
  }

  const handleSelecionarNivelPar = (eixoId, nivel) => {
    if (!parSendoAvaliado) return

    const novaAvaliacao = {
      ...autoavaliacao,
      eixos: {
        ...autoavaliacao.eixos,
        [eixoId]: {
          ...autoavaliacao.eixos[eixoId],
          nivel: nivel
        }
      }
    }
    setAutoavaliacao(novaAvaliacao)
  }

  const handleJustificativaParChange = (eixoId, justificativa) => {
    if (!parSendoAvaliado) return

    const novaAvaliacao = {
      ...autoavaliacao,
      eixos: {
        ...autoavaliacao.eixos,
        [eixoId]: {
          ...autoavaliacao.eixos[eixoId],
          justificativa: justificativa
        }
      }
    }
    setAutoavaliacao(novaAvaliacao)
  }

  const handleAvaliacaoGeralParChange = (valor) => {
    if (!parSendoAvaliado) return

    setAutoavaliacao(prev => ({
      ...prev,
      avaliacaoGeral: valor
    }))
  }

  const isAvaliacaoParCompleta = () => {
    const todosEixosCompletos = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = autoavaliacao.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    })

    const avaliacaoGeralPreenchida = autoavaliacao.avaliacaoGeral.trim() !== ''

    return todosEixosCompletos && avaliacaoGeralPreenchida
  }

  const handleFinalizarAvaliacaoPar = async () => {
    if (isAvaliacaoParCompleta() && parSendoAvaliado && cicloAtivo) {
      try {
        // Converter eixos para o formato da API
        const eixos = {}
        eixosAvaliacao.forEach(eixo => {
          const avaliacaoEixo = autoavaliacao.eixos[eixo.id]
          if (avaliacaoEixo) {
            eixos[eixo.id] = {
              nivel: avaliacaoEixo.nivel,
              justificativa: avaliacaoEixo.justificativa
            }
          }
        })

        // Verificar se o par tem ciclo de avaliação no ciclo aberto
        if (cicloAberto) {
          await avaliacoesAPI.create({
            ciclo_id: cicloAberto.id,
            avaliador_id: colaboradorId,
            avaliado_id: parSendoAvaliado.id,
            tipo: 'par',
            avaliacao_geral: autoavaliacao.avaliacaoGeral,
            eixos: eixos
          })

          // Salvar avaliação do par localmente
          setAvaliacoesPares(prev => ({
            ...prev,
            [parSendoAvaliado.id]: autoavaliacao
          }))

          alert(`Avaliação de ${parSendoAvaliado.nome} concluída com sucesso!`)
        } else {
          alert('Nenhum ciclo aberto encontrado.')
        }

        // Voltar para lista de pares
        setEtapaAtual(3)
        setParSendoAvaliado(null)
        setAutoavaliacao({ eixos: {}, avaliacaoGeral: '' })
      } catch (error) {
        console.error('Erro ao salvar avaliação do par:', error)
        alert('Erro ao salvar avaliação. Tente novamente.')
      }
    }
  }

  const handleVoltarEtapaFeedback = () => {
    setEtapaAtual(4)
  }

  const handleSelecionarNivelGestor = (eixoId, nivel) => {
    setAvaliacaoGestor(prev => ({
      ...prev,
      eixos: {
        ...prev.eixos,
        [eixoId]: {
          ...prev.eixos[eixoId],
          nivel: nivel
        }
      }
    }))
  }

  const handleJustificativaGestorChange = (eixoId, justificativa) => {
    setAvaliacaoGestor(prev => ({
      ...prev,
      eixos: {
        ...prev.eixos,
        [eixoId]: {
          ...prev.eixos[eixoId],
          justificativa: justificativa
        }
      }
    }))
  }

  const handleAvaliacaoGeralGestorChange = (valor) => {
    setAvaliacaoGestor(prev => ({
      ...prev,
      avaliacaoGeral: valor
    }))
  }

  const isAvaliacaoGestorCompleta = () => {
    const todosEixosCompletos = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = avaliacaoGestor.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    })

    const avaliacaoGeralPreenchida = avaliacaoGestor.avaliacaoGeral.trim() !== ''

    return todosEixosCompletos && avaliacaoGeralPreenchida
  }

  const handleFinalizarAvaliacaoGestor = async () => {
    if (isAvaliacaoGestorCompleta() && cicloAtivo && cicloAberto && colaborador?.gestor_id) {
      try {
        // Converter eixos para o formato da API
        const eixos = {}
        eixosAvaliacao.forEach(eixo => {
          const avaliacaoEixo = avaliacaoGestor.eixos[eixo.id]
          if (avaliacaoEixo) {
            eixos[eixo.id] = {
              nivel: avaliacaoEixo.nivel,
              justificativa: avaliacaoEixo.justificativa
            }
          }
        })

        await avaliacoesAPI.create({
          ciclo_id: cicloAberto.id,
          avaliador_id: colaboradorId,
          avaliado_id: colaborador.gestor_id,
          tipo: 'gestor',
          avaliacao_geral: avaliacaoGestor.avaliacaoGeral,
          eixos: eixos
        })

        alert('Avaliação do gestor concluída com sucesso!')
      } catch (error) {
        console.error('Erro ao salvar avaliação do gestor:', error)
        alert('Erro ao salvar avaliação do gestor. Tente novamente.')
      }
    }
  }

  const getStatusAvaliacaoPar = (colaboradorId) => {
    const avaliacao = avaliacoesPares[colaboradorId]
    if (!avaliacao) return 'pendente'

    const completa = eixosAvaliacao.every(eixo => {
      const avaliacaoEixo = avaliacao.eixos[eixo.id]
      return avaliacaoEixo && avaliacaoEixo.nivel && avaliacaoEixo.justificativa && avaliacaoEixo.justificativa.trim() !== ''
    }) && avaliacao.avaliacaoGeral.trim() !== ''

    return completa ? 'concluida' : 'em-andamento'
  }

  // Determinar status das etapas para o menu lateral
  // Por enquanto, todas as etapas estão disponíveis simultaneamente
  // A verificação de disponibilidade virá do backend no futuro
  const getStatusEtapa = (etapa) => {
    if (etapa === 1) {
      return paresSelecionados.length === 4 ? 'concluida' : (paresSelecionados.length > 0 ? 'em-andamento' : 'pendente')
    }
    if (etapa === 2) {
      return isAutoavaliacaoCompleta() ? 'concluida' : (Object.keys(autoavaliacao.eixos).length > 0 ? 'em-andamento' : 'pendente')
    }
    if (etapa === 3) {
      const todasAvaliacoesConcluidas = paresParaAvaliar.every(par => getStatusAvaliacaoPar(par.id) === 'concluida')
      return todasAvaliacoesConcluidas ? 'concluida' : (Object.keys(avaliacoesPares).length > 0 ? 'em-andamento' : 'pendente')
    }
    if (etapa === 4) {
      return isAvaliacaoGestorCompleta() ? 'concluida' : (Object.keys(avaliacaoGestor.eixos).length > 0 ? 'em-andamento' : 'pendente')
    }
    if (etapa === 5) {
      // Feedback sempre disponível se houver alguma avaliação
      return (Object.keys(autoavaliacao.eixos).length > 0 || Object.keys(avaliacaoGestor.eixos).length > 0 || Object.keys(avaliacoesPares).length > 0) ? 'em-andamento' : 'pendente'
    }
    return 'pendente'
  }

  const handleNavegarEtapa = (etapa) => {
    // Por enquanto, todas as etapas estão disponíveis simultaneamente
    // A verificação de disponibilidade virá do backend no futuro

    // Apenas validação para etapa 6 (avaliar par específico)
    if (etapa === 6 && !parSendoAvaliado) {
      // Se não há par sendo avaliado, não pode ir para etapa 6
      return
    }

    setEtapaAtual(etapa)
    if (etapa !== 6) {
      setParSendoAvaliado(null)
    }
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
            const status = getStatusEtapa(etapa.numero)
            const isAtiva = etapaAtual === etapa.numero
            // Por enquanto, todas as etapas estão disponíveis para navegação
            // A verificação de disponibilidade virá do backend no futuro
            const podeNavegar = true

            return (
              <div
                key={etapa.numero}
                className={`menu-etapa-item ${isAtiva ? 'ativa' : ''} ${status}`}
                onClick={() => podeNavegar && handleNavegarEtapa(etapa.numero)}
              >
                {/*
                <div className="menu-etapa-numero">
                  {status === 'concluida' ? '✓' : etapa.numero}
                </div>
                */}
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

  // Renderizar etapa de escolha de pares
  const renderEtapaEscolhaPares = () => (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 1: Escolha de Pares</h2>
        <p className="ciclo-step-description">
          Selecione 4 colaboradores para avaliar seu desempenho
        </p>
        <div className="selecao-counter">
          <span className={`counter-text ${paresSelecionados.length === 4 ? 'complete' : ''}`}>
            {paresSelecionados.length} de 4 selecionados
          </span>
        </div>
      </div>

      {paresSelecionados.length > 0 && (
        <div className="selecionados-section">
          <h3 className="selecionados-title">Pares Selecionados</h3>
          <div className="selecionados-grid">
            {paresSelecionados.map((colaborador) => (
              <div key={colaborador.id} className="selecionado-card">
                <div className="selecionado-avatar">{colaborador.avatar}</div>
                <div className="selecionado-info">
                  <p className="selecionado-nome">{colaborador.nome}</p>
                  <p className="selecionado-cargo">{colaborador.cargo}</p>
                </div>
                <button
                  className="remover-button"
                  onClick={() => toggleSelecao(colaborador)}
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="colaboradores-section">
        <h3 className="colaboradores-title">Colaboradores Disponíveis</h3>
        <div className="colaboradores-grid">
          {colaboradores.filter(c => c.id !== colaboradorId).map((colaborador) => {
            const isSelecionado = paresSelecionados.find(p => p.id === colaborador.id)
            const isMaximo = paresSelecionados.length === 4 && !isSelecionado

            return (
              <div
                key={colaborador.id}
                className={`colaborador-card ${isSelecionado ? 'selecionado' : ''} ${isMaximo ? 'disabled' : ''}`}
                onClick={() => !isMaximo && toggleSelecao(colaborador)}
              >
                <div className="colaborador-avatar">{colaborador.avatar}</div>
                <div className="colaborador-info">
                  <p className="colaborador-nome">{colaborador.nome}</p>
                  <p className="colaborador-cargo">{colaborador.cargo}</p>
                  <p className="colaborador-departamento">{colaborador.departamento}</p>
                </div>
                {isSelecionado && (
                  <div className="check-icon">✓</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="ciclo-actions">
        <button
          className={`continuar-button ${paresSelecionados.length === 4 ? 'enabled' : 'disabled'}`}
          onClick={handleContinuarPares}
          disabled={paresSelecionados.length !== 4}
        >
          Continuar
        </button>
      </div>
    </>
  )

  // Renderizar etapa de lista de pares para avaliar
  const renderEtapaListaPares = () => {
    const paresComStatus = paresParaAvaliar.map(par => ({
      ...par,
      status: getStatusAvaliacaoPar(par.id)
    }))

    return (
      <>
        <div className="ciclo-header">
          <h2 className="ciclo-step-title">Etapa 3: Avaliar Pares</h2>
          <p className="ciclo-step-description">
            Avalie os colaboradores que escolheram você como par
          </p>
        </div>

        <div className="pares-avaliar-section">
          <h3 className="pares-avaliar-title">Colaboradores para Avaliar</h3>
          <div className="pares-avaliar-grid">
            {paresComStatus.map((colaborador) => {
              const status = colaborador.status
              const statusLabels = {
                pendente: 'Pendente',
                'em-andamento': 'Em andamento',
                concluida: 'Concluída'
              }
              const statusColors = {
                pendente: '#ff9800',
                'em-andamento': '#50e550',
                concluida: '#4caf50'
              }

              return (
                <div
                  key={colaborador.id}
                  className="par-avaliar-card"
                  onClick={() => handleIniciarAvaliacaoPar(colaborador)}
                >
                  <div className="par-avaliar-avatar">{colaborador.avatar}</div>
                  <div className="par-avaliar-info">
                    <p className="par-avaliar-nome">{colaborador.nome}</p>
                    <p className="par-avaliar-cargo">{colaborador.cargo}</p>
                    <p className="par-avaliar-departamento">{colaborador.departamento}</p>
                  </div>
                  <div
                    className="par-avaliar-status"
                    style={{ backgroundColor: statusColors[status] + '20', color: statusColors[status] }}
                  >
                    {statusLabels[status]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="ciclo-actions">
          <button
            className="voltar-button"
            onClick={() => setEtapaAtual(2)}
          >
            ← Voltar
          </button>
        </div>
      </>
    )
  }

  // Renderizar etapa de autoavaliação
  const renderEtapaAutoavaliacao = () => (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">
          {parSendoAvaliado
            ? `Etapa 3: Avaliar ${parSendoAvaliado.nome}`
            : 'Etapa 2: Autoavaliação'}
        </h2>
        <p className="ciclo-step-description">
          {parSendoAvaliado
            ? `Avalie o desempenho de ${parSendoAvaliado.nome} em cada eixo e forneça feedback construtivo`
            : 'Avalie seu desempenho em cada eixo e justifique suas escolhas'}
        </p>
      </div>

      <div className="autoavaliacao-section">
        {eixosAvaliacao.map((eixo) => {
          const avaliacaoEixo = autoavaliacao.eixos[eixo.id] || {}
          const nivelSelecionado = avaliacaoEixo.nivel

          return (
            <div key={eixo.id} className="eixo-card">
              <h3 className="eixo-nome">{eixo.nome}</h3>

              <div className="niveis-container">
                <p className="niveis-label">
                  {parSendoAvaliado
                    ? `Selecione o nível de ${parSendoAvaliado.nome}:`
                    : 'Selecione seu nível:'}
                </p>
                <div className="niveis-grid">
                  {eixo.niveis.map((nivel) => (
                    <button
                      key={nivel.nivel}
                      className={`nivel-button ${nivelSelecionado === nivel.nivel ? 'selecionado' : ''}`}
                      onClick={() => parSendoAvaliado
                        ? handleSelecionarNivelPar(eixo.id, nivel.nivel)
                        : handleSelecionarNivel(eixo.id, nivel.nivel)}
                    >
                      <span className="nivel-numero">{nivel.nivel}</span>
                      <span className="nivel-descricao">{nivel.descricao}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="justificativa-container">
                <label className="justificativa-label">
                  {parSendoAvaliado ? 'Feedback' : 'Justificativa'} <span className="required">*</span>
                </label>
                <textarea
                  className="justificativa-textarea"
                  placeholder={parSendoAvaliado
                    ? `Compartilhe seu feedback sobre ${parSendoAvaliado.nome} neste eixo...`
                    : 'Explique por que você escolheu este nível...'}
                  value={avaliacaoEixo.justificativa || ''}
                  onChange={(e) => parSendoAvaliado
                    ? handleJustificativaParChange(eixo.id, e.target.value)
                    : handleJustificativaChange(eixo.id, e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )
        })}

        <div className="avaliacao-geral-container">
          <h3 className="avaliacao-geral-title">
            {parSendoAvaliado
              ? `Feedback Geral sobre ${parSendoAvaliado.nome}`
              : 'Avaliação Geral do Ciclo'}
          </h3>
          <label className="avaliacao-geral-label">
            {parSendoAvaliado
              ? <>Compartilhe seu feedback geral sobre {parSendoAvaliado.nome} <span className="required">*</span></>
              : <>Compartilhe suas reflexões sobre o ciclo de avaliação <span className="required">*</span></>}
          </label>
          <textarea
            className="avaliacao-geral-textarea"
            placeholder={parSendoAvaliado
              ? `Descreva suas percepções gerais sobre ${parSendoAvaliado.nome}, pontos fortes, oportunidades de desenvolvimento e recomendações...`
              : 'Descreva suas percepções, aprendizados e expectativas para o próximo ciclo...'}
            value={autoavaliacao.avaliacaoGeral}
            onChange={(e) => parSendoAvaliado
              ? handleAvaliacaoGeralParChange(e.target.value)
              : handleAvaliacaoGeralChange(e.target.value)}
            rows={6}
          />
        </div>

        <div className="ciclo-actions">
          <button
            className="voltar-button"
            onClick={handleVoltarEtapa}
          >
            ← Voltar
          </button>
          <button
            className={`continuar-button ${parSendoAvaliado
              ? (isAvaliacaoParCompleta() ? 'enabled' : 'disabled')
              : (isAutoavaliacaoCompleta() ? 'enabled' : 'disabled')}`}
            onClick={parSendoAvaliado ? handleFinalizarAvaliacaoPar : handleFinalizarAutoavaliacao}
            disabled={parSendoAvaliado
              ? !isAvaliacaoParCompleta()
              : !isAutoavaliacaoCompleta()}
          >
            {parSendoAvaliado ? 'Finalizar Avaliação' : 'Finalizar Autoavaliação'}
          </button>
        </div>
      </div>
    </>
  )

  // Calcular média dos pares para cada eixo
  const calcularMediaPares = useMemo(() => {
    const medias = {}

    eixosAvaliacao.forEach((eixo) => {
      const niveis = []
      Object.values(avaliacoesPares).forEach((avaliacao) => {
        if (avaliacao.eixos[eixo.id]?.nivel) {
          niveis.push(avaliacao.eixos[eixo.id].nivel)
        }
      })

      if (niveis.length > 0) {
        medias[eixo.id] = niveis.reduce((sum, nivel) => sum + nivel, 0) / niveis.length
      } else {
        medias[eixo.id] = 0
      }
    })

    return medias
  }, [avaliacoesPares])

  // Obter níveis esperados para o nível de carreira atual (já carregado do backend)

  // Comparar nível atual com esperado
  const compararNivel = (nivelAtual, nivelEsperado) => {
    if (nivelAtual === nivelEsperado) return 'atende'
    if (nivelAtual < nivelEsperado) return 'abaixo'
    return 'supera'
  }

  // Carregar feedback quando entrar na etapa 5
  useEffect(() => {
    if (cicloAtivo && cicloAberto && etapaAtual === 5) {
      loadFeedback()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cicloAtivo, cicloAberto, etapaAtual])

  const loadFeedback = async () => {
    if (!cicloAtivo || !cicloAberto) return

    try {
      setLoadingFeedback(true)
      const feedback = await avaliacoesAPI.getFeedback(cicloAberto.id)
      setFeedbackData(feedback)

      // Atualizar estados locais com dados do feedback
      if (feedback.autoavaliacao) {
        const eixosObj = {}
        feedback.autoavaliacao.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        setAutoavaliacao({
          eixos: eixosObj,
          avaliacaoGeral: feedback.autoavaliacao.avaliacao_geral || ''
        })
      }

      if (feedback.avaliacao_gestor) {
        const eixosObj = {}
        feedback.avaliacao_gestor.eixos_detalhados?.forEach(eixo => {
          eixosObj[eixo.eixo_id.toString()] = {
            nivel: eixo.nivel,
            justificativa: eixo.justificativa
          }
        })
        setAvaliacaoGestor({
          eixos: eixosObj,
          avaliacaoGeral: feedback.avaliacao_gestor.avaliacao_geral || ''
        })
      }

      if (feedback.avaliacoes_pares) {
        const paresObj = {}
        feedback.avaliacoes_pares.forEach(avaliacao => {
          const eixosObj = {}
          avaliacao.eixos_detalhados?.forEach(eixo => {
            eixosObj[eixo.eixo_id.toString()] = {
              nivel: eixo.nivel,
              justificativa: eixo.justificativa
            }
          })
          paresObj[avaliacao.avaliado_id] = {
            eixos: eixosObj,
            avaliacaoGeral: avaliacao.avaliacao_geral || ''
          }
        })
        setAvaliacoesPares(paresObj)
      }

      if (feedback.niveis_esperados) {
        setNiveisEsperados(feedback.niveis_esperados)
      }
    } catch (error) {
      console.error('Erro ao carregar feedback:', error)
    } finally {
      setLoadingFeedback(false)
    }
  }

  // Renderizar etapa de feedback
  const renderEtapaFeedback = () => {
    return (
      <>
        <div className="ciclo-header">
          <h2 className="ciclo-step-title">Etapa 5: Feedback</h2>
          <p className="ciclo-step-description">
            Visualize sua avaliação comparativa e análise de desempenho
          </p>
        </div>

        {loadingFeedback ? (
          <p>Carregando feedback...</p>
        ) : (
          <div className="feedback-section">
            <div className="grafico-container">
              <h3 className="grafico-title">Comparativo de Avaliação</h3>
              <div className="grafico-area">
                <div className="grafico-eixos">
                  {eixosAvaliacao.map((eixo, index) => {
                    const nivelAuto = autoavaliacao.eixos[eixo.id]?.nivel || 0
                    const nivelGestor = avaliacaoGestor.eixos[eixo.id]?.nivel || 0
                    const nivelMediaPares = feedbackData?.media_pares_por_eixo?.[eixo.id] || calcularMediaPares[eixo.id] || 0

                    return (
                      <div key={eixo.id} className="grafico-barra-container">
                        <div className="grafico-label">{eixo.nome}</div>
                        <div className="grafico-barras">
                          <div
                            className="grafico-barra autoavaliacao"
                            style={{ height: `${(nivelAuto / 5) * 100}%` }}
                            title={`Autoavaliação: ${nivelAuto || '-'}`}
                          />
                          <div
                            className="grafico-barra gestor"
                            style={{ height: `${(nivelGestor / 5) * 100}%` }}
                            title={`Gestor: ${nivelGestor || '-'}`}
                          />
                          <div
                            className="grafico-barra media-pares"
                            style={{ height: `${(nivelMediaPares / 5) * 100}%` }}
                            title={`Média Pares: ${nivelMediaPares > 0 ? nivelMediaPares.toFixed(1) : '-'}`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="grafico-legend">
                  <div className="legend-item">
                    <div className="legend-color autoavaliacao"></div>
                    <span>Autoavaliação</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color gestor"></div>
                    <span>Gestor</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color media-pares"></div>
                    <span>Média Pares</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="tabela-container">
              <h3 className="tabela-title">Análise Detalhada por Eixo</h3>
              <div className="tabela-wrapper">
                <table className="tabela-comparativa">
                  <thead>
                    <tr>
                      <th>Eixo</th>
                      <th>Autoavaliação</th>
                      <th>Gestor</th>
                      <th>Média Pares</th>
                      <th>Esperado ({colaborador?.nivel_carreira || '-'})</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eixosAvaliacao.map((eixo, index) => {
                      const nivelAuto = autoavaliacao.eixos[eixo.id]?.nivel || 0
                      const nivelGestor = avaliacaoGestor.eixos[eixo.id]?.nivel || 0
                      const nivelMediaPares = feedbackData?.media_pares_por_eixo?.[eixo.id] || calcularMediaPares[eixo.id] || 0
                      const nivelEsperado = niveisEsperados[index] || 0

                      const statusAuto = nivelAuto > 0 ? compararNivel(nivelAuto, nivelEsperado) : null

                      return (
                        <tr key={eixo.id}>
                          <td className="eixo-nome-cell">{eixo.nome}</td>
                          <td>
                            <div className="nivel-cell">
                              <span className="nivel-valor">{nivelAuto || '-'}</span>
                              {statusAuto && (
                                <span className={`status-indicator ${statusAuto}`}>
                                  {statusAuto === 'atende' ? '✓' : statusAuto === 'abaixo' ? '↓' : '↑'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="nivel-cell">
                              <span className="nivel-valor">{nivelGestor || '-'}</span>
                              {nivelGestor > 0 && (
                                <span className={`status-indicator ${compararNivel(nivelGestor, nivelEsperado)}`}>
                                  {compararNivel(nivelGestor, nivelEsperado) === 'atende' ? '✓' : compararNivel(nivelGestor, nivelEsperado) === 'abaixo' ? '↓' : '↑'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="nivel-cell">
                              <span className="nivel-valor">{nivelMediaPares > 0 ? nivelMediaPares.toFixed(1) : '-'}</span>
                              {nivelMediaPares > 0 && (
                                <span className={`status-indicator ${compararNivel(Math.round(nivelMediaPares), nivelEsperado)}`}>
                                  {compararNivel(Math.round(nivelMediaPares), nivelEsperado) === 'atende' ? '✓' : compararNivel(Math.round(nivelMediaPares), nivelEsperado) === 'abaixo' ? '↓' : '↑'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="esperado-cell">{nivelEsperado}</td>
                          <td>
                            <div className="status-cell">
                              {statusAuto && (
                                <span className={`status-badge ${statusAuto}`}>{statusAuto}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ciclo-actions">
              <button
                className="voltar-button"
                onClick={() => setEtapaAtual(4)}
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Renderizar etapa de avaliação do gestor
  const renderEtapaAvaliacaoGestor = () => (
    <>
      <div className="ciclo-header">
        <h2 className="ciclo-step-title">Etapa 4: Avaliação do Gestor</h2>
        <p className="ciclo-step-description">
          Avalie o desempenho do seu gestor em cada eixo e forneça feedback construtivo
        </p>
      </div>

      <div className="autoavaliacao-section">
        {eixosAvaliacao.map((eixo) => {
          const avaliacaoEixo = avaliacaoGestor.eixos[eixo.id] || {}
          const nivelSelecionado = avaliacaoEixo.nivel

          return (
            <div key={eixo.id} className="eixo-card">
              <h3 className="eixo-nome">{eixo.nome}</h3>

              <div className="niveis-container">
                <p className="niveis-label">Selecione o nível do seu gestor:</p>
                <div className="niveis-grid">
                  {eixo.niveis.map((nivel) => (
                    <button
                      key={nivel.nivel}
                      className={`nivel-button ${nivelSelecionado === nivel.nivel ? 'selecionado' : ''}`}
                      onClick={() => handleSelecionarNivelGestor(eixo.id, nivel.nivel)}
                    >
                      <span className="nivel-numero">{nivel.nivel}</span>
                      <span className="nivel-descricao">{nivel.descricao}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="justificativa-container">
                <label className="justificativa-label">
                  Feedback <span className="required">*</span>
                </label>
                <textarea
                  className="justificativa-textarea"
                  placeholder="Compartilhe seu feedback sobre seu gestor neste eixo..."
                  value={avaliacaoEixo.justificativa || ''}
                  onChange={(e) => handleJustificativaGestorChange(eixo.id, e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )
        })}

        <div className="avaliacao-geral-container">
          <h3 className="avaliacao-geral-title">Feedback Geral sobre o Gestor</h3>
          <label className="avaliacao-geral-label">
            Compartilhe seu feedback geral sobre seu gestor <span className="required">*</span>
          </label>
          <textarea
            className="avaliacao-geral-textarea"
            placeholder="Descreva suas percepções gerais sobre seu gestor, pontos fortes, oportunidades de desenvolvimento e recomendações..."
            value={avaliacaoGestor.avaliacaoGeral}
            onChange={(e) => handleAvaliacaoGeralGestorChange(e.target.value)}
            rows={6}
          />
        </div>

        <div className="ciclo-actions">
          <button
            className="voltar-button"
            onClick={() => setEtapaAtual(3)}
          >
            ← Voltar
          </button>
          <button
            className={`continuar-button ${isAvaliacaoGestorCompleta() ? 'enabled' : 'disabled'}`}
            onClick={handleFinalizarAvaliacaoGestor}
            disabled={!isAvaliacaoGestorCompleta()}
          >
            Finalizar Avaliação
          </button>
        </div>
      </div>
    </>
  )

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
            {etapaAtual === 1 && renderEtapaEscolhaPares()}
            {etapaAtual === 2 && renderEtapaAutoavaliacao()}
            {etapaAtual === 3 && renderEtapaListaPares()}
            {etapaAtual === 4 && renderEtapaAvaliacaoGestor()}
            {etapaAtual === 5 && renderEtapaFeedback()}
            {etapaAtual === 6 && renderEtapaAutoavaliacao()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default CicloAvaliacao
