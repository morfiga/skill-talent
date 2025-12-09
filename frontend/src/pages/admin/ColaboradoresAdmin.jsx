import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { colaboradoresAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import FormularioColaborador from './components/FormularioColaborador'
import TabelaColaboradores from './components/TabelaColaboradores'

function ColaboradoresAdmin() {
  const { success, error: showError, warning } = useToast()
  const [colaboradores, setColaboradores] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [colaboradorEditando, setColaboradorEditando] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadColaboradores()
  }, [])

  const loadColaboradores = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await colaboradoresAPI.getAll()
      setColaboradores(response.colaboradores || [])
    } catch (err) {
      const { message } = handleApiError(err, 'carregar colaboradores', '/colaboradores', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async (formulario) => {
    if (!formulario.nome.trim() || !formulario.email.trim()) {
      warning('Nome e email são obrigatórios')
      return
    }

    try {
      setError(null)
      if (colaboradorEditando) {
        await colaboradoresAPI.update(colaboradorEditando.id, {
          nome: formulario.nome.trim(),
          email: formulario.email.trim(),
          cargo: formulario.cargo.trim() || null,
          departamento: formulario.departamento.trim() || null,
          avatar: formulario.avatar.trim() || null,
          is_admin: formulario.is_admin || false
        })
        success('Colaborador atualizado com sucesso!')
      } else {
        await colaboradoresAPI.create({
          nome: formulario.nome.trim(),
          email: formulario.email.trim(),
          cargo: formulario.cargo.trim() || null,
          departamento: formulario.departamento.trim() || null,
          avatar: formulario.avatar.trim() || null
        })
        success('Colaborador criado com sucesso!')
      }
      handleCancelar()
      await loadColaboradores()
    } catch (err) {
      const { message } = handleApiError(err, 'salvar colaborador', '/colaboradores', showError)
      setError(message)
    }
  }

  const handleEditar = (colaborador) => {
    setColaboradorEditando(colaborador)
    setMostrarFormulario(true)
  }

  const handleExcluir = async (id) => {
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

  const handleCancelar = () => {
    setColaboradorEditando(null)
    setMostrarFormulario(false)
    setError(null)
  }

  const colaboradoresFiltrados = colaboradores.filter(col =>
    col.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.email?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.cargo?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.departamento?.toLowerCase().includes(filtro.toLowerCase())
  )

  const departamentos = [...new Set(colaboradores.map(col => col.departamento).filter(Boolean))].sort()

  return (
    <>
      <div className="admin-panel-header">
        <div>
          <h2 className="panel-title">Controle de Colaboradores</h2>
          <p className="panel-subtitle">
            Gerencie os colaboradores do sistema
          </p>
        </div>
        {!mostrarFormulario && (
          <button
            className="adicionar-button"
            onClick={() => setMostrarFormulario(true)}
          >
            + Adicionar Colaborador
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <FormularioColaborador
          colaborador={colaboradorEditando}
          onSalvar={handleSalvar}
          onCancelar={handleCancelar}
          departamentos={departamentos}
        />
      )}

      <div className="admin-filtros">
        <input
          type="text"
          className="filtro-input"
          placeholder="Buscar por nome, email, cargo ou departamento..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
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

        {loading ? (
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

            {colaboradoresFiltrados.length === 0 && !mostrarFormulario && (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p className="empty-text">
                  {filtro ? 'Nenhum colaborador encontrado com o filtro aplicado.' : 'Nenhum colaborador cadastrado.'}
                </p>
              </div>
            )}

            <TabelaColaboradores
              colaboradores={colaboradoresFiltrados}
              onEditar={handleEditar}
              onExcluir={handleExcluir}
            />
          </>
        )}
      </div>
    </>
  )
}

export default ColaboradoresAdmin

