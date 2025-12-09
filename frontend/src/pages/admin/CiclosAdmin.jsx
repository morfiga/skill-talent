import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { ciclosAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import FormularioCiclo from './components/FormularioCiclo'
import TabelaCiclos from './components/TabelaCiclos'

function CiclosAdmin() {
  const { success, error: showError, warning } = useToast()
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cicloEditando, setCicloEditando] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCiclos()
  }, [])

  const loadCiclos = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await ciclosAPI.getAll()
      setCiclos(response.ciclos || [])
    } catch (err) {
      const { message } = handleApiError(err, 'carregar ciclos', '/ciclos', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvar = async (formulario) => {
    if (!formulario.nome.trim()) {
      warning('Nome é obrigatório')
      return
    }

    try {
      setError(null)
      // Converter datas de string (YYYY-MM-DD) para ISO datetime
      const dataInicio = formulario.data_inicio
        ? new Date(formulario.data_inicio + 'T00:00:00').toISOString()
        : null
      const dataFim = formulario.data_fim
        ? new Date(formulario.data_fim + 'T23:59:59').toISOString()
        : null

      const dataCiclo = {
        nome: formulario.nome.trim(),
        status: formulario.status,
        etapa_atual: formulario.etapa_atual || 'escolha_pares',
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
      handleCancelar()
      await loadCiclos()
    } catch (err) {
      const { message } = handleApiError(err, 'salvar ciclo', '/ciclos', showError)
      setError(message)
    }
  }

  const handleEditar = (ciclo) => {
    setCicloEditando(ciclo)
    setMostrarFormulario(true)
  }

  const handleExcluir = async (id) => {
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

  const handleCancelar = () => {
    setCicloEditando(null)
    setMostrarFormulario(false)
    setError(null)
  }

  const ciclosFiltrados = ciclos.filter(ciclo =>
    ciclo.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    ciclo.status?.toLowerCase().includes(filtro.toLowerCase()) ||
    ciclo.etapa_atual?.toLowerCase().includes(filtro.toLowerCase())
  )

  return (
    <>
      <div className="admin-panel-header">
        <div>
          <h2 className="panel-title">Controle de Ciclos</h2>
          <p className="panel-subtitle">
            Gerencie os ciclos de avaliação do sistema
          </p>
        </div>
        {!mostrarFormulario && (
          <button
            className="adicionar-button"
            onClick={() => setMostrarFormulario(true)}
          >
            + Adicionar Ciclo
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <FormularioCiclo
          ciclo={cicloEditando}
          onSalvar={handleSalvar}
          onCancelar={handleCancelar}
        />
      )}

      <div className="admin-filtros">
        <input
          type="text"
          className="filtro-input"
          placeholder="Buscar por nome, status ou etapa..."
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
            <p className="empty-text">Carregando ciclos...</p>
          </div>
        ) : (
          <>
            <h3 className="lista-title">
              {ciclosFiltrados.length > 0
                ? `Ciclos (${ciclosFiltrados.length})`
                : 'Nenhum ciclo encontrado'}
            </h3>

            {ciclosFiltrados.length === 0 && !mostrarFormulario && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p className="empty-text">
                  {filtro ? 'Nenhum ciclo encontrado com o filtro aplicado.' : 'Nenhum ciclo cadastrado.'}
                </p>
              </div>
            )}

            <TabelaCiclos
              ciclos={ciclosFiltrados}
              onEditar={handleEditar}
              onExcluir={handleExcluir}
              onAvancarEtapa={handleAvancarEtapa}
            />
          </>
        )}
      </div>
    </>
  )
}

export default CiclosAdmin

