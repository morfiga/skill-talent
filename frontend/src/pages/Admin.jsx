import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import { ciclosAPI, ciclosAvaliacaoAPI, colaboradoresAPI } from '../services/api'
import './Admin.css'
import './Page.css'

function Admin({ onLogout }) {
  const navigate = useNavigate()
  const { colaborador, user } = useAuth()
  // Usar user.is_admin primeiro (vem mais rápido do authAPI.verify), depois colaborador.is_admin
  const isAdmin = user?.is_admin || colaborador?.is_admin || false
  const [abaAtiva, setAbaAtiva] = useState('colaboradores') // 'colaboradores', 'ciclos' ou 'aprovacao_pares'

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
      console.error('Erro ao carregar colaboradores:', err)
      setError('Erro ao carregar colaboradores. Tente novamente.')
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
      console.error('Erro ao carregar ciclos:', err)
      setError('Erro ao carregar ciclos. Tente novamente.')
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
      console.error('Erro ao carregar ciclo de aprovação:', err)
      setError('Erro ao carregar ciclo de aprovação. Tente novamente.')
    } finally {
      setLoadingAprovacao(false)
    }
  }

  const loadCiclosAvaliacaoLiderados = async (cicloId) => {
    try {
      const response = await ciclosAvaliacaoAPI.getLiderados(cicloId)
      setCiclosAvaliacaoLiderados(response.ciclos || [])
    } catch (err) {
      console.error('Erro ao carregar ciclos de avaliação dos liderados:', err)
      setError('Erro ao carregar ciclos de avaliação dos liderados.')
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

  // Handlers para Colaboradores
  const handleInputChangeColaborador = (campo, valor) => {
    setFormularioColaborador(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const handleSalvarColaborador = async () => {
    if (!formularioColaborador.nome.trim() || !formularioColaborador.email.trim()) {
      alert('Nome e email são obrigatórios')
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
        alert('Colaborador atualizado com sucesso!')
      } else {
        await colaboradoresAPI.create({
          nome: formularioColaborador.nome.trim(),
          email: formularioColaborador.email.trim(),
          cargo: formularioColaborador.cargo.trim() || null,
          departamento: formularioColaborador.departamento.trim() || null,
          avatar: formularioColaborador.avatar.trim() || null
        })
        alert('Colaborador criado com sucesso!')
      }
      handleCancelarColaborador()
      await loadColaboradores()
    } catch (err) {
      console.error('Erro ao salvar colaborador:', err)
      const errorMessage = err.message || 'Erro ao salvar colaborador. Tente novamente.'
      alert(errorMessage)
      setError(errorMessage)
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
        alert('Colaborador excluído com sucesso!')
        await loadColaboradores()
      } catch (err) {
        console.error('Erro ao excluir colaborador:', err)
        const errorMessage = err.message || 'Erro ao excluir colaborador. Tente novamente.'
        alert(errorMessage)
        setError(errorMessage)
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
      alert('Nome é obrigatório')
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
        alert('Ciclo atualizado com sucesso!')
      } else {
        await ciclosAPI.create(dataCiclo)
        alert('Ciclo criado com sucesso!')
      }
      handleCancelarCiclo()
      await loadCiclos()
    } catch (err) {
      console.error('Erro ao salvar ciclo:', err)
      const errorMessage = err.message || 'Erro ao salvar ciclo. Tente novamente.'
      alert(errorMessage)
      setError(errorMessage)
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
        alert('Ciclo excluído com sucesso!')
        await loadCiclos()
      } catch (err) {
        console.error('Erro ao excluir ciclo:', err)
        const errorMessage = err.message || 'Erro ao excluir ciclo. Tente novamente.'
        alert(errorMessage)
        setError(errorMessage)
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
      'feedback': 'Feedback'
    }
    return labels[etapa] || etapa
  }

  const getEtapaBadgeClass = (etapa) => {
    const classes = {
      'escolha_pares': 'status-badge etapa-escolha-pares',
      'aprovacao_pares': 'status-badge etapa-aprovacao-pares',
      'avaliacoes': 'status-badge etapa-avaliacoes',
      'feedback': 'status-badge etapa-feedback'
    }
    return classes[etapa] || 'status-badge'
  }

  const handleAvancarEtapa = async (cicloId) => {
    if (window.confirm('Tem certeza que deseja avançar a etapa deste ciclo?')) {
      try {
        setError(null)
        await ciclosAPI.avancarEtapa(cicloId)
        alert('Etapa avançada com sucesso!')
        await loadCiclos()
      } catch (err) {
        console.error('Erro ao avançar etapa:', err)
        const errorMessage = err.message || 'Erro ao avançar etapa. Tente novamente.'
        alert(errorMessage)
        setError(errorMessage)
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
      alert('É necessário selecionar exatamente 4 pares')
      return
    }

    try {
      setError(null)
      await ciclosAvaliacaoAPI.updateParesLiderado(lideradoEditando.id, {
        pares_ids: paresSelecionados
      })
      alert('Pares atualizados com sucesso!')
      handleCancelarPares()
      if (cicloAprovacao) {
        await loadCiclosAvaliacaoLiderados(cicloAprovacao.id)
      }
    } catch (err) {
      console.error('Erro ao salvar pares:', err)
      const errorMessage = err.message || 'Erro ao salvar pares. Tente novamente.'
      alert(errorMessage)
      setError(errorMessage)
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
                                      ⏭️
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
          </div>
        </div>
      </main>
    </div>
  )
}

export default Admin

