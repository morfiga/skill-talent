import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Componente que faz scroll para o topo da página
 * sempre que a rota muda
 */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default ScrollToTop

