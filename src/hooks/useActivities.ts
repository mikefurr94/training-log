import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useCalendarRange } from './useCalendarRange'
import { fetchAllActivitiesInRange } from '../api/strava'

export function useActivities() {
  const store = useAppStore()
  const { start, end } = useCalendarRange()
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!store.accessToken) return
    if (store.isRangeFetched(start, end)) return
    if (fetchingRef.current) return

    fetchingRef.current = true
    store.setLoading(true)
    store.setError(null)

    fetchAllActivitiesInRange(start, end)
      .then((activities) => {
        store.addActivities(activities)
        store.markRangeFetched(start, end)
      })
      .catch((err: Error) => {
        store.setError(err.message)
      })
      .finally(() => {
        store.setLoading(false)
        fetchingRef.current = false
      })
  }, [start.getTime(), end.getTime(), store.accessToken])

  return store.activitiesByDate
}
