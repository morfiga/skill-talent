import { clearSession, getAuthToken } from '../utils/storage'

// Configuração da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

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
      // Se for erro 401, limpar sessão e redirecionar para login
      if (response.status === 401) {
        clearSession()
        window.location.href = '/login'
      }

      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      const error = new Error(errorData.detail || errorData.error?.message || `HTTP error! status: ${response.status}`)
      // Preservar o payload completo do erro para uso no handleApiError
      error.responseData = errorData
      error.status = response.status
      throw error
    }

    // Se a resposta estiver vazia (204), retornar null
    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (error) {
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
  getLiderados: (id) => request(`/colaboradores/${id}/liderados`),
  create: (data) => request('/colaboradores', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/colaboradores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => request(`/colaboradores/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_active: false }),
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
  getAcompanhamento: (cicloId) => request(`/ciclos/${cicloId}/acompanhamento`),
  create: (data) => request('/ciclos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/ciclos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  avancarEtapa: (id) => request(`/ciclos/${id}/avancar-etapa`, {
    method: 'POST',
  }),
  delete: (id) => request(`/ciclos/${id}`, {
    method: 'DELETE',
  }),
}

// API de Ciclos de Avaliação
export const ciclosAvaliacaoAPI = {
  getAll: () => request(`/ciclos-avaliacao`),
  getById: (id) => request(`/ciclos-avaliacao/${id}`),
  getAtivo: () => request('/ciclos-avaliacao/ativo'),
  getLiderados: (cicloId) => request(`/ciclos-avaliacao/gestor/liderados?ciclo_id=${cicloId}`),
  create: (data) => request('/ciclos-avaliacao', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/ciclos-avaliacao/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateParesLiderado: (cicloAvaliacaoId, data) => request(`/ciclos-avaliacao/gestor/${cicloAvaliacaoId}/pares`, {
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
  getFeedbackAdmin: (colaboradorId, cicloId) => request(`/avaliacoes/admin/colaborador/${colaboradorId}/ciclo/${cicloId}/feedback`),
  getAvaliacoesColaboradorAdmin: (colaboradorId, cicloId = null) => {
    const params = cicloId ? `?ciclo_id=${cicloId}` : ''
    return request(`/avaliacoes/admin/colaborador/${colaboradorId}${params}`)
  },
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
  getAdminPendentes: () => request('/entregas-outstanding/admin/pendentes'),
  aprovar: (entregaId, data = {}) => request(`/entregas-outstanding/${entregaId}/aprovar`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  reprovar: (entregaId, data) => request(`/entregas-outstanding/${entregaId}/reprovar`, {
    method: 'POST',
    body: JSON.stringify(data),
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
  getAdminPendentes: () => request('/registros-valor/admin/pendentes'),
  aprovar: (registroId, data = {}) => request(`/registros-valor/${registroId}/aprovar`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  reprovar: (registroId, data) => request(`/registros-valor/${registroId}/reprovar`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// API de Avaliações de Gestor (colaborador avalia gestor)
export const avaliacoesGestorAPI = {
  getPerguntas: () => request('/avaliacoes-gestor/perguntas'),
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString()
    return request(`/avaliacoes-gestor?${queryParams}`)
  },
  getById: (id) => request(`/avaliacoes-gestor/${id}`),
  create: (data) => request('/avaliacoes-gestor', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => request(`/avaliacoes-gestor/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  // Admin: buscar avaliações que os liderados fizeram de um gestor
  getAvaliacoesGestorAdmin: (gestorId, cicloId = null) => {
    const params = cicloId ? `?ciclo_id=${cicloId}` : ''
    return request(`/avaliacoes-gestor/admin/gestor/${gestorId}${params}`)
  },
  // Admin: buscar feedback de gestor (similar ao endpoint acima, específico para ciclo)
  getFeedbackGestorAdmin: (gestorId, cicloId) => request(`/avaliacoes-gestor/admin/gestor/${gestorId}/ciclo/${cicloId}/feedback`),
}

// API de Liberação de Feedback
export const feedbackLiberacaoAPI = {
  getByCiclo: (cicloId) => request(`/feedback-liberacao/ciclo/${cicloId}`),
  liberar: (cicloId, colaboradorId) => request(`/feedback-liberacao/ciclo/${cicloId}/colaborador/${colaboradorId}/liberar`, {
    method: 'POST',
  }),
  revogar: (cicloId, colaboradorId) => request(`/feedback-liberacao/ciclo/${cicloId}/colaborador/${colaboradorId}/revogar`, {
    method: 'POST',
  }),
}

