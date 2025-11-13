import { useEffect, useState } from 'react'
import { authAPI, colaboradoresAPI } from '../services/api'

export function useAuth() {
  const [colaboradorId, setColaboradorId] = useState(null)
  const [colaborador, setColaborador] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('access_token')
    const userId = localStorage.getItem('user_id')

    if (token && userId) {
      // Verificar se o token ainda é válido
      verifyAuth()
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

  const login = (tokenResponse) => {
    // Dados já foram salvos no localStorage pelo componente Login
    setIsAuthenticated(true)
    setUser({
      id: parseInt(localStorage.getItem('user_id')),
      email: localStorage.getItem('user_email'),
      name: localStorage.getItem('user_name'),
      picture: localStorage.getItem('user_picture'),
    })

    // Buscar colaborador pelo email
    const email = localStorage.getItem('user_email')
    if (email) {
      colaboradoresAPI.getAll({ email }).then(response => {
        if (response && response.colaboradores && response.colaboradores.length > 0) {
          const colaboradorData = response.colaboradores[0]
          setColaboradorId(colaboradorData.id)
          setColaborador(colaboradorData)
        }
      }).catch(error => {
        console.error('Erro ao buscar colaborador:', error)
      })
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_picture')
    setIsAuthenticated(false)
    setColaboradorId(null)
    setColaborador(null)
    setUser(null)
  }

  return {
    colaboradorId,
    colaborador,
    user,
    isAuthenticated,
    login,
    logout,
    setColaborador,
  }
}

