// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Função auxiliar para obter token de autenticação
function getAuthToken() {
  return localStorage.getItem('access_token')
}

// Função auxiliar para fazer requisições
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getAuthToken()

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      // Se for erro 401, limpar token e redirecionar para login
      if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('user_email')
        localStorage.removeItem('user_name')
        localStorage.removeItem('user_picture')
        window.location.href = '/login'
      }

      const error = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(error.detail || `HTTP error! status: ${response.status}`)
    }

    // Se a resposta estiver vazia (204), retornar null
    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error)
    throw error
  }
}

// API de Autenticação
export const authAPI = {
  googleLogin: (googleToken) => request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: googleToken }),
  }),
  verify: () => request('/auth/verify'),
}

// API de Colaboradores
export const colaboradoresAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/colaboradores?${queryParams}`)
  },
  getById: (id) => request(`/colaboradores/${id}`),
  create: (data) => request('/colaboradores', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/colaboradores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
}

// API de Eixos de Avaliação
export const eixosAvaliacaoAPI = {
  getAll: () => request('/eixos-avaliacao'),
  getById: (id) => request(`/eixos-avaliacao/${id}`),
}

// API de Níveis de Carreira
export const niveisCarreiraAPI = {
  getAll: () => request('/niveis-carreira'),
  getByNivel: (nivel) => request(`/niveis-carreira/${nivel}`),
}

// API de Ciclos
export const ciclosAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/ciclos?${queryParams}`)
  },
  getById: (id) => request(`/ciclos/${id}`),
  getAtivoAberto: () => request('/ciclos/ativo/aberto'),
}

// API de Ciclos de Avaliação
export const ciclosAvaliacaoAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/ciclos-avaliacao?${queryParams}`)
  },
  getById: (id) => request(`/ciclos-avaliacao/${id}`),
  getAtivo: () => request('/ciclos-avaliacao/ativo'),
  create: (data) => request('/ciclos-avaliacao', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/ciclos-avaliacao/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
}

// API de Avaliações
export const avaliacoesAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/avaliacoes?${queryParams}`)
  },
  getById: (id) => request(`/avaliacoes/${id}`),
  create: (data) => request('/avaliacoes', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/avaliacoes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getFeedback: (cicloId) => request(`/avaliacoes/ciclo/${cicloId}/feedback`),
}

// API de Entregas Outstanding
export const entregasOutstandingAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/entregas-outstanding?${queryParams}`)
  },
  getById: (id) => request(`/entregas-outstanding/${id}`),
  create: (colaboradorId, data) => request(`/entregas-outstanding?colaborador_id=${colaboradorId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/entregas-outstanding/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/entregas-outstanding/${id}`, {
    method: 'DELETE',
  }),
}

// API de Valores
export const valoresAPI = {
  getAll: () => request('/valores'),
  getById: (id) => request(`/valores/${id}`),
}

// API de Registros de Valor
export const registrosValorAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/registros-valor?${queryParams}`)
  },
  getById: (id) => request(`/registros-valor/${id}`),
  create: (colaboradorId, data) => request(`/registros-valor?colaborador_id=${colaboradorId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/registros-valor/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/registros-valor/${id}`, {
    method: 'DELETE',
  }),
}

