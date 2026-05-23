import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '../utils/api'

export function useFetch(endpoint, params = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const paramsKey = JSON.stringify(params)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(endpoint, JSON.parse(paramsKey))
      setData(result)
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
