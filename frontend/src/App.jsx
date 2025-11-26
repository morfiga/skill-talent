import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Admin from './pages/Admin'
import CicloAvaliacao from './pages/ciclo-avaliacao/CicloAvaliacao'
import Dashboard from './pages/Dashboard'
import EntregaOutstanding from './pages/EntregaOutstanding'
import Login from './pages/Login'
import RegistroValor from './pages/RegistroValor'

function App() {
  const { isAuthenticated, login, logout, colaborador, user } = useAuth()

  const handleLogin = (tokenResponse) => {
    login(tokenResponse)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ciclo-avaliacao"
          element={
            isAuthenticated ? (
              <Navigate to="/ciclo-avaliacao/1" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ciclo-avaliacao/:etapa"
          element={
            isAuthenticated ? (
              <CicloAvaliacao onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/ciclo-avaliacao/3/par"
          element={
            isAuthenticated ? (
              <CicloAvaliacao onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/entrega-outstanding"
          element={
            isAuthenticated ? (
              <EntregaOutstanding onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/registro-valor"
          element={
            isAuthenticated ? (
              <RegistroValor onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isAuthenticated && (user?.is_admin || colaborador?.is_admin) ? (
              <Admin onLogout={handleLogout} />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  )
}

export default App

