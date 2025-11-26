import { useEffect, useState } from 'react'
import Avatar from '../../components/Avatar'
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

  // Verificar se está na etapa de aprovação de pares
  const isAprovacaoPares = cicloAberto?.etapa_atual === 'aprovacao_pares'

  const toggleSelecao = (colaborador) => {
    // Bloquear alteração durante aprovação de pares
    if (isAprovacaoPares) {
      alert('Não é possível alterar os pares durante a etapa de aprovação de pares. Aguarde a aprovação do gestor.')
      return
    }

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
    // Bloquear salvamento durante aprovação de pares
    if (isAprovacaoPares) {
      alert('Não é possível alterar os pares durante a etapa de aprovação de pares. Aguarde a aprovação do gestor.')
      return
    }

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
        const errorMessage = error.response?.data?.detail || error.message || 'Erro ao salvar pares selecionados. Tente novamente.'
        alert(errorMessage)
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
          {isAprovacaoPares 
            ? 'Os pares estão aguardando aprovação do gestor. Não é possível alterá-los neste momento.'
            : 'Selecione 4 colaboradores para avaliar seu desempenho'}
        </p>
        {isAprovacaoPares && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '4px', 
            marginTop: '10px',
            color: '#856404'
          }}>
            ⚠️ Os pares selecionados estão aguardando aprovação do gestor. Você não pode alterá-los durante esta etapa.
          </div>
        )}
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
                <Avatar
                  avatar={colaborador.avatar}
                  nome={colaborador.nome}
                  size={60}
                  className="selecionado-avatar"
                />
                <div className="selecionado-info">
                  <p className="selecionado-nome">{colaborador.nome}</p>
                  <p className="selecionado-cargo">{colaborador.cargo}</p>
                </div>
                {!isAprovacaoPares && (
                  <button
                    className="remover-button"
                    onClick={() => toggleSelecao(colaborador)}
                    title="Remover"
                  >
                    ×
                  </button>
                )}
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
                className={`colaborador-card ${isSelecionado ? 'selecionado' : ''} ${isMaximo || isAprovacaoPares ? 'disabled' : ''}`}
                onClick={() => !isMaximo && !isAprovacaoPares && toggleSelecao(colaborador)}
                style={isAprovacaoPares ? { cursor: 'not-allowed', opacity: 0.6 } : {}}
              >
                <Avatar
                  avatar={colaborador.avatar}
                  nome={colaborador.nome}
                  size={60}
                  className="colaborador-avatar"
                />
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
          className={`continuar-button ${paresSelecionados.length === 4 && !isAprovacaoPares ? 'enabled' : 'disabled'}`}
          onClick={handleSalvar}
          disabled={paresSelecionados.length !== 4 || salvando || isAprovacaoPares}
        >
          {salvando ? 'Salvando...' : isAprovacaoPares ? 'Aguardando Aprovação' : 'Salvar'}
        </button>
      </div>
    </>
  )
}

export default EtapaEscolhaPares

