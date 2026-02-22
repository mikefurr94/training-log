import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { fetchActivityDetail } from '../api/strava'

export function useActivityDetail(id: number | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detail = useAppStore((s) => (id ? s.activityDetails[id] : null))
  const setDetail = useAppStore((s) => s.setActivityDetail)

  useEffect(() => {
    if (!id || detail) return

    setIsLoading(true)
    setError(null)

    fetchActivityDetail(id)
      .then((d) => setDetail(id, d))
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [id])

  return { detail, isLoading, error }
}
