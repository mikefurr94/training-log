import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { fetchActivityStreams } from '../api/strava'

export function useActivityStreams(id: number | null) {
  const [isLoading, setIsLoading] = useState(false)
  const streams = useAppStore((s) => (id ? s.activityStreams[id] : null))
  const setStreams = useAppStore((s) => s.setActivityStreams)

  useEffect(() => {
    if (!id || streams !== undefined) return

    setIsLoading(true)
    fetchActivityStreams(id)
      .then((data) => {
        if (data) setStreams(id, data)
      })
      .catch(() => {
        // Silently fail — HR data not always available
      })
      .finally(() => setIsLoading(false))
  }, [id])

  return { streams, isLoading }
}
