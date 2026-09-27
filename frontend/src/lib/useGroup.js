import { useCallback, useEffect, useState } from 'react'
import * as api from '../api'
import { useAuth } from '../contexts/AuthContext'

// Not cached in AuthContext/localStorage — always fetched fresh so create/
// join/leave/delete can't desync from a second source of truth.
export function useGroup() {
  const { token } = useAuth()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!token) {
      setGroup(null)
      setLoading(false)
      return Promise.resolve()
    }
    setLoading(true)
    return api
      .getMyGroup(token)
      .then(({ group }) => setGroup(group))
      .catch(() => setGroup(null))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { group, loading, refresh }
}
