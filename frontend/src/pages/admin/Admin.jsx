import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

function Admin({ onLogout }) {
  const navigate = useNavigate()
  const { colaborador, user } = useAuth()
  const isAdmin = user?.is_admin || colaborador?.is_admin || false
  const [abaAtiva, setAbaAtiva] = useState('acompanhamento')

  // Redirecionar se não for admin
  if (user !== null && colaborador !== null && !isAdmin) {
    navigate('/dashboard')
    return null
  }

  // Ainda carregando
  if (user === null && colaborador === null) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <p className="empty-text">Carregando...</p>
        </div>
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
                onClick={() => setAbaAtiva('acompanhamento')}
              >
                📈 Acompanhamento
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_pares' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('aprovacao_pares')}
              >
                ✅ Aprovação de Pares
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_entregas' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('aprovacao_entregas')}
              >
                💎 Aprovação de Entregas de Valor
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'aprovacao_outstanding' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('aprovacao_outstanding')}
              >
                🚀 Aprovação de Outstanding
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'calibracao' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('calibracao')}
              >
                📋 Calibração
              </button>
              <button
                className={`admin-nav-item ${abaAtiva === 'feedbacks' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('feedbacks')}
              >
                💬 Feedbacks
              </button>
            </nav>

            <h3 className="sidebar-title">Cadastros</h3>
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
            </nav>
          </div>

          <div className="admin-panel">
            {abaAtiva === 'colaboradores' && <ColaboradoresAdmin />}
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

