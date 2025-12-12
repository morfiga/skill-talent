import { useEffect, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { avaliacoesAPI, avaliacoesGestorAPI, ciclosAPI, colaboradoresAPI, eixosAvaliacaoAPI } from '../../services/api'
import DetalhesCalibracao from './components/DetalhesCalibracao'
import TabelaCalibracaoColaboradores from './components/TabelaCalibracaoColaboradores'
import TabelaCalibracaoGestores from './components/TabelaCalibracaoGestores'

function CalibracaoAdmin() {
  const { error: showError } = useToast()
  const [colaboradores, setColaboradores] = useState([])
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null)
  const [cicloCalibracao, setCicloCalibracao] = useState(null)
  const [avaliacoesCalibracao, setAvaliacoesCalibracao] = useState([])
  const [avaliacoesGestorCalibracao, setAvaliacoesGestorCalibracao] = useState([])
  const [loadingCalibracao, setLoadingCalibracao] = useState(false)
  const [colaboradoresInfo, setColaboradoresInfo] = useState({})
  const [eixosAvaliacao, setEixosAvaliacao] = useState([])
  const [perguntas, setPerguntas] = useState([])
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCicloCalibracao()
  }, [])

  const loadCicloCalibracao = async () => {
    try {
      setError(null)
      // Carregar colaboradores primeiro
      await loadColaboradores()

      await loadPerguntas()

      // Buscar ciclo na etapa de calibração
      const response = await ciclosAPI.getAll()
      const ciclosCalibracao = (response.ciclos || []).filter(c => c.etapa_atual === 'calibracao')

      if (ciclosCalibracao.length > 0) {
        const ciclo = ciclosCalibracao[0]
        setCicloCalibracao(ciclo)
      } else {
        setCicloCalibracao(null)
        setColaboradoresInfo({})
      }
    } catch (err) {
      console.error('Erro ao carregar ciclo de calibração:', err)
      setError('Erro ao carregar ciclo de calibração. Tente novamente.')
    }
  }

  const loadPerguntas = async () => {
    try {
      const response = await avaliacoesGestorAPI.getPerguntas()

      console.log('response', response)
      setPerguntas(response)
    } catch (err) {
      console.error('Erro ao carregar perguntas:', err)
    }
  }

  const loadColaboradores = async () => {
    try {
      const response = await colaboradoresAPI.getAll()
      const listaColaboradores = response.colaboradores || []
      setColaboradores(listaColaboradores)

      // Carregar informações de calibração para todos
      const ciclosResponse = await ciclosAPI.getAll()
      const ciclosCalibracao = ciclosResponse.ciclos?.filter(c => c.etapa_atual === 'calibracao') || []

      if (ciclosCalibracao.length > 0) {
        await loadColaboradoresInfo(ciclosCalibracao[0].id, listaColaboradores)
      }
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err)
    }
  }

  const loadColaboradoresInfo = async (cicloId, listaColaboradores) => {
    try {
      const info = {}

      const promises = listaColaboradores.map(async (colaborador) => {
        try {
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
          const todasAvaliacoesGestor = avaliacoesGestorRecebidasResponse.avaliacoes || []
          const avaliacoesGestorRecebidas = todasAvaliacoesGestor.filter(av => av.colaborador_id !== av.gestor_id)
          const qtdAvaliacoesGestorRecebidas = avaliacoesGestorRecebidas.length
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

      results.forEach(result => {
        info[result.colaboradorId] = {
          temAutoavaliacao: result.temAutoavaliacao,
          qtdAvaliacoes: result.qtdAvaliacoes,
          qtdAvaliacoesGestorRecebidas: result.qtdAvaliacoesGestorRecebidas,
          temAutoavaliacaoGestor: result.temAutoavaliacaoGestor
        }
      })

      setColaboradoresInfo(info)
    } catch (err) {
      console.error('Erro ao carregar informações dos colaboradores:', err)
    }
  }

  const handleSelecionarColaborador = async (colaborador) => {
    try {
      setLoadingCalibracao(true)
      setColaboradorSelecionado(colaborador)
      setError(null)

      // Carregar eixos se necessário
      if (eixosAvaliacao.length === 0) {
        try {
          const eixosResponse = await eixosAvaliacaoAPI.getAll()
          setEixosAvaliacao(eixosResponse.eixos || [])
        } catch (err) {
          console.error('Erro ao carregar eixos:', err)
        }
      }

      const cicloId = cicloCalibracao?.id || null

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

  const handleVoltar = () => {
    setColaboradorSelecionado(null)
    setAvaliacoesCalibracao([])
    setAvaliacoesGestorCalibracao([])
  }

  const colaboradoresFiltrados = colaboradores.filter(col =>
    col.nome?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.email?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.cargo?.toLowerCase().includes(filtro.toLowerCase()) ||
    col.departamento?.toLowerCase().includes(filtro.toLowerCase())
  )

  // Separar gestores e colaboradores
  const gestoresIds = new Set(colaboradores.map(c => c.gestor_id).filter(Boolean))
  const gestoresFiltrados = colaboradoresFiltrados.filter(c => gestoresIds.has(c.id))
  const colaboradoresSemGestorFiltrados = colaboradoresFiltrados.filter(c => !gestoresIds.has(c.id))

  return (
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
      ) : !colaboradorSelecionado ? (
        <div>
          <div className="admin-filtros">
            <input
              type="text"
              className="filtro-input"
              placeholder="Buscar colaborador por nome, email, cargo ou departamento..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>

          <div className="colaboradores-lista">
            <h3 className="lista-title" style={{ marginTop: '20px' }}>
              👔 Gestores ({gestoresFiltrados.length})
            </h3>

            {gestoresFiltrados.length === 0 ? (
              <div className="empty-state" style={{ marginBottom: '30px' }}>
                <p className="empty-text">
                  {filtro ? 'Nenhum gestor encontrado com o filtro aplicado.' : 'Nenhum gestor encontrado.'}
                </p>
              </div>
            ) : (
              <TabelaCalibracaoGestores
                gestores={gestoresFiltrados}
                colaboradoresInfo={colaboradoresInfo}
                onVerDetalhes={handleSelecionarColaborador}
              />
            )}

            <h3 className="lista-title">
              👥 Colaboradores ({colaboradoresSemGestorFiltrados.length})
            </h3>

            {colaboradoresSemGestorFiltrados.length === 0 ? (
              <div className="empty-state">
                <p className="empty-text">
                  {filtro ? 'Nenhum colaborador encontrado com o filtro aplicado.' : 'Nenhum colaborador encontrado.'}
                </p>
              </div>
            ) : (
              <TabelaCalibracaoColaboradores
                colaboradores={colaboradoresSemGestorFiltrados}
                colaboradoresInfo={colaboradoresInfo}
                onVerDetalhes={handleSelecionarColaborador}
              />
            )}
          </div>
        </div>
      ) : (
        <DetalhesCalibracao
          colaborador={colaboradorSelecionado}
          avaliacoes={avaliacoesCalibracao}
          avaliacoesGestor={avaliacoesGestorCalibracao}
          eixosAvaliacao={eixosAvaliacao}
          perguntas={perguntas}
          onVoltar={handleVoltar}
          loading={loadingCalibracao}
        />
      )}
    </>
  )
}

export default CalibracaoAdmin

