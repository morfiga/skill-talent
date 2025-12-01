import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import PrivateRoute from './components/PrivateRoute'
import { useAuth } from './hooks/useAuth'
import Admin from './pages/Admin'
import CicloAvaliacaoGestor from './pages/ciclo-avaliacao-gestor/CicloAvaliacaoGestor'
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
            <PrivateRoute>
              <Dashboard onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/ciclo-avaliacao"
          element={
            <PrivateRoute>
              <Navigate to="/ciclo-avaliacao/1" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/ciclo-avaliacao/:etapa"
          element={
            <PrivateRoute>
              <CicloAvaliacao onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/ciclo-avaliacao-gestor"
          element={
            <PrivateRoute>
              <Navigate to="/ciclo-avaliacao-gestor/1" replace />
            </PrivateRoute>
          }
        />
        <Route
          path="/ciclo-avaliacao-gestor/2/liderado"
          element={
            <PrivateRoute>
              <CicloAvaliacaoGestor onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/ciclo-avaliacao-gestor/:etapa"
          element={
            <PrivateRoute>
              <CicloAvaliacaoGestor onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/entrega-outstanding"
          element={
            <PrivateRoute>
              <EntregaOutstanding onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/registro-valor"
          element={
            <PrivateRoute>
              <RegistroValor onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin onLogout={handleLogout} />
            </AdminRoute>
          }
        />
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
    </Router>
  )
}

export default App

