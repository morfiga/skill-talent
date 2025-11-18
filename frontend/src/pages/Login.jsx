import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { authAPI } from '../services/api'
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

      // Salvar token JWT no localStorage
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user_id', response.user_id.toString())
      localStorage.setItem('user_email', response.email)
      localStorage.setItem('user_name', response.name)
      if (response.avatar) {
        localStorage.setItem('user_avatar', response.avatar)
      }

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

