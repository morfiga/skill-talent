import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { authAPI } from '../services/api'
import { saveSession } from '../utils/storage'
import './Login.css'

function Login({ onLogin }) {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError(null)
    try {
      // Enviar o ID token do Google para o backend
      const response = await authAPI.googleLogin(credentialResponse.credential)

      // Salvar dados de sessão no localStorage
      saveSession({
        access_token: response.access_token,
        user_id: response.user_id,
        email: response.email,
        name: response.name,
        avatar: response.avatar,
      })

      // Chamar callback de login
      onLogin(response)
    } catch (err) {
      console.error('Erro no login:', err)
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Erro ao autenticar com Google. Tente novamente.')
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Skill Talent</h1>
        <p className="login-subtitle">Avaliação de Desempenho</p>
        {error && <p className="login-error">{error}</p>}
        <div className="google-login-wrapper">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap={false}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
            logo_alignment="left"
          />
        </div>
      </div>
    </div>
  )
}

export default Login

