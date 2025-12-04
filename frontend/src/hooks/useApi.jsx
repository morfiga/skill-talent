import { useCallback, useState } from 'react'
import { handleApiError } from '../utils/errorHandler'

/**
 * Hook para padronizar chamadas de API com tratamento de erros
 * 
 * @returns {{
 *   execute: (apiCall: () => Promise<T>, context?: string, endpoint?: string) => Promise<T | null>,
 *   loading: boolean,
 *   error: string | null,
 *   clearError: () => void
 * }}
 * 
 * @example
 * const { execute, loading, error } = useApi()
 * 
 * const loadData = async () => {
 *   const data = await execute(
 *     () => colaboradoresAPI.getAll(),
 *     'carregar colaboradores',
 *     '/colaboradores'
 *   )
 *   if (data) {
 *     setColaboradores(data.colaboradores)
 *   }
 * }
 */
export function useApi() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const execute = useCallback(async (apiCall, context = 'realizar operação', endpoint = null) => {
        setLoading(true)
        setError(null)

        try {
            const result = await apiCall()
            return result
        } catch (err) {
            const { message } = handleApiError(err, context, endpoint)
            setError(message)
            return null
        } finally {
            setLoading(false)
        }
    }, [])

    const clearError = useCallback(() => {
        setError(null)
    }, [])

    return {
        execute,
        loading,
        error,
        clearError
    }
}

