import { useEffect, useMemo, useState } from 'react'
import Avatar from '../../components/Avatar'
import Carregando from '../../components/Carregando'
import EstadoVazio from '../../components/EstadoVazio'
import MensagemErro from '../../components/MensagemErro'
import { PERFIL_COLABORADOR, PERFIL_GESTOR, PERFIL_LIDER, getPerfilLabel } from '../../constants/perfis'
import { useToast } from '../../contexts/ToastContext'
import { colaboradoresAPI } from '../../services/api'
import { handleApiError } from '../../utils/errorHandler'
import './Organograma.css'

// Ordena por perfil (gestor -> líder -> colaborador) e depois por nome
const ORDEM_PERFIL = { [PERFIL_GESTOR]: 0, [PERFIL_LIDER]: 1, [PERFIL_COLABORADOR]: 2 }

function ordenar(a, b) {
  const pa = ORDEM_PERFIL[a.perfil] ?? 3
  const pb = ORDEM_PERFIL[b.perfil] ?? 3
  if (pa !== pb) return pa - pb
  return (a.nome || '').localeCompare(b.nome || '')
}

function classePerfil(perfil) {
  if (perfil === PERFIL_GESTOR) return 'gestor'
  if (perfil === PERFIL_LIDER) return 'lider'
  return 'colaborador'
}

// Nó recursivo da árvore. `ancestrais` evita loops caso a hierarquia tenha ciclos.
function NoOrganograma({ colaborador, filhosPorGestor, ancestrais }) {
  const filhos = (filhosPorGestor.get(colaborador.id) || []).filter(
    (f) => !ancestrais.has(f.id)
  )
  const variante = classePerfil(colaborador.perfil)

  return (
    <li>
      <div className={`org-node org-node--${variante}`}>
        <Avatar avatar={colaborador.avatar} nome={colaborador.nome} size={52} />
        <p className="org-node-nome">{colaborador.nome}</p>
        {colaborador.cargo && <p className="org-node-cargo">{colaborador.cargo}</p>}
        <span className={`org-badge org-badge--${variante}`}>
          {getPerfilLabel(colaborador.perfil) || 'Colaborador'}
        </span>
      </div>
      {filhos.length > 0 && (
        <ul>
          {filhos.map((filho) => (
            <NoOrganograma
              key={filho.id}
              colaborador={filho}
              filhosPorGestor={filhosPorGestor}
              ancestrais={new Set([...ancestrais, colaborador.id])}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function OrganogramaAdmin() {
  const { error: showError } = useToast()
  const [colaboradores, setColaboradores] = useState([])
  const [loading, setLoading] = useState(true)
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
      const { message } = handleApiError(err, 'carregar organograma', '/colaboradores', showError)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Monta a hierarquia: raízes (topo ou sem gestor no conjunto) e filhos por gestor.
  const { raizes, filhosPorGestor } = useMemo(() => {
    const porId = new Map(colaboradores.map((c) => [c.id, c]))
    const filhos = new Map()
    const topo = []

    for (const c of colaboradores) {
      const gestorId = c.gestor_id
      if (gestorId != null && porId.has(gestorId)) {
        if (!filhos.has(gestorId)) filhos.set(gestorId, [])
        filhos.get(gestorId).push(c)
      } else {
        topo.push(c)
      }
    }

    filhos.forEach((lista) => lista.sort(ordenar))
    topo.sort(ordenar)

    return { raizes: topo, filhosPorGestor: filhos }
  }, [colaboradores])

  return (
    <>
      <div className="admin-panel-header">
        <div>
          <h2 className="panel-title">Organograma</h2>
          <p className="panel-subtitle">
            Hierarquia de todos os colaboradores (gestor → líder → liderados)
          </p>
        </div>
      </div>

      <div className="organograma-legenda">
        <span className="organograma-legenda-item">
          <span className="organograma-legenda-cor" style={{ background: 'var(--perfil-gestor)' }} />
          Gestor
        </span>
        <span className="organograma-legenda-item">
          <span className="organograma-legenda-cor" style={{ background: 'var(--perfil-lider)' }} />
          Líder
        </span>
        <span className="organograma-legenda-item">
          <span className="organograma-legenda-cor" style={{ background: 'var(--perfil-colaborador)' }} />
          Colaborador
        </span>
        <span className="organograma-legenda-item" style={{ marginLeft: 'auto' }}>
          {colaboradores.length} colaboradores
        </span>
      </div>

      <MensagemErro mensagem={error} />

      {loading ? (
        <Carregando texto="Carregando organograma..." />
      ) : raizes.length === 0 ? (
        <EstadoVazio icone="🗂️" texto="Nenhum colaborador cadastrado." />
      ) : (
        <div className="organograma-scroll">
          <div className="org-tree">
            <ul>
              {raizes.map((raiz) => (
                <NoOrganograma
                  key={raiz.id}
                  colaborador={raiz}
                  filhosPorGestor={filhosPorGestor}
                  ancestrais={new Set()}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

export default OrganogramaAdmin
