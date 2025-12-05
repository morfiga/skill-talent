/**
 * Classifica o tipo de erro da API baseado no status code e na mensagem
 * @param {Error} error - O erro lançado pela API
 * @returns {string} - Tipo do erro: 'validation' | 'network' | 'permission' | 'not_found' | 'server' | 'unknown'
 */
export function getErrorType(error) {
    // Verificar se é um erro de rede (sem resposta do servidor)
    if (error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('Network request failed')) {
        return 'network'
    }

    // Verificar status code no payload do erro primeiro
    const errorPayload = error.responseData || error.data || error.response?.data
    let status = null

    if (errorPayload?.error?.status_code) {
        status = errorPayload.error.status_code
    } else if (error.status) {
        status = error.status
    } else {
        // Tentar extrair do message como fallback
        const statusMatch = error.message?.match(/status:\s*(\d+)/)
        status = statusMatch ? parseInt(statusMatch[1]) : null
    }

    if (status) {
        if (status === 400) return 'validation'
        if (status === 401 || status === 403) return 'permission'
        if (status === 404) return 'not_found'
        if (status >= 500) return 'server'
    }

    // Verificar mensagens de erro comuns
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return 'permission'
    }
    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        return 'permission'
    }
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        return 'not_found'
    }
    if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
        return 'validation'
    }
    if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        return 'server'
    }

    return 'unknown'
}

/**
 * Trata erros de API de forma padronizada
 * - Faz log consistente do erro
 * - Retorna mensagem amigável para o usuário
 * - Classifica o tipo de erro
 * - Opcionalmente mostra toast de erro automaticamente
 * 
 * @param {Error} error - O erro lançado pela API
 * @param {string} context - Contexto da operação (ex: "carregar colaboradores", "salvar avaliação")
 * @param {string} endpoint - Endpoint da API que falhou (opcional, para log)
 * @param {Function} showToast - Função opcional para mostrar toast de erro (ex: useToast().error)
 * @returns {{ message: string, type: string }} - Objeto com mensagem amigável e tipo do erro
 */
export function handleApiError(error, context = 'realizar operação', endpoint = null, showToast = null) {
    const errorType = getErrorType(error)

    // Log consistente do erro
    const logContext = endpoint ? `[${endpoint}]` : ''
    console.error(`API Error ${logContext} - ${context}:`, {
        type: errorType,
        message: error.message,
        fullError: error
    })

    // Se uma função de toast foi fornecida, mostrar automaticamente
    if (showToast && typeof showToast === 'function') {
        showToast(error.message)
    }

    return {
        message: error.message,
        type: errorType
    }
}

