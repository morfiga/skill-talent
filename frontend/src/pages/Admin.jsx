import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { avaliacoesAPI, avaliacoesGestorAPI, ciclosAPI, ciclosAvaliacaoAPI, colaboradoresAPI, eixosAvaliacaoAPI } from '../services/api'
import { handleApiError } from '../utils/errorHandler'
import './Admin.css'
import './Page.css'

function Admin({ onLogout }) {
  const navigate = useNavigate()
  const { colaborador, user } = useAuth()
  const { success, error: showError, warning } = useToast()
  // Usar user.is_admin primeiro (vem mais rápido do authAPI.verify), depois colaborador.is_admin
  const isAdmin = user?.is_admin || colaborador?.is_admin || false
  const [abaAtiva, setAbaAtiva] = useState('colaboradores') // 'colaboradores', 'ciclos', 'aprovacao_pares', 'calibracao' ou 'acompanhamento'

  // Estados para Colaboradores
  const [colaboradores, setColaboradores] = useState([])
  const [loadingColaboradores, setLoadingColaboradores] = useState(true)
  const [mostrarFormularioColaborador, setMostrarFormularioColaborador] = useState(false)
  const [colaboradorEditando, setColaboradorEditando] = useState(null)
  const [formularioColaborador, setFormularioColaborador] = useState({
    nome: '',
    email: '',
    cargo: '',
    departamento: '',
    avatar: '',
    is_admin: false
  })
  const [filtroColaboradores, setFiltroColaboradores] = useState('')

  // Estados para Ciclos
  const [ciclos, setCiclos] = useState([])
  const [loadingCiclos, setLoadingCiclos] = useState(true)
  const [mostrarFormularioCiclo, setMostrarFormularioCiclo] = useState(false)
  const [cicloEditando, setCicloEditando] = useState(null)
  const [formularioCiclo, setFormularioCiclo] = useState({
    nome: '',
    status: 'aberto',
    etapa_atual: 'escolha_pares',
    data_inicio: '',
    data_fim: ''
  })
  const [filtroCiclos, setFiltroCiclos] = useState('')

  // Estados para Aprovação de Pares
  const [cicloAprovacao, setCicloAprovacao] = useState(null)
  const [ciclosAvaliacaoLiderados, setCiclosAvaliacaoLiderados] = useState([])
  const [loadingAprovacao, setLoadingAprovacao] = useState(true)
  const [lideradoEditando, setLideradoEditando] = useState(null)
  const [paresSelecionados, setParesSelecionados] = useState([])
  const [colaboradoresDisponiveis, setColaboradoresDisponiveis] = useState([])
  const [mostrarFormularioPares, setMostrarFormularioPares] = useState(false)

  // Estados para Calibração
  const [colaboradorCalibracao, setColaboradorCalibracao] = useState(null)
  const [cicloCalibracao, setCicloCalibracao] = useState(null)
  const [avaliacoesCalibracao, setAvaliacoesCalibracao] = useState([])
  const [avaliacoesGestorCalibracao, setAvaliacoesGestorCalibracao] = useState([]) // Avaliações que liderados fizeram desse colaborador como gestor
  const [loadingCalibracao, setLoadingCalibracao] = useState(false)
  const [colaboradoresInfoCalibracao, setColaboradoresInfoCalibracao] = useState({}) // { colaboradorId: { temAutoavaliacao: bool, qtdAvaliacoes: number, qtdAvaliacoesGestorRecebidas: number, temAutoavaliacaoGestor: bool } }
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [comentariosExpandidos, setComentariosExpandidos] = useState({}) // { avaliacaoId: bool }

  // Estados para Acompanhamento
  const [cicloAcompanhamento, setCicloAcompanhamento] = useState(null)
  const [dadosAcompanhamento, setDadosAcompanhamento] = useState(null)
  const [loadingAcompanhamento, setLoadingAcompanhamento] = useState(false)
  const [filtroAcompanhamento, setFiltroAcompanhamento] = useState('')

  const [error, setError] = useState(null)

  useEffect(() => {
    // Aguardar user ou colaborador serem carregados antes de verificar
    // Se user ainda não foi carregado, aguardar
    if (user === null && colaborador === null) {
      return // Ainda carregando
    }

    // Verificar se é admin antes de carregar
    if (!isAdmin) {
      navigate('/dashboard')
      return
    }

    // Se chegou aqui, é admin, pode carregar os dados
    if (abaAtiva === 'colaboradores') {
      loadColaboradores()
    } else if (abaAtiva === 'ciclos') {
      loadCiclos()
    } else if (abaAtiva === 'aprovacao_pares') {
      loadCicloAprovacao()
    } else if (abaAtiva === 'calibracao') {
      loadCicloCalibracao()
    } else if (abaAtiva === 'acompanhamento') {
      loadAcompanhamento()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, navigate, user, colaborador, abaAtiva])

  const loadColaboradores = async () => {
    try {
      setLoadingColaboradores(true)
      setError(null)
      const response = await colaboradoresAPI.getAll()
      setColaboradores(response.colaboradores || [])
    } catch (err) {
      const { message } = handleApiError(err, 'carregar colaboradores', '/colaboradores', showError)
      setError(message)
    } finally {
      setLoadingColaboradores(false)
    }
  }

  const loadCiclos = async () => {
    try {
      setLoadingCiclos(true)
      setError(null)
      const response = await ciclosAPI.getAll()
      setCiclos(response.ciclos || [])
    } catch (err) {
      const { message } = handleApiError(err, 'carregar ciclos', '/ciclos', showError)
      setError(message)
    } finally {
      setLoadingCiclos(false)
    }
  }

  const loadCicloAprovacao = async () => {
    try {
      setLoadingAprovacao(true)
      setError(null)

      // Carregar colaboradores primeiro (necessário para exibir pares)
      await loadColaboradoresParaPares()

      // Buscar ciclo na etapa de aprovação de pares
      const response = await ciclosAPI.getAll()
      const ciclosAprovacao = (response.ciclos || []).filter(c => c.etapa_atual === 'aprovacao_pares')

      if (ciclosAprovacao.length > 0) {
        const ciclo = ciclosAprovacao[0] // Pegar o primeiro ciclo em aprovação
        setCicloAprovacao(ciclo)

        // Carregar ciclos de avaliação dos liderados
        await loadCiclosAvaliacaoLiderados(ciclo.id)
      } else {
        setCicloAprovacao(null)
        setCiclosAvaliacaoLiderados([])
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar ciclo de aprovação', '/ciclos', showError)
      setError(message)
    } finally {
      setLoadingAprovacao(false)
    }
  }

  const loadCiclosAvaliacaoLiderados = async (cicloId) => {
    try {
      const response = await ciclosAvaliacaoAPI.getLiderados(cicloId)
      setCiclosAvaliacaoLiderados(response.ciclos || [])
    } catch (err) {
      const { message } = handleApiError(err, 'carregar ciclos de avaliação dos liderados', '/ciclos-avaliacao/gestor/liderados', showError)
      setError(message)
    }
  }

  const loadColaboradoresParaPares = async () => {
    try {
      const response = await colaboradoresAPI.getAll()
      setColaboradoresDisponiveis(response.colaboradores || [])
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err)
    }
  }

  // Funções para Calibração
  const loadCicloCalibracao = async () => {
    try {
      setError(null)
      // Carregar colaboradores primeiro (necessário para exibir lista)
      await loadColaboradores()

      // Buscar ciclo na etapa de calibração
      const response = await ciclosAPI.getAll()
      const ciclosCalibracao = (response.ciclos || []).filter(c => c.etapa_atual === 'calibracao')

      if (ciclosCalibracao.length > 0) {
        const ciclo = ciclosCalibracao[0] // Pegar o primeiro ciclo em calibração
        setCicloCalibracao(ciclo)
        // Carregar informações de autoavaliação e quantidade de avaliações para cada colaborador
        await loadColaboradoresInfoCalibracao(ciclo.id)
      } else {
        setCicloCalibracao(null)
        setColaboradoresInfoCalibracao({})
      }
    } catch (err) {
      console.error('Erro ao carregar ciclo de calibração:', err)
      setError('Erro ao carregar ciclo de calibração. Tente novamente.')
    }
  }

  const loadColaboradoresInfoCalibracao = async (cicloId) => {
    try {
      const info = {}

      // Buscar informações de todos os colaboradores em paralelo
      const promises = colaboradores.map(async (colaborador) => {
        try {
          // Buscar autoavaliação, todas as avaliações e avaliações de gestor recebidas em paralelo
          const [autoavaliacaoResponse, todasAvaliacoesResponse, avaliacoesGestorRecebidasResponse] = await Promise.all([
            avaliacoesAPI.getAll({
              ciclo_id: cicloId,
              avaliado_id: colaborador.id,
              tipo: 'autoavaliacao'
            }),
            avaliacoesAPI.getAvaliacoesColaboradorAdmin(colaborador.id, cicloId),
            avaliacoesGestorAPI.getAvaliacoesGestorAdmin(colaborador.id, cicloId)
          ])

          const temAutoavaliacao = (autoavaliacaoResponse.avaliacoes || []).length > 0
          const qtdAvaliacoes = (todasAvaliacoesResponse.avaliacoes || []).length
          // Avaliações de gestor recebidas: quantas avaliações os liderados fizeram desse colaborador (como gestor)
          // Excluindo autoavaliações (onde colaborador_id === gestor_id)
          const todasAvaliacoesGestor = avaliacoesGestorRecebidasResponse.avaliacoes || []
          const avaliacoesGestorRecebidas = todasAvaliacoesGestor.filter(av => av.colaborador_id !== av.gestor_id)
          const qtdAvaliacoesGestorRecebidas = avaliacoesGestorRecebidas.length
          // Verificar se o gestor fez sua autoavaliação de gestor (onde colaborador_id === gestor_id)
          const temAutoavaliacaoGestor = todasAvaliacoesGestor.some(av => av.colaborador_id === av.gestor_id)

          return {
            colaboradorId: colaborador.id,
            temAutoavaliacao,
            qtdAvaliacoes,
            qtdAvaliacoesGestorRecebidas,
            temAutoavaliacaoGestor
          }
        } catch (err) {
          console.error(`Erro ao carregar info do colaborador ${colaborador.id}:`, err)
          return {
            colaboradorId: colaborador.id,
            temAutoavaliacao: false,
            qtdAvaliacoes: 0,
            qtdAvaliacoesGestorRecebidas: 0,
            temAutoavaliacaoGestor: false
          }
        }
      })

      const results = await Promise.all(promises)

      // Converter array de resultados em objeto
      results.forEach(result => {
        info[result.colaboradorId] = {
          temAutoavaliacao: result.temAutoavaliacao,
          qtdAvaliacoes: result.qtdAvaliacoes,
          qtdAvaliacoesGestorRecebidas: result.qtdAvaliacoesGestorRecebidas,
          temAutoavaliacaoGestor: result.temAutoavaliacaoGestor
        }
      })

      setColaboradoresInfoCalibracao(info)
    } catch (err) {
      console.error('Erro ao carregar informações dos colaboradores:', err)
    }
  }

  const handleSelecionarColaboradorCalibracao = async (colaborador) => {
    try {
      setLoadingCalibracao(true)
      setColaboradorCalibracao(colaborador)
      setError(null)
      setComentariosExpandidos({})

      // Carregar eixos de avaliação se ainda não foram carregados
      if (eixosAvaliacao.length === 0) {
        try {
          const eixosResponse = await eixosAvaliacaoAPI.getAll()
          setEixosAvaliacao(eixosResponse.eixos || [])
        } catch (err) {
          console.error('Erro ao carregar eixos:', err)
        }
      }

      const cicloId = cicloCalibracao?.id || null

      // Buscar avaliações de competências e avaliações de gestor em paralelo
      const [avaliacoesResponse, avaliacoesGestorResponse] = await Promise.all([
        avaliacoesAPI.getAvaliacoesColaboradorAdmin(colaborador.id, cicloId),
        avaliacoesGestorAPI.getAvaliacoesGestorAdmin(colaborador.id, cicloId)
      ])

      setAvaliacoesCalibracao(avaliacoesResponse.avaliacoes || [])
      setAvaliacoesGestorCalibracao(avaliacoesGestorResponse.avaliacoes || [])
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err)
      setError('Erro ao carregar avaliações do colaborador. Tente novamente.')
    } finally {
      setLoadingCalibracao(false)
    }
  }

  const toggleComentarios = (avaliacaoId) => {
    setComentariosExpandidos(prev => ({
      ...prev,
      [avaliacaoId]: !prev[avaliacaoId]
    }))
  }

  const getNivelEixo = (avaliacao, eixoId) => {
    // Usar eixos_detalhados que é a lista retornada pela API
    const eixosList = avaliacao.eixos_detalhados || avaliacao.eixos || []
    if (!Array.isArray(eixosList)) return '-'
    const eixoAvaliado = eixosList.find(e => e.eixo_id === eixoId)
    return eixoAvaliado ? eixoAvaliado.nivel : '-'
  }

  const handleVoltarCalibracao = () => {
    setColaboradorCalibracao(null)
    setAvaliacoesCalibracao([])
    setAvaliacoesGestorCalibracao([])
  }

  // Funções para Acompanhamento
  const loadAcompanhamento = async () => {
    try {
      setLoadingAcompanhamento(true)
      setError(null)

      // Buscar todos os ciclos primeiro para permitir seleção
      const response = await ciclosAPI.getAll()
      setCiclos(response.ciclos || [])

      // Filtrar ciclos abertos/em andamento
      const ciclosAtivos = (response.ciclos || []).filter(c =>
        c.status === 'aberto' || c.status === 'em_andamento'
      )

      if (ciclosAtivos.length > 0) {
        const ciclo = ciclosAtivos[0]
        setCicloAcompanhamento(ciclo)

        // Carregar dados de acompanhamento
        const acompanhamentoResponse = await ciclosAPI.getAcompanhamento(ciclo.id)
        setDadosAcompanhamento(acompanhamentoResponse)
      } else {
        setCicloAcompanhamento(null)
        setDadosAcompanhamento(null)
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar acompanhamento', '/ciclos/acompanhamento', showError)
      setError(message)
    } finally {
      setLoadingAcompanhamento(false)
    }
  }

  const handleChangeCicloAcompanhamento = async (cicloId) => {
    try {
      setLoadingAcompanhamento(true)
      setError(null)

      const ciclo = ciclos.find(c => c.id === parseInt(cicloId))
      if (ciclo) {
        setCicloAcompanhamento(ciclo)
        const acompanhamentoResponse = await ciclosAPI.getAcompanhamento(ciclo.id)
        setDadosAcompanhamento(acompanhamentoResponse)
      }
    } catch (err) {
      const { message } = handleApiError(err, 'carregar acompanhamento', '/ciclos/acompanhamento', showError)
      setError(message)
    } finally {
      setLoadingAcompanhamento(false)
    }
  }

  const colaboradoresAcompanhamentoFiltrados = (dadosAcompanhamento?.colaboradores || []).filter(col =>
    col.nome?.toLowerCase().includes(filtroAcompanhamento.toLowerCase()) ||
    col.email?.toLowerCase().includes(filtroAcompanhamento.toLowerCase()) ||
    col.cargo?.toLowerCase().includes(filtroAcompanhamento.toLowerCase()) ||
    col.departamento?.toLowerCase().includes(filtroAcompanhamento.toLowerCase())
  )

  // Handlers para Colaboradores
  const handleInputChangeColaborador = (campo, valor) => {
    setFormularioColaborador(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const handleSalvarColaborador = async () => {
    if (!formularioColaborador.nome.trim() || !formularioColaborador.email.trim()) {
      warning('Nome e email são obrigatórios')
      return
    }

    try {
      setError(null)
      if (colaboradorEditando) {
        await colaboradoresAPI.update(colaboradorEditando.id, {
          nome: formularioColaborador.nome.trim(),
          email: formularioColaborador.email.trim(),
          cargo: formularioColaborador.cargo.trim() || null,
          departamento: formularioColaborador.departamento.trim() || null,
          avatar: formularioColaborador.avatar.trim() || null,
          is_admin: formularioColaborador.is_admin || false
        })
        success('Colaborador atualizado com sucesso!')
      } else {
        await colaboradoresAPI.create({
          nome: formularioColaborador.nome.trim(),
          email: formularioColaborador.email.trim(),
          cargo: formularioColaborador.cargo.trim() || null,
          departamento: formularioColaborador.departamento.trim() || null,
          avatar: formularioColaborador.avatar.trim() || null
        })
        success('Colaborador criado com sucesso!')
      }
      handleCancelarColaborador()
      await loadColaboradores()
    } catch (err) {
      const { message } = handleApiError(err, 'salvar colaborador', '/colaboradores', showError)
      setError(message)
    }
  }

  const handleEditarColaborador = (colaborador) => {
    setColaboradorEditando(colaborador)
    setFormularioColaborador({
      nome: colaborador.nome || '',
      email: colaborador.email || '',
      cargo: colaborador.cargo || '',
      departamento: colaborador.departamento || '',
      avatar: colaborador.avatar || '',
      is_admin: colaborador.is_admin || false
    })
    setMostrarFormularioColaborador(true)
  }

  const handleExcluirColaborador = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este colaborador?')) {
      try {
        setError(null)
        await colaboradoresAPI.delete(id)
        success('Colaborador excluído com sucesso!')
        await loadColaboradores()
      } catch (err) {
        const { message } = handleApiError(err, 'excluir colaborador', '/colaboradores', showError)
        setError(message)
      }
    }
  }

  const handleCancelarColaborador = () => {
    setFormularioColaborador({
      nome: '',
      email: '',
      cargo: '',
      departamento: '',
      avatar: '',
      is_admin: false
    })
    setColaboradorEditando(null)
    setMostrarFormularioColaborador(false)
    setError(null)
  }

  // Handlers para Ciclos
  const handleInputChangeCiclo = (campo, valor) => {
    setFormularioCiclo(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const handleSalvarCiclo = async () => {
    if (!formularioCiclo.nome.trim()) {
      warning('Nome é obrigatório')
      return
    }

    try {
      setError(null)
      // Converter datas de string (YYYY-MM-DD) para ISO datetime
      const dataInicio = formularioCiclo.data_inicio
        ? new Date(formularioCiclo.data_inicio + 'T00:00:00').toISOString()
        : null
      const dataFim = formularioCiclo.data_fim
        ? new Date(formularioCiclo.data_fim + 'T23:59:59').toISOString()
        : null

      const dataCiclo = {
        nome: formularioCiclo.nome.trim(),
        status: formularioCiclo.status,
        etapa_atual: formularioCiclo.etapa_atual || 'escolha_pares',
        data_inicio: dataInicio,
        data_fim: dataFim
      }

      if (cicloEditando) {
        await ciclosAPI.update(cicloEditando.id, dataCiclo)
        success('Ciclo atualizado com sucesso!')
      } else {
        await ciclosAPI.create(dataCiclo)
        success('Ciclo criado com sucesso!')
      }
      handleCancelarCiclo()
      await loadCiclos()
    } catch (err) {
      const { message } = handleApiError(err, 'salvar ciclo', '/ciclos', showError)
      setError(message)
    }
  }

  const handleEditarCiclo = (ciclo) => {
    setCicloEditando(ciclo)
    const dataInicio = ciclo.data_inicio ? new Date(ciclo.data_inicio).toISOString().split('T')[0] : ''
    const dataFim = ciclo.data_fim ? new Date(ciclo.data_fim).toISOString().split('T')[0] : ''
    setFormularioCiclo({
      nome: ciclo.nome || '',
      status: ciclo.status || 'aberto',
      etapa_atual: ciclo.etapa_atual || 'escolha_pares',
      data_inicio: dataInicio,
      data_fim: dataFim
    })
    setMostrarFormularioCiclo(true)
  }

  const handleExcluirCiclo = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este ciclo?')) {
      try {
        setError(null)
        await ciclosAPI.delete(id)
        success('Ciclo excluído com sucesso!')
        await loadCiclos()
      } catch (err) {
        const { message } = handleApiError(err, 'excluir ciclo', '/ciclos', showError)
        setError(message)
      }
    }
  }

  const handleCancelarCiclo = () => {
    setFormularioCiclo({
      nome: '',
      status: 'aberto',
      etapa_atual: 'escolha_pares',
      data_inicio: '',
      data_fim: ''
    })
    setCicloEditando(null)
    setMostrarFormularioCiclo(false)
    setError(null)
  }

  const colaboradoresFiltrados = colaboradores.filter(col =>
    col.nome?.toLowerCase().includes(filtroColaboradores.toLowerCase()) ||
    col.email?.toLowerCase().includes(filtroColaboradores.toLowerCase()) ||
    col.cargo?.toLowerCase().includes(filtroColaboradores.toLowerCase()) ||
    col.departamento?.toLowerCase().includes(filtroColaboradores.toLowerCase())
  )

  const ciclosFiltrados = ciclos.filter(ciclo =>
    ciclo.nome?.toLowerCase().includes(filtroCiclos.toLowerCase()) ||
    ciclo.status?.toLowerCase().includes(filtroCiclos.toLowerCase()) ||
    ciclo.etapa_atual?.toLowerCase().includes(filtroCiclos.toLowerCase())
  )

  const departamentos = [...new Set(colaboradores.map(col => col.departamento).filter(Boolean))].sort()

  const getStatusLabel = (status) => {
    const labels = {
      'aberto': 'Aberto',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído',
      'fechado': 'Fechado'
    }
    return labels[status] || status
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      'aberto': 'status-badge aberto',
      'em_andamento': 'status-badge em-andamento',
      'concluido': 'status-badge concluido',
      'fechado': 'status-badge fechado'
    }
    return classes[status] || 'status-badge'
  }

  const getEtapaLabel = (etapa) => {
    const labels = {
      'escolha_pares': 'Escolha de Pares',
      'aprovacao_pares': 'Aprovação de Pares',
      'avaliacoes': 'Avaliações',
      'calibracao': 'Calibração',
      'feedback': 'Feedback'
    }
    return labels[etapa] || etapa
  }

  const getEtapaBadgeClass = (etapa) => {
    const classes = {
      'escolha_pares': 'status-badge etapa-escolha-pares',
      'aprovacao_pares': 'status-badge etapa-aprovacao-pares',
      'avaliacoes': 'status-badge etapa-avaliacoes',
      'calibracao': 'status-badge etapa-calibracao',
      'feedback': 'status-badge etapa-feedback'
    }
    return classes[etapa] || 'status-badge'
  }

  const handleAvancarEtapa = async (cicloId) => {
    if (window.confirm('Tem certeza que deseja avançar a etapa deste ciclo?')) {
      try {
        setError(null)
        await ciclosAPI.avancarEtapa(cicloId)
        success('Etapa avançada com sucesso!')
        await loadCiclos()
      } catch (err) {
        const { message } = handleApiError(err, 'avançar etapa do ciclo', '/ciclos/avancar-etapa', showError)
        setError(message)
      }
    }
  }

  const podeAvancarEtapa = (ciclo) => {
    return ciclo.etapa_atual !== 'feedback'
  }

  // Handlers para Aprovação de Pares
  const handleEditarPares = async (cicloAvaliacao) => {
    setLideradoEditando(cicloAvaliacao)
    // Carregar pares selecionados
    const paresIds = cicloAvaliacao.pares_selecionados?.map(ps => ps.par_id) || []
    setParesSelecionados(paresIds)
    await loadColaboradoresParaPares()
    setMostrarFormularioPares(true)
  }

  const handleTogglePar = (colaboradorId) => {
    setParesSelecionados(prev => {
      if (prev.includes(colaboradorId)) {
        return prev.filter(id => id !== colaboradorId)
      } else {
        if (prev.length < 4) {
          return [...prev, colaboradorId]
        }
        return prev
      }
    })
  }

  const handleSalvarPares = async () => {
    if (paresSelecionados.length !== 4) {
      warning('É necessário selecionar exatamente 4 pares')
      return
    }

    try {
      setError(null)
      await ciclosAvaliacaoAPI.updateParesLiderado(lideradoEditando.id, {
        pares_ids: paresSelecionados
      })
      success('Pares atualizados com sucesso!')
      handleCancelarPares()
      if (cicloAprovacao) {
        await loadCiclosAvaliacaoLiderados(cicloAprovacao.id)
      }
    } catch (err) {
      const { message } = handleApiError(err, 'salvar pares', '/ciclos-avaliacao/gestor/pares', showError)
      setError(message)
    }
  }

  const handleCancelarPares = () => {
    setLideradoEditando(null)
    setParesSelecionados([])
    setMostrarFormularioPares(false)
    setError(null)
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            ← Voltar
          </button>
          <h1 className="page-title">Área Administrativa</h1>
          <div className="header-buttons">
            <button className="admin-button" onClick={() => navigate('/admin')}>
              Administração
            </button>
            <button className="logout-button" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-content">
          <div className="admin-sidebar">
            <h2 className="sidebar-title">Menu Administrativo</h2>
            <nav className="admin-nav">
              <button
                className={`admin-nav-item ${abaAtiva === 'colaboradores' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('colaboradores')}
              >
                👥 Colaboradores
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'ciclos' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('ciclos')}
              >
                📊 Ciclos
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_pares' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('aprovacao_pares')}
              >
                ✅ Aprovação de Pares
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'calibracao' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('calibracao')}
              >
                📋 Calibração
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'acompanhamento' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('acompanhamento')}
              >
                📈 Acompanhamento
              </button>
            </nav>
          </div>

          <div className="admin-panel">
            {abaAtiva === 'colaboradores' && (
              <>
                <div className="admin-panel-header">
                  <div>
                    <h2 className="panel-title">Controle de Colaboradores</h2>
                    <p className="panel-subtitle">
                      Gerencie os colaboradores do sistema
                    </p>
                  </div>
                  {!mostrarFormularioColaborador && (
                    <button
                      className="adicionar-button"
                      onClick={() => setMostrarFormularioColaborador(true)}
                    >
                      + Adicionar Colaborador
                    </button>
                  )}
                </div>

                {mostrarFormularioColaborador && (
                  <div className="formulario-container">
                    <h3 className="formulario-title">
                      {colaboradorEditando ? 'Editar Colaborador' : 'Novo Colaborador'}
                    </h3>

                    <div className="formulario-campo">
                      <label className="campo-label">
                        Nome <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="campo-input"
                        placeholder="Nome completo do colaborador"
                        value={formularioColaborador.nome}
                        onChange={(e) => handleInputChangeColaborador('nome', e.target.value)}
                      />
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">
                        Email <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        className="campo-input"
                        placeholder="email@exemplo.com"
                        value={formularioColaborador.email}
                        onChange={(e) => handleInputChangeColaborador('email', e.target.value)}
                        disabled={!!colaboradorEditando}
                      />
                      {colaboradorEditando && (
                        <p className="campo-descricao" style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
                          O email não pode ser alterado
                        </p>
                      )}
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">
                        Cargo
                      </label>
                      <input
                        type="text"
                        className="campo-input"
                        placeholder="Cargo do colaborador"
                        value={formularioColaborador.cargo}
                        onChange={(e) => handleInputChangeColaborador('cargo', e.target.value)}
                      />
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">
                        Departamento
                      </label>
                      <input
                        type="text"
                        className="campo-input"
                        placeholder="Nome do departamento"
                        value={formularioColaborador.departamento}
                        onChange={(e) => handleInputChangeColaborador('departamento', e.target.value)}
                        list="departamentos-list"
                      />
                      <datalist id="departamentos-list">
                        {departamentos.map(dept => (
                          <option key={dept} value={dept} />
                        ))}
                      </datalist>
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">Avatar (URL da imagem)</label>
                      <input
                        type="url"
                        className="campo-input"
                        placeholder="https://exemplo.com/avatar.jpg"
                        value={formularioColaborador.avatar}
                        onChange={(e) => handleInputChangeColaborador('avatar', e.target.value)}
                      />
                      <p className="campo-descricao" style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
                        URL da imagem do avatar. Se não informado, será exibida a inicial do nome.
                      </p>
                    </div>

                    {colaboradorEditando && (
                      <div className="formulario-campo">
                        <label className="campo-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={formularioColaborador.is_admin || false}
                            onChange={(e) => handleInputChangeColaborador('is_admin', e.target.checked)}
                          />
                          <span>Administrador</span>
                        </label>
                        <p className="campo-descricao" style={{ marginTop: '4px', fontSize: '0.85rem', color: '#666' }}>
                          Marque esta opção para conceder permissões de administrador a este colaborador.
                        </p>
                      </div>
                    )}

                    <div className="formulario-actions">
                      <button
                        className="cancelar-button"
                        onClick={handleCancelarColaborador}
                      >
                        Cancelar
                      </button>
                      <button
                        className={`salvar-button ${formularioColaborador.nome.trim() && formularioColaborador.email.trim() ? 'enabled' : 'disabled'}`}
                        onClick={handleSalvarColaborador}
                        disabled={!formularioColaborador.nome.trim() || !formularioColaborador.email.trim()}
                      >
                        {colaboradorEditando ? 'Salvar Alterações' : 'Adicionar Colaborador'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="admin-filtros">
                  <input
                    type="text"
                    className="filtro-input"
                    placeholder="Buscar por nome, email, cargo ou departamento..."
                    value={filtroColaboradores}
                    onChange={(e) => setFiltroColaboradores(e.target.value)}
                  />
                </div>

                <div className="colaboradores-lista">
                  {error && (
                    <div className="error-message" style={{
                      padding: '12px',
                      background: '#ffebee',
                      color: '#c62828',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      {error}
                    </div>
                  )}

                  {loadingColaboradores ? (
                    <div className="empty-state">
                      <div className="empty-icon">⏳</div>
                      <p className="empty-text">Carregando colaboradores...</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="lista-title">
                        {colaboradoresFiltrados.length > 0
                          ? `Colaboradores (${colaboradoresFiltrados.length})`
                          : 'Nenhum colaborador encontrado'}
                      </h3>

                      {colaboradoresFiltrados.length === 0 && !mostrarFormularioColaborador && (
                        <div className="empty-state">
                          <div className="empty-icon">👥</div>
                          <p className="empty-text">
                            {filtroColaboradores ? 'Nenhum colaborador encontrado com o filtro aplicado.' : 'Nenhum colaborador cadastrado.'}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {!loadingColaboradores && colaboradoresFiltrados.length > 0 && (
                    <div className="table-container">
                      <table className="colaboradores-table">
                        <thead>
                          <tr>
                            <th>Avatar</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Cargo</th>
                            <th>Departamento</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {colaboradoresFiltrados.map((colaborador) => (
                            <tr key={colaborador.id}>
                              <td>
                                <Avatar
                                  avatar={colaborador.avatar}
                                  nome={colaborador.nome}
                                  size={50}
                                  className="colaborador-avatar"
                                />
                              </td>
                              <td>
                                <div className="colaborador-nome">{colaborador.nome}</div>
                              </td>
                              <td>
                                <div className="colaborador-email">{colaborador.email}</div>
                              </td>
                              <td>
                                <div className="colaborador-cargo">{colaborador.cargo || '-'}</div>
                              </td>
                              <td>
                                {colaborador.departamento ? (
                                  <span className="colaborador-departamento">{colaborador.departamento}</span>
                                ) : (
                                  <span style={{ color: '#999' }}>-</span>
                                )}
                              </td>
                              <td>
                                <div className="colaborador-actions">
                                  <button
                                    className="action-button edit"
                                    onClick={() => handleEditarColaborador(colaborador)}
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="action-button delete"
                                    onClick={() => handleExcluirColaborador(colaborador.id)}
                                    title="Excluir"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {abaAtiva === 'ciclos' && (
              <>
                <div className="admin-panel-header">
                  <div>
                    <h2 className="panel-title">Controle de Ciclos</h2>
                    <p className="panel-subtitle">
                      Gerencie os ciclos de avaliação do sistema
                    </p>
                  </div>
                  {!mostrarFormularioCiclo && (
                    <button
                      className="adicionar-button"
                      onClick={() => setMostrarFormularioCiclo(true)}
                    >
                      + Adicionar Ciclo
                    </button>
                  )}
                </div>

                {mostrarFormularioCiclo && (
                  <div className="formulario-container">
                    <h3 className="formulario-title">
                      {cicloEditando ? 'Editar Ciclo' : 'Novo Ciclo'}
                    </h3>

                    <div className="formulario-campo">
                      <label className="campo-label">
                        Nome <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="campo-input"
                        placeholder="Ex: Ciclo 2024 Q1"
                        value={formularioCiclo.nome}
                        onChange={(e) => handleInputChangeCiclo('nome', e.target.value)}
                      />
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">Status</label>
                      <select
                        className="campo-input"
                        value={formularioCiclo.status}
                        onChange={(e) => handleInputChangeCiclo('status', e.target.value)}
                      >
                        <option value="aberto">Aberto</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="fechado">Fechado</option>
                      </select>
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">Etapa Atual</label>
                      <select
                        className="campo-input"
                        value={formularioCiclo.etapa_atual || 'escolha_pares'}
                        onChange={(e) => handleInputChangeCiclo('etapa_atual', e.target.value)}
                      >
                        <option value="escolha_pares">Escolha de Pares</option>
                        <option value="aprovacao_pares">Aprovação de Pares</option>
                        <option value="avaliacoes">Avaliações</option>
                        <option value="calibracao">Calibração</option>
                        <option value="feedback">Feedback</option>
                      </select>
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">Data de Início</label>
                      <input
                        type="date"
                        className="campo-input"
                        value={formularioCiclo.data_inicio}
                        onChange={(e) => handleInputChangeCiclo('data_inicio', e.target.value)}
                      />
                    </div>

                    <div className="formulario-campo">
                      <label className="campo-label">Data de Fim</label>
                      <input
                        type="date"
                        className="campo-input"
                        value={formularioCiclo.data_fim}
                        onChange={(e) => handleInputChangeCiclo('data_fim', e.target.value)}
                      />
                    </div>

                    <div className="formulario-actions">
                      <button
                        className="cancelar-button"
                        onClick={handleCancelarCiclo}
                      >
                        Cancelar
                      </button>
                      <button
                        className={`salvar-button ${formularioCiclo.nome.trim() ? 'enabled' : 'disabled'}`}
                        onClick={handleSalvarCiclo}
                        disabled={!formularioCiclo.nome.trim()}
                      >
                        {cicloEditando ? 'Salvar Alterações' : 'Adicionar Ciclo'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="admin-filtros">
                  <input
                    type="text"
                    className="filtro-input"
                    placeholder="Buscar por nome, status ou etapa..."
                    value={filtroCiclos}
                    onChange={(e) => setFiltroCiclos(e.target.value)}
                  />
                </div>

                <div className="colaboradores-lista">
                  {error && (
                    <div className="error-message" style={{
                      padding: '12px',
                      background: '#ffebee',
                      color: '#c62828',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      {error}
                    </div>
                  )}

                  {loadingCiclos ? (
                    <div className="empty-state">
                      <div className="empty-icon">⏳</div>
                      <p className="empty-text">Carregando ciclos...</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="lista-title">
                        {ciclosFiltrados.length > 0
                          ? `Ciclos (${ciclosFiltrados.length})`
                          : 'Nenhum ciclo encontrado'}
                      </h3>

                      {ciclosFiltrados.length === 0 && !mostrarFormularioCiclo && (
                        <div className="empty-state">
                          <div className="empty-icon">📊</div>
                          <p className="empty-text">
                            {filtroCiclos ? 'Nenhum ciclo encontrado com o filtro aplicado.' : 'Nenhum ciclo cadastrado.'}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {!loadingCiclos && ciclosFiltrados.length > 0 && (
                    <div className="table-container">
                      <table className="colaboradores-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Status</th>
                            <th>Etapa Atual</th>
                            <th>Data de Início</th>
                            <th>Data de Fim</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ciclosFiltrados.map((ciclo) => (
                            <tr key={ciclo.id}>
                              <td>
                                <div className="colaborador-nome">{ciclo.nome}</div>
                              </td>
                              <td>
                                <span className={getStatusBadgeClass(ciclo.status)}>
                                  {getStatusLabel(ciclo.status)}
                                </span>
                              </td>
                              <td>
                                <span className={getEtapaBadgeClass(ciclo.etapa_atual)}>
                                  {getEtapaLabel(ciclo.etapa_atual)}
                                </span>
                              </td>
                              <td>
                                <div className="colaborador-cargo">
                                  {ciclo.data_inicio ? new Date(ciclo.data_inicio).toLocaleDateString('pt-BR') : '-'}
                                </div>
                              </td>
                              <td>
                                <div className="colaborador-cargo">
                                  {ciclo.data_fim ? new Date(ciclo.data_fim).toLocaleDateString('pt-BR') : '-'}
                                </div>
                              </td>
                              <td>
                                <div className="colaborador-actions">
                                  {podeAvancarEtapa(ciclo) && (
                                    <button
                                      className="action-button avancar"
                                      onClick={() => handleAvancarEtapa(ciclo.id)}
                                      title="Avançar Etapa"
                                      style={{ background: '#4caf50', color: 'white' }}
                                    >
                                      ➤
                                    </button>
                                  )}
                                  <button
                                    className="action-button edit"
                                    onClick={() => handleEditarCiclo(ciclo)}
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="action-button delete"
                                    onClick={() => handleExcluirCiclo(ciclo.id)}
                                    title="Excluir"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {abaAtiva === 'aprovacao_pares' && (
              <>
                <div className="admin-panel-header">
                  <div>
                    <h2 className="panel-title">Aprovação de Pares</h2>
                    <p className="panel-subtitle">
                      {cicloAprovacao
                        ? `Aprove ou altere os pares escolhidos pelos seus liderados - ${cicloAprovacao.nome}`
                        : 'Nenhum ciclo na etapa de aprovação de pares'}
                    </p>
                  </div>
                </div>

                {mostrarFormularioPares && lideradoEditando && (
                  <div className="formulario-container">
                    <h3 className="formulario-title">
                      Editar pares de {lideradoEditando.colaborador?.nome || 'Liderado'}
                    </h3>
                    <p className="campo-descricao" style={{ marginBottom: '20px' }}>
                      Selecione exatamente 4 colaboradores como pares. Você pode alterar os pares escolhidos pelo liderado.
                    </p>

                    <div style={{ marginBottom: '20px' }}>
                      <p style={{ fontWeight: 500, marginBottom: '10px' }}>
                        Pares selecionados: {paresSelecionados.length} / 4
                      </p>
                      {paresSelecionados.length === 4 && (
                        <p style={{ color: '#4caf50', fontSize: '0.9rem' }}>
                          ✓ Quantidade correta de pares selecionados
                        </p>
                      )}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '20px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      padding: '10px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}>
                      {colaboradoresDisponiveis
                        .filter(col => col.id !== lideradoEditando.colaborador_id)
                        .map(col => {
                          const isSelected = paresSelecionados.includes(col.id)
                          return (
                            <div
                              key={col.id}
                              onClick={() => handleTogglePar(col.id)}
                              style={{
                                padding: '12px',
                                border: `2px solid ${isSelected ? '#4caf50' : '#e5e7eb'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: isSelected ? '#e8f5e9' : 'white',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                              }}
                            >
                              <Avatar
                                avatar={col.avatar}
                                nome={col.nome}
                                size={40}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{col.nome}</div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>{col.cargo || '-'}</div>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    <div className="formulario-actions">
                      <button
                        className="cancelar-button"
                        onClick={handleCancelarPares}
                      >
                        Cancelar
                      </button>
                      <button
                        className={`salvar-button ${paresSelecionados.length === 4 ? 'enabled' : 'disabled'}`}
                        onClick={handleSalvarPares}
                        disabled={paresSelecionados.length !== 4}
                      >
                        Salvar Pares
                      </button>
                    </div>
                  </div>
                )}

                <div className="colaboradores-lista">
                  {error && (
                    <div className="error-message" style={{
                      padding: '12px',
                      background: '#ffebee',
                      color: '#c62828',
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      {error}
                    </div>
                  )}

                  {loadingAprovacao ? (
                    <div className="empty-state">
                      <div className="empty-icon">⏳</div>
                      <p className="empty-text">Carregando dados de aprovação...</p>
                    </div>
                  ) : !cicloAprovacao ? (
                    <div className="empty-state">
                      <div className="empty-icon">📋</div>
                      <p className="empty-text">
                        Nenhum ciclo está na etapa de aprovação de pares no momento.
                      </p>
                      <p className="empty-text" style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                        Avance um ciclo para a etapa "Aprovação de Pares" para gerenciar os pares dos liderados.
                      </p>
                    </div>
                  ) : ciclosAvaliacaoLiderados.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👥</div>
                      <p className="empty-text">
                        Nenhum liderado encontrado ou nenhum liderado selecionou pares ainda.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 className="lista-title">
                        Liderados ({ciclosAvaliacaoLiderados.length})
                      </h3>
                      <div className="table-container">
                        <table className="colaboradores-table">
                          <thead>
                            <tr>
                              <th>Colaborador</th>
                              <th>Pares Selecionados</th>
                              <th>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ciclosAvaliacaoLiderados.map((cicloAvaliacao) => {
                              const pares = cicloAvaliacao.pares_selecionados || []
                              return (
                                <tr key={cicloAvaliacao.id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <Avatar
                                        avatar={cicloAvaliacao.colaborador?.avatar}
                                        nome={cicloAvaliacao.colaborador?.nome}
                                        size={50}
                                      />
                                      <div>
                                        <div className="colaborador-nome">
                                          {cicloAvaliacao.colaborador?.nome}
                                        </div>
                                        <div className="colaborador-email" style={{ fontSize: '0.85rem' }}>
                                          {cicloAvaliacao.colaborador?.email}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                      {pares.length > 0 ? (
                                        pares.map((parSelecionado) => {
                                          // Tentar encontrar o par nos colaboradores disponíveis ou buscar do relacionamento
                                          const par = colaboradoresDisponiveis.find(c => c.id === parSelecionado.par_id) ||
                                            (parSelecionado.par ? {
                                              id: parSelecionado.par_id,
                                              nome: parSelecionado.par.nome || `ID: ${parSelecionado.par_id}`,
                                              avatar: parSelecionado.par.avatar,
                                              cargo: parSelecionado.par.cargo
                                            } : null)
                                          return par ? (
                                            <span
                                              key={parSelecionado.id}
                                              style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                background: '#f0f0f0',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem'
                                              }}
                                            >
                                              <Avatar
                                                avatar={par.avatar}
                                                nome={par.nome}
                                                size={24}
                                              />
                                              {par.nome}
                                            </span>
                                          ) : (
                                            <span key={parSelecionado.id} style={{ color: '#999' }}>
                                              ID: {parSelecionado.par_id}
                                            </span>
                                          )
                                        })
                                      ) : (
                                        <span style={{ color: '#999' }}>Nenhum par selecionado</span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="colaborador-actions">
                                      <button
                                        className="action-button edit"
                                        onClick={() => handleEditarPares(cicloAvaliacao)}
                                        title="Editar Pares"
                                      >
                                        ✏️
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {abaAtiva === 'calibracao' && (
              <>
                <div className="admin-panel-header">
                  <div>
                    <h2 className="panel-title">Calibração de Avaliações</h2>
                    <p className="panel-subtitle">
                      {cicloCalibracao
                        ? `Visualize as avaliações recebidas por cada colaborador no ciclo "${cicloCalibracao.nome}"`
                        : 'Nenhum ciclo na etapa de calibração encontrado'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="error-message" style={{
                    padding: '12px',
                    background: '#ffebee',
                    color: '#c62828',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    {error}
                  </div>
                )}

                {!cicloCalibracao ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <p className="empty-text">Nenhum ciclo na etapa de calibração encontrado.</p>
                    <p className="empty-text" style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
                      Avance um ciclo para a etapa de calibração para visualizar as avaliações.
                    </p>
                  </div>
                ) : !colaboradorCalibracao ? (
                  <div>
                    <div className="admin-filtros">
                      <input
                        type="text"
                        className="filtro-input"
                        placeholder="Buscar colaborador por nome, email, cargo ou departamento..."
                        value={filtroColaboradores}
                        onChange={(e) => setFiltroColaboradores(e.target.value)}
                      />
                    </div>

                    <div className="colaboradores-lista">
                      {(() => {
                        // Identificar gestores: colaboradores que têm liderados (algum colaborador tem gestor_id apontando para eles)
                        const gestoresIds = new Set(colaboradores.map(c => c.gestor_id).filter(Boolean))
                        const gestoresFiltrados = colaboradoresFiltrados.filter(c => gestoresIds.has(c.id))
                        const colaboradoresSemGestorFiltrados = colaboradoresFiltrados.filter(c => !gestoresIds.has(c.id))

                        return (
                          <>
                            {/* Tabela de Gestores */}
                            <h3 className="lista-title" style={{ marginTop: '20px' }}>
                              👔 Gestores ({gestoresFiltrados.length})
                            </h3>

                            {gestoresFiltrados.length === 0 ? (
                              <div className="empty-state" style={{ marginBottom: '30px' }}>
                                <p className="empty-text">
                                  {filtroColaboradores ? 'Nenhum gestor encontrado com o filtro aplicado.' : 'Nenhum gestor encontrado.'}
                                </p>
                              </div>
                            ) : (
                              <div className="table-container" style={{ marginBottom: '40px' }}>
                                <table className="colaboradores-table">
                                  <thead>
                                    <tr>
                                      <th>Gestor</th>
                                      <th>Departamento</th>
                                      <th>Autoavaliação</th>
                                      <th>Avaliações Recebidas</th>
                                      <th>Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {gestoresFiltrados.map((gestor) => {
                                      const info = colaboradoresInfoCalibracao[gestor.id] || { temAutoavaliacao: false, qtdAvaliacoes: 0, qtdAvaliacoesGestorRecebidas: 0, temAutoavaliacaoGestor: false }
                                      return (
                                        <tr key={gestor.id}>
                                          <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                              <Avatar
                                                avatar={gestor.avatar}
                                                nome={gestor.nome}
                                                size={50}
                                              />
                                              <div>
                                                <div className="colaborador-nome">{gestor.nome}</div>
                                                <div className="colaborador-email" style={{ fontSize: '0.85rem' }}>
                                                  {gestor.cargo || '-'}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>{gestor.departamento || '-'}</td>
                                          <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {info.temAutoavaliacaoGestor ? (
                                                <span
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '2px 8px',
                                                    background: '#4caf50',
                                                    color: '#fff',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                  }}
                                                  title="Autoavaliação de gestor realizada"
                                                >
                                                  ✓
                                                </span>
                                              ) : (
                                                <span
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '2px 8px',
                                                    background: '#ff9800',
                                                    color: '#fff',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                  }}
                                                  title="Autoavaliação de gestor não realizada"
                                                >
                                                  ✗
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              minWidth: '30px',
                                              padding: '4px 12px',
                                              background: info.qtdAvaliacoesGestorRecebidas > 0 ? '#f3e5f5' : '#f5f5f5',
                                              color: info.qtdAvaliacoesGestorRecebidas > 0 ? '#7b1fa2' : '#999',
                                              borderRadius: '16px',
                                              fontSize: '0.9rem',
                                              fontWeight: '600'
                                            }}>
                                              {info.qtdAvaliacoesGestorRecebidas}
                                            </span>
                                          </td>
                                          <td>
                                            <button
                                              className="action-button"
                                              onClick={() => handleSelecionarColaboradorCalibracao(gestor)}
                                              style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto' }}
                                            >
                                              Ver
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Tabela de Colaboradores */}
                            <h3 className="lista-title">
                              👥 Colaboradores ({colaboradoresSemGestorFiltrados.length})
                            </h3>

                            {colaboradoresSemGestorFiltrados.length === 0 ? (
                              <div className="empty-state">
                                <p className="empty-text">
                                  {filtroColaboradores ? 'Nenhum colaborador encontrado com o filtro aplicado.' : 'Nenhum colaborador encontrado.'}
                                </p>
                              </div>
                            ) : (
                              <div className="table-container">
                                <table className="colaboradores-table">
                                  <thead>
                                    <tr>
                                      <th>Colaborador</th>
                                      <th>Departamento</th>
                                      <th>Autoavaliação</th>
                                      <th>Avaliações Recebidas</th>
                                      <th>Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {colaboradoresSemGestorFiltrados.map((colaborador) => {
                                      const info = colaboradoresInfoCalibracao[colaborador.id] || { temAutoavaliacao: false, qtdAvaliacoes: 0 }
                                      return (
                                        <tr key={colaborador.id}>
                                          <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                              <Avatar
                                                avatar={colaborador.avatar}
                                                nome={colaborador.nome}
                                                size={50}
                                              />
                                              <div>
                                                <div className="colaborador-nome">{colaborador.nome}</div>
                                                <div className="colaborador-email" style={{ fontSize: '0.85rem' }}>
                                                  {colaborador.cargo || '-'}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td>{colaborador.departamento || '-'}</td>
                                          <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {info.temAutoavaliacao ? (
                                                <span
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '2px 8px',
                                                    background: '#4caf50',
                                                    color: '#fff',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                  }}
                                                  title="Autoavaliação realizada"
                                                >
                                                  ✓
                                                </span>
                                              ) : (
                                                <span
                                                  style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    padding: '2px 8px',
                                                    background: '#ff9800',
                                                    color: '#fff',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '500'
                                                  }}
                                                  title="Autoavaliação não realizada"
                                                >
                                                  ✗
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              minWidth: '30px',
                                              padding: '4px 12px',
                                              background: '#e3f2fd',
                                              color: '#1976d2',
                                              borderRadius: '16px',
                                              fontSize: '0.9rem',
                                              fontWeight: '600'
                                            }}>
                                              {info.qtdAvaliacoes}
                                            </span>
                                          </td>
                                          <td>
                                            <button
                                              className="action-button"
                                              onClick={() => handleSelecionarColaboradorCalibracao(colaborador)}
                                              style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto' }}
                                            >
                                              Ver
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <button
                        className="voltar-button"
                        onClick={handleVoltarCalibracao}
                        style={{ marginBottom: '20px' }}
                      >
                        ← Voltar para Lista
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <Avatar
                          avatar={colaboradorCalibracao.avatar}
                          nome={colaboradorCalibracao.nome}
                          size={60}
                        />
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{colaboradorCalibracao.nome}</h3>
                          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
                            {colaboradorCalibracao.cargo || ''} {colaboradorCalibracao.departamento ? `• ${colaboradorCalibracao.departamento}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {loadingCalibracao ? (
                      <div className="empty-state">
                        <div className="empty-icon">⏳</div>
                        <p className="empty-text">Carregando avaliações...</p>
                      </div>
                    ) : avaliacoesCalibracao.length === 0 && avaliacoesGestorCalibracao.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <p className="empty-text">Nenhuma avaliação encontrada para este colaborador.</p>
                      </div>
                    ) : (
                      <div>
                        {avaliacoesCalibracao.length > 0 && (
                          <>
                            <h3 style={{ marginBottom: '20px' }}>Avaliações de Competências ({avaliacoesCalibracao.length})</h3>
                            {eixosAvaliacao.length > 0 ? (
                              <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="colaboradores-table" style={{ minWidth: '800px' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 10 }}>
                                        Tipo / Avaliador
                                      </th>
                                      {eixosAvaliacao.map((eixo) => (
                                        <th key={eixo.id} style={{ textAlign: 'center', minWidth: '100px' }}>
                                          {eixo.nome}
                                        </th>
                                      ))}
                                      <th style={{ minWidth: '120px' }}>Comentários</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {avaliacoesCalibracao.map((avaliacao) => {
                                      const comentariosAberto = comentariosExpandidos[avaliacao.id] || false
                                      const eixosList = avaliacao.eixos_detalhados || avaliacao.eixos || []
                                      const temComentarios = avaliacao.avaliacao_geral ||
                                        (Array.isArray(eixosList) && eixosList.some(e => e.justificativa))

                                      return (
                                        <>
                                          <tr key={avaliacao.id}>
                                            <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 9 }}>
                                              <div>
                                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                  {avaliacao.tipo === 'autoavaliacao' ? 'Autoavaliação' :
                                                    avaliacao.tipo === 'gestor' ? 'Avaliação do Gestor' :
                                                      'Avaliação de Par'}
                                                </div>
                                                {avaliacao.avaliador && avaliacao.tipo !== 'autoavaliacao' && (
                                                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                    {avaliacao.avaliador.nome}
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            {eixosAvaliacao.map((eixo) => {
                                              const nivel = getNivelEixo(avaliacao, eixo.id)
                                              return (
                                                <td key={eixo.id} style={{ textAlign: 'center' }}>
                                                  {nivel !== '-' ? (
                                                    <span style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      width: '36px',
                                                      height: '36px',
                                                      borderRadius: '50%',
                                                      background: '#e3f2fd',
                                                      color: '#1976d2',
                                                      fontSize: '0.9rem',
                                                      fontWeight: '600'
                                                    }}>
                                                      {nivel}
                                                    </span>
                                                  ) : (
                                                    <span style={{ color: '#999' }}>-</span>
                                                  )}
                                                </td>
                                              )
                                            })}
                                            <td>
                                              {temComentarios ? (
                                                <button
                                                  className="action-button"
                                                  onClick={() => toggleComentarios(avaliacao.id)}
                                                  style={{
                                                    padding: '6px 12px',
                                                    fontSize: '0.85rem',
                                                    minWidth: 'auto'
                                                  }}
                                                >
                                                  {comentariosAberto ? 'Ocultar' : 'Ver'}
                                                </button>
                                              ) : (
                                                <span style={{ color: '#999', fontSize: '0.85rem' }}>-</span>
                                              )}
                                            </td>
                                          </tr>
                                          {comentariosAberto && temComentarios && (
                                            <tr key={`${avaliacao.id}-comentarios`}>
                                              <td colSpan={eixosAvaliacao.length + 2} style={{
                                                background: '#f9f9f9',
                                                padding: '20px',
                                                borderTop: 'none'
                                              }}>
                                                <div style={{ maxWidth: '100%' }}>
                                                  {avaliacao.avaliacao_geral && (
                                                    <div style={{ marginBottom: '16px' }}>
                                                      <h5 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                                                        Avaliação Geral
                                                      </h5>
                                                      <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '0.9rem' }}>
                                                        {avaliacao.avaliacao_geral}
                                                      </p>
                                                    </div>
                                                  )}
                                                  {eixosList && eixosList.length > 0 && (
                                                    <div>
                                                      <h5 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                                                        Justificativas por Eixo
                                                      </h5>
                                                      <div style={{ display: 'grid', gap: '12px' }}>
                                                        {eixosList
                                                          .filter(e => e.justificativa)
                                                          .map((eixo) => (
                                                            <div
                                                              key={eixo.id}
                                                              style={{
                                                                padding: '12px',
                                                                background: '#fff',
                                                                borderRadius: '6px',
                                                                border: '1px solid #e0e0e0'
                                                              }}
                                                            >
                                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                <strong style={{ fontSize: '0.9rem' }}>
                                                                  {eixo.eixo?.nome || `Eixo ${eixo.eixo_id}`}
                                                                </strong>
                                                                <span style={{
                                                                  padding: '4px 8px',
                                                                  background: '#e3f2fd',
                                                                  color: '#1976d2',
                                                                  borderRadius: '4px',
                                                                  fontSize: '0.8rem',
                                                                  fontWeight: '500'
                                                                }}>
                                                                  Nível {eixo.nivel}
                                                                </span>
                                                              </div>
                                                              <p style={{ margin: 0, color: '#666', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                                                {eixo.justificativa}
                                                              </p>
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

                        {/* Seção de Avaliações de Gestor Recebidas */}
                        {avaliacoesGestorCalibracao.length > 0 && (
                          <div style={{ marginTop: '40px' }}>
                            <h3 style={{ marginBottom: '20px', color: '#7b1fa2' }}>
                              👔 Avaliações de Gestor Recebidas ({avaliacoesGestorCalibracao.filter(av => av.colaborador_id !== av.gestor_id).length})
                            </h3>
                            <p style={{ marginBottom: '16px', color: '#666', fontSize: '0.9rem' }}>
                              Avaliações que os liderados fizeram deste colaborador como gestor
                            </p>

                            {avaliacoesGestorCalibracao.filter(av => av.colaborador_id !== av.gestor_id).map((avaliacao) => {
                              const respostasFechadas = avaliacao.respostas?.filter(r => r.resposta_escala !== null) || []
                              const respostasAbertas = avaliacao.respostas?.filter(r => r.resposta_texto !== null) || []
                              const isExpanded = comentariosExpandidos[`gestor-${avaliacao.id}`] || false

                              return (
                                <div
                                  key={avaliacao.id}
                                  style={{
                                    background: '#fff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    overflow: 'hidden'
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: '16px',
                                      background: '#f3e5f5',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <Avatar
                                        avatar={avaliacao.colaborador?.avatar}
                                        nome={avaliacao.colaborador?.nome || 'Avaliador'}
                                        size={40}
                                      />
                                      <div>
                                        <div style={{ fontWeight: '600' }}>
                                          {avaliacao.colaborador?.nome || 'Avaliador'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                          {avaliacao.colaborador?.cargo || ''}
                                        </div>
                                      </div>
                                    </div>
                                    <button
                                      className="action-button"
                                      onClick={() => setComentariosExpandidos(prev => ({
                                        ...prev,
                                        [`gestor-${avaliacao.id}`]: !prev[`gestor-${avaliacao.id}`]
                                      }))}
                                      style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto' }}
                                    >
                                      {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                                    </button>
                                  </div>

                                  {isExpanded && (
                                    <div style={{ padding: '20px' }}>
                                      {/* Respostas Fechadas (Escala 1-5) */}
                                      {respostasFechadas.length > 0 && (
                                        <div style={{ marginBottom: '24px' }}>
                                          <h5 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                                            Perguntas de Escala (1-5)
                                          </h5>
                                          <div style={{ display: 'grid', gap: '12px' }}>
                                            {respostasFechadas.map((resposta, idx) => (
                                              <div
                                                key={idx}
                                                style={{
                                                  padding: '12px',
                                                  background: '#fafafa',
                                                  borderRadius: '6px',
                                                  border: '1px solid #e0e0e0'
                                                }}
                                              >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                                  <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '8px' }}>
                                                      {resposta.pergunta_codigo?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Pergunta ${idx + 1}`}
                                                    </div>
                                                    {resposta.justificativa && (
                                                      <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                                                        "{resposta.justificativa}"
                                                      </div>
                                                    )}
                                                  </div>
                                                  <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: resposta.resposta_escala >= 4 ? '#e8f5e9' : resposta.resposta_escala <= 2 ? '#ffebee' : '#fff3e0',
                                                    color: resposta.resposta_escala >= 4 ? '#2e7d32' : resposta.resposta_escala <= 2 ? '#c62828' : '#e65100',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    flexShrink: 0
                                                  }}>
                                                    {resposta.resposta_escala}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Respostas Abertas */}
                                      {respostasAbertas.length > 0 && (
                                        <div>
                                          <h5 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                                            Perguntas Abertas
                                          </h5>
                                          <div style={{ display: 'grid', gap: '12px' }}>
                                            {respostasAbertas.map((resposta, idx) => (
                                              <div
                                                key={idx}
                                                style={{
                                                  padding: '12px',
                                                  background: '#fafafa',
                                                  borderRadius: '6px',
                                                  border: '1px solid #e0e0e0'
                                                }}
                                              >
                                                <div style={{ fontSize: '0.85rem', color: '#7b1fa2', marginBottom: '8px', fontWeight: '500' }}>
                                                  {resposta.pergunta_codigo?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Pergunta ${idx + 1}`}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '1.6' }}>
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
                            {avaliacoesGestorCalibracao.filter(av => av.colaborador_id === av.gestor_id).length > 0 && (
                              <div style={{ marginTop: '30px' }}>
                                <h4 style={{ marginBottom: '16px', color: '#1976d2' }}>
                                  📝 Autoavaliação de Gestor
                                </h4>
                                {avaliacoesGestorCalibracao.filter(av => av.colaborador_id === av.gestor_id).map((avaliacao) => {
                                  const respostasFechadas = avaliacao.respostas?.filter(r => r.resposta_escala !== null) || []
                                  const respostasAbertas = avaliacao.respostas?.filter(r => r.resposta_texto !== null) || []
                                  const isExpanded = comentariosExpandidos[`auto-gestor-${avaliacao.id}`] || false

                                  return (
                                    <div
                                      key={avaliacao.id}
                                      style={{
                                        background: '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '8px',
                                        marginBottom: '16px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <div
                                        style={{
                                          padding: '16px',
                                          background: '#e3f2fd',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                        }}
                                      >
                                        <div style={{ fontWeight: '600' }}>
                                          Autoavaliação como Gestor
                                        </div>
                                        <button
                                          className="action-button"
                                          onClick={() => setComentariosExpandidos(prev => ({
                                            ...prev,
                                            [`auto-gestor-${avaliacao.id}`]: !prev[`auto-gestor-${avaliacao.id}`]
                                          }))}
                                          style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto' }}
                                        >
                                          {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                                        </button>
                                      </div>

                                      {isExpanded && (
                                        <div style={{ padding: '20px' }}>
                                          {/* Respostas Fechadas */}
                                          {respostasFechadas.length > 0 && (
                                            <div style={{ marginBottom: '24px' }}>
                                              <h5 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                                                Perguntas de Escala (1-5)
                                              </h5>
                                              <div style={{ display: 'grid', gap: '12px' }}>
                                                {respostasFechadas.map((resposta, idx) => (
                                                  <div
                                                    key={idx}
                                                    style={{
                                                      padding: '12px',
                                                      background: '#fafafa',
                                                      borderRadius: '6px',
                                                      border: '1px solid #e0e0e0'
                                                    }}
                                                  >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                                      <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '8px' }}>
                                                          {resposta.pergunta_codigo?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Pergunta ${idx + 1}`}
                                                        </div>
                                                        {resposta.justificativa && (
                                                          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                                                            "{resposta.justificativa}"
                                                          </div>
                                                        )}
                                                      </div>
                                                      <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        background: resposta.resposta_escala >= 4 ? '#e8f5e9' : resposta.resposta_escala <= 2 ? '#ffebee' : '#fff3e0',
                                                        color: resposta.resposta_escala >= 4 ? '#2e7d32' : resposta.resposta_escala <= 2 ? '#c62828' : '#e65100',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        flexShrink: 0
                                                      }}>
                                                        {resposta.resposta_escala}
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Respostas Abertas */}
                                          {respostasAbertas.length > 0 && (
                                            <div>
                                              <h5 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#333', fontWeight: '600' }}>
                                                Perguntas Abertas
                                              </h5>
                                              <div style={{ display: 'grid', gap: '12px' }}>
                                                {respostasAbertas.map((resposta, idx) => (
                                                  <div
                                                    key={idx}
                                                    style={{
                                                      padding: '12px',
                                                      background: '#fafafa',
                                                      borderRadius: '6px',
                                                      border: '1px solid #e0e0e0'
                                                    }}
                                                  >
                                                    <div style={{ fontSize: '0.85rem', color: '#1976d2', marginBottom: '8px', fontWeight: '500' }}>
                                                      {resposta.pergunta_codigo?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || `Pergunta ${idx + 1}`}
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '1.6' }}>
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
                )}
              </>
            )}

            {abaAtiva === 'acompanhamento' && (
              <>
                <div className="admin-panel-header">
                  <div>
                    <h2 className="panel-title">Acompanhamento do Ciclo</h2>
                    <p className="panel-subtitle">
                      {cicloAcompanhamento
                        ? `Acompanhe o progresso dos colaboradores no ciclo "${cicloAcompanhamento.nome}"`
                        : 'Selecione um ciclo para ver o acompanhamento'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="error-message" style={{
                    padding: '12px',
                    background: '#ffebee',
                    color: '#c62828',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    {error}
                  </div>
                )}

                {loadingAcompanhamento ? (
                  <div className="empty-state">
                    <div className="empty-icon">⏳</div>
                    <p className="empty-text">Carregando dados de acompanhamento...</p>
                  </div>
                ) : !cicloAcompanhamento ? (
                  <div className="empty-state">
                    <div className="empty-icon">📈</div>
                    <p className="empty-text">
                      Nenhum ciclo ativo encontrado.
                    </p>
                    <p className="empty-text" style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                      Crie um ciclo com status "Aberto" ou "Em Andamento" para ver o acompanhamento.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="admin-filtros" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        className="campo-input"
                        value={cicloAcompanhamento?.id || ''}
                        onChange={(e) => handleChangeCicloAcompanhamento(e.target.value)}
                        style={{ maxWidth: '300px' }}
                      >
                        {ciclos.filter(c => c.status === 'aberto' || c.status === 'em_andamento').map(ciclo => (
                          <option key={ciclo.id} value={ciclo.id}>
                            {ciclo.nome} ({getEtapaLabel(ciclo.etapa_atual)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="filtro-input"
                        placeholder="Buscar colaborador..."
                        value={filtroAcompanhamento}
                        onChange={(e) => setFiltroAcompanhamento(e.target.value)}
                        style={{ flex: 1, minWidth: '200px' }}
                      />
                    </div>

                    <div className="colaboradores-lista">
                      <h3 className="lista-title">
                        Colaboradores ({colaboradoresAcompanhamentoFiltrados.length})
                      </h3>

                      {colaboradoresAcompanhamentoFiltrados.length === 0 ? (
                        <div className="empty-state">
                          <div className="empty-icon">👥</div>
                          <p className="empty-text">
                            {filtroAcompanhamento
                              ? 'Nenhum colaborador encontrado com o filtro aplicado.'
                              : 'Nenhum colaborador encontrado.'}
                          </p>
                        </div>
                      ) : (
                        <div className="table-container" style={{ overflowX: 'auto' }}>
                          <table className="colaboradores-table" style={{ minWidth: '900px' }}>
                            <thead>
                              <tr>
                                <th style={{ minWidth: '200px' }}>Colaborador</th>
                                <th style={{ textAlign: 'center', minWidth: '120px' }}>Escolha de Pares</th>
                                <th style={{ textAlign: 'center', minWidth: '140px' }}>Avaliações de Pares</th>
                                <th style={{ textAlign: 'center', minWidth: '120px' }}>Autoavaliação</th>
                                <th style={{ textAlign: 'center', minWidth: '140px' }}>Avaliação do Gestor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {colaboradoresAcompanhamentoFiltrados.map((colab) => (
                                <tr key={colab.colaborador_id}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <Avatar
                                        avatar={colab.avatar}
                                        nome={colab.nome}
                                        size={40}
                                      />
                                      <div>
                                        <div className="colaborador-nome" style={{ fontSize: '0.95rem' }}>
                                          {colab.nome}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                          {colab.cargo || colab.departamento || '-'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      {colab.escolheu_pares ? (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 12px',
                                            background: '#e8f5e9',
                                            color: '#2e7d32',
                                            borderRadius: '16px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                          }}
                                        >
                                          ✓ Sim
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 12px',
                                            background: '#fff3e0',
                                            color: '#e65100',
                                            borderRadius: '16px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                          }}
                                        >
                                          {colab.qtd_pares_escolhidos}/4
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {colab.avaliacoes_pares_total > 0 ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '4px 12px',
                                          background: colab.avaliacoes_pares_realizadas >= colab.avaliacoes_pares_total
                                            ? '#e8f5e9'
                                            : '#e3f2fd',
                                          color: colab.avaliacoes_pares_realizadas >= colab.avaliacoes_pares_total
                                            ? '#2e7d32'
                                            : '#1976d2',
                                          borderRadius: '16px',
                                          fontSize: '0.9rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        {colab.avaliacoes_pares_realizadas}/{colab.avaliacoes_pares_total}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#999', fontSize: '0.85rem' }}>
                                        Nenhuma pendente
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {colab.fez_autoavaliacao ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '4px 12px',
                                          background: '#e8f5e9',
                                          color: '#2e7d32',
                                          borderRadius: '16px',
                                          fontSize: '0.85rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        ✓ Feita
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '4px 12px',
                                          background: '#fff3e0',
                                          color: '#e65100',
                                          borderRadius: '16px',
                                          fontSize: '0.85rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        Pendente
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {!colab.tem_gestor ? (
                                      <span style={{ color: '#999', fontSize: '0.85rem' }}>
                                        Sem gestor
                                      </span>
                                    ) : colab.fez_avaliacao_gestor ? (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '4px 12px',
                                          background: '#e8f5e9',
                                          color: '#2e7d32',
                                          borderRadius: '16px',
                                          fontSize: '0.85rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        ✓ Feita
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '4px 12px',
                                          background: '#fff3e0',
                                          color: '#e65100',
                                          borderRadius: '16px',
                                          fontSize: '0.85rem',
                                          fontWeight: '600'
                                        }}
                                      >
                                        Pendente
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Admin

