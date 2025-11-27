import { createContext, useContext, useEffect, useState } from 'react'
import { authAPI, colaboradoresAPI } from '../services/api'
import { clearSession, getAuthToken, getUserId, STORAGE_KEYS } from '../utils/storage'

const AuthContext = createContext(null)

function useProvideAuth() {
  const [colaboradorId, setColaboradorId] = useState(null)
  const [colaborador, setColaborador] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = getAuthToken()
    const userId = getUserId()

    if (token && userId) {
      // Verificar se o token ainda é válido
      verifyAuth()
    } else {
      setIsLoadingAuth(false)
    }
  }, [])

  const verifyAuth = async () => {
    try {
      const userData = await authAPI.verify()
      setUser(userData)
      setIsAuthenticated(true)

      // Buscar colaborador pelo email
      const response = await colaboradoresAPI.getAll({ email: userData.email })
      if (response && response.colaboradores && response.colaboradores.length > 0) {
        const colaboradorData = response.colaboradores[0]
        setColaboradorId(colaboradorData.id)
        setColaborador(colaboradorData)
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      // Token inválido, limpar dados
      logout()
    } finally {
      setIsLoadingAuth(false)
    }
  }

  useEffect(() => {
    // Carregar dados do colaborador quando o ID for definido
    if (colaboradorId && !colaborador) {
      loadColaborador()
    }
  }, [colaboradorId])

  const loadColaborador = async () => {
    try {
      const colaboradorData = await colaboradoresAPI.getById(colaboradorId)
      setColaborador(colaboradorData)
    } catch (error) {
      console.error('Erro ao carregar colaborador:', error)
    }
  }

  const login = () => {
    // Dados já foram salvos no localStorage pelo componente Login
    setIsAuthenticated(true)
    setUser({
      id: parseInt(localStorage.getItem(STORAGE_KEYS.USER_ID)),
      email: localStorage.getItem(STORAGE_KEYS.USER_EMAIL),
      name: localStorage.getItem(STORAGE_KEYS.USER_NAME),
      picture: localStorage.getItem(STORAGE_KEYS.USER_AVATAR),
    })

    // Buscar colaborador pelo email
    const email = localStorage.getItem(STORAGE_KEYS.USER_EMAIL)
    if (email) {
      colaboradoresAPI
        .getAll({ email })
        .then((response) => {
          if (response && response.colaboradores && response.colaboradores.length > 0) {
            const colaboradorData = response.colaboradores[0]
            setColaboradorId(colaboradorData.id)
            setColaborador(colaboradorData)
          }
        })
        .catch((error) => {
          console.error('Erro ao buscar colaborador:', error)
        })
    }
  }

  const logout = () => {
    clearSession()
    setIsAuthenticated(false)
    setColaboradorId(null)
    setColaborador(null)
    setUser(null)
    setIsLoadingAuth(false)
  }

  return {
    colaboradorId,
    colaborador,
    user,
    isAuthenticated,
    isLoadingAuth,
    login,
    logout,
    setColaborador,
  }
}

export function AuthProvider({ children }) {
  const auth = useProvideAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

