import { useNavigate, useParams } from 'react-router-dom'
import Carregando from '../../components/Carregando'
import { useAuth } from '../../hooks/useAuth'
import AcompanhamentoAdmin from './AcompanhamentoAdmin'
import './Admin.css'
import AprovacaoEntregasAdmin from './AprovacaoEntregasAdmin'
import AprovacaoEntregasOutstandingAdmin from './AprovacaoEntregasOutstandingAdmin'
import AprovacaoParesAdmin from './AprovacaoParesAdmin'
import CalibracaoAdmin from './CalibracaoAdmin'
import CiclosAdmin from './CiclosAdmin'
import ColaboradoresAdmin from './ColaboradoresAdmin'
import FeedbackAdmin from './FeedbackAdmin'
import OrganogramaAdmin from './OrganogramaAdmin'

const SECOES = [
  'acompanhamento',
  'aprovacao_pares',
  'aprovacao_entregas',
  'aprovacao_outstanding',
  'calibracao',
  'feedbacks',
  'colaboradores',
  'organograma',
  'ciclos',
]

function Admin({ onLogout }) {
  const navigate = useNavigate()
  const { secao } = useParams()
  const { colaborador, user } = useAuth()
  const isAdmin = user?.is_admin || colaborador?.is_admin || false
  const abaAtiva = SECOES.includes(secao) ? secao : 'acompanhamento'
  const irParaSecao = (novaSecao) => navigate(`/admin/${novaSecao}`)

  // Redirecionar se não for admin
  if (user !== null && colaborador !== null && !isAdmin) {
    navigate('/dashboard')
    return null
  }

  // Ainda carregando
  if (user === null && colaborador === null) {
    return (
      <div className="page-container">
        <Carregando />
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
                className={`admin-nav-item ${abaAtiva === 'acompanhamento' ? 'active' : ''}`}
                onClick={() => irParaSecao('acompanhamento')}
              >
                📈 Acompanhamento
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_pares' ? 'active' : ''}`}
                onClick={() => irParaSecao('aprovacao_pares')}
              >
                ✅ Aprovação de Pares
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_entregas' ? 'active' : ''}`}
                onClick={() => irParaSecao('aprovacao_entregas')}
              >
                💎 Aprovação de Entregas de Valor
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_outstanding' ? 'active' : ''}`}
                onClick={() => irParaSecao('aprovacao_outstanding')}
              >
                🚀 Aprovação de Outstanding
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'calibracao' ? 'active' : ''}`}
                onClick={() => irParaSecao('calibracao')}
              >
                📋 Calibração
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'feedbacks' ? 'active' : ''}`}
                onClick={() => irParaSecao('feedbacks')}
              >
                💬 Feedbacks
              </button>
            </nav>

            <h3 className="sidebar-title">Cadastros</h3>
            <nav className="admin-nav">
              <button
                className={`admin-nav-item ${abaAtiva === 'colaboradores' ? 'active' : ''}`}
                onClick={() => irParaSecao('colaboradores')}
              >
                👥 Colaboradores
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'organograma' ? 'active' : ''}`}
                onClick={() => irParaSecao('organograma')}
              >
                🌳 Organograma
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'ciclos' ? 'active' : ''}`}
                onClick={() => irParaSecao('ciclos')}
              >
                📊 Ciclos
              </button>
            </nav>
          </div>

          <div className="admin-panel">
            {abaAtiva === 'colaboradores' && <ColaboradoresAdmin />}
            {abaAtiva === 'organograma' && <OrganogramaAdmin />}
            {abaAtiva === 'ciclos' && <CiclosAdmin />}
            {abaAtiva === 'aprovacao_pares' && <AprovacaoParesAdmin />}
            {abaAtiva === 'aprovacao_entregas' && <AprovacaoEntregasAdmin />}
            {abaAtiva === 'aprovacao_outstanding' && <AprovacaoEntregasOutstandingAdmin />}
            {abaAtiva === 'calibracao' && <CalibracaoAdmin />}
            {abaAtiva === 'acompanhamento' && <AcompanhamentoAdmin />}
            {abaAtiva === 'feedbacks' && <FeedbackAdmin />}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Admin

