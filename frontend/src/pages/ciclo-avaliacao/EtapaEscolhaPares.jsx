import { useEffect, useState } from 'react'
import { ciclosAvaliacaoAPI, colaboradoresAPI } from '../../services/api'
import '../CicloAvaliacao.css'

function EtapaEscolhaPares({ colaboradorId, cicloAberto, cicloAtivo, onParesSalvos, onVoltar }) {
  const [colaboradores, setColaboradores] = useState([])
  const [paresSelecionados, setParesSelecionados] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    loadColaboradores()
    loadParesSalvos()
  }, [cicloAtivo, cicloAberto])

  const loadParesSalvos = async () => {
    if (cicloAtivo?.pares_selecionados) {
      try {
        // Buscar os dados completos dos colaboradores
        const response = await colaboradoresAPI.getAll()
        const todosColaboradores = response.colaboradores || []

        const paresIds = cicloAtivo.pares_selecionados.map(ps => ps.par_id || ps.par?.id)
        const pares = todosColaboradores.filter(c => paresIds.includes(c.id))
        setParesSelecionados(pares)
      } catch (error) {
        console.error('Erro ao carregar pares salvos:', error)
        // Fallback: usar dados do cicloAtivo se disponível
        if (cicloAtivo.pares_selecionados) {
          const pares = cicloAtivo.pares_selecionados
            .filter(ps => ps.par)
            .map(ps => ps.par)
          setParesSelecionados(pares)
        }
      }
    }
  }

  const loadColaboradores = async () => {
    try {
      const response = await colaboradoresAPI.getAll()
      setColaboradores(response.colaboradores || [])
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelecao = (colaborador) => {
    setParesSelecionados(prev => {
      const jaSelecionado = prev.find(p => p.id === colaborador.id)

      if (jaSelecionado) {
        return prev.filter(p => p.id !== colaborador.id)
      } else {
        if (prev.length < 4) {
          return [...prev, colaborador]
        }
        return prev
      }
    })
  }

  const handleSalvar = async () => {
    if (paresSelecionados.length === 4 && cicloAberto) {
      try {
        setSalvando(true)
        const paresIds = paresSelecionados.map(p => p.id)
        let ciclo

        if (cicloAtivo) {
          // Ciclo já existe - atualizar os pares selecionados
          ciclo = await ciclosAvaliacaoAPI.update(cicloAtivo.id, {
            pares_ids: paresIds
          })
          alert('Pares selecionados atualizados com sucesso!')
          // Atualizar o ciclo ativo após salvar
          if (onParesSalvos) {
            onParesSalvos(ciclo)
          }
        } else {
          // Criar novo ciclo de avaliação
          ciclo = await ciclosAvaliacaoAPI.create({
            ciclo_id: cicloAberto.id,
            pares_ids: paresIds
          })
          alert('Pares selecionados salvos com sucesso!')
          // Atualizar o ciclo ativo após salvar
          if (onParesSalvos) {
            onParesSalvos(ciclo)
          }
        }
      } catch (error) {
        console.error('Erro ao salvar pares:', error)
        alert('Erro ao salvar pares selecionados. Tente novamente.')
      } finally {
        setSalvando(false)
      }
    } else if (!cicloAberto) {
      alert('Nenhum ciclo aberto encontrado. Entre em contato com o administrador.')
    } else if (paresSelecionados.length !== 4) {
      alert('É necessário selecionar exatamente 4 pares para salvar.')
    }
  }

  if (loading) {
    return <div>Carregando colaboradores...</div>
  }

  return (
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
        {onVoltar && (
          <button className="voltar-button" onClick={onVoltar}>
            ← Voltar
          </button>
        )}
        <button
          className={`continuar-button ${paresSelecionados.length === 4 ? 'enabled' : 'disabled'}`}
          onClick={handleSalvar}
          disabled={paresSelecionados.length !== 4 || salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  )
}

export default EtapaEscolhaPares

