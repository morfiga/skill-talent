/**
 * Constantes para chaves do localStorage
 * Centraliza todas as chaves usadas para armazenamento de sessão
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  USER_NAME: 'user_name',
  USER_AVATAR: 'user_avatar', // Padronizado: usar 'user_avatar' (backend retorna 'avatar')
}

/**
 * Limpa todos os dados de sessão do localStorage
 * Esta função deve ser usada sempre que precisar limpar a sessão do usuário
 * (logout, erro 401, etc.)
 */
export function clearSession() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}

/**
 * Salva os dados de sessão no localStorage
 * @param {Object} sessionData - Dados da sessão a serem salvos
 * @param {string} sessionData.access_token - Token JWT
 * @param {number} sessionData.user_id - ID do usuário
 * @param {string} sessionData.email - Email do usuário
 * @param {string} sessionData.name - Nome do usuário
 * @param {string} [sessionData.avatar] - URL do avatar (opcional)
 */
export function saveSession(sessionData) {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, sessionData.access_token)
  localStorage.setItem(STORAGE_KEYS.USER_ID, sessionData.user_id.toString())
  localStorage.setItem(STORAGE_KEYS.USER_EMAIL, sessionData.email)
  localStorage.setItem(STORAGE_KEYS.USER_NAME, sessionData.name)
  
  if (sessionData.avatar) {
    localStorage.setItem(STORAGE_KEYS.USER_AVATAR, sessionData.avatar)
  }
}

/**
 * Obtém o token de autenticação do localStorage
 * @returns {string|null} Token JWT ou null se não existir
 */
export function getAuthToken() {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

/**
 * Obtém o ID do usuário do localStorage
 * @returns {string|null} ID do usuário ou null se não existir
 */
export function getUserId() {
  return localStorage.getItem(STORAGE_KEYS.USER_ID)
}

