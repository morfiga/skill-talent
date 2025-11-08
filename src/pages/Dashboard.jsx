import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

function Dashboard({ onLogout }) {
  const navigate = useNavigate()

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Skill Talent</h1>
        <button className="logout-button" onClick={onLogout}>
          Sair
        </button>
      </header>
      
      <main className="dashboard-main">
        <h2 className="dashboard-welcome">Bem-vindo ao sistema de avaliação</h2>
        
        <div className="options-grid">
          <div 
            className="option-card"
            onClick={() => navigate('/ciclo-avaliacao')}
          >
            <div className="option-icon">📊</div>
            <h3 className="option-title">Ciclo de avaliação</h3>
            <p className="option-description">Gerencie os ciclos de avaliação de desempenho</p>
          </div>

          <div 
            className="option-card"
            onClick={() => navigate('/entrega-outstanding')}
          >
            <div className="option-icon">⭐</div>
            <h3 className="option-title">Entrega outstanding</h3>
            <p className="option-description">Registre entregas excepcionais dos colaboradores</p>
          </div>

          <div 
            className="option-card"
            onClick={() => navigate('/registro-valor')}
          >
            <div className="option-icon">💎</div>
            <h3 className="option-title">Registro de valor</h3>
            <p className="option-description">Documente ações que agregam valor à organização</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard

