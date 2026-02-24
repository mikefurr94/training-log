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

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    // If the entire range is in the future, Strava has nothing to return.
    // Mark it fetched immediately so we don't keep retrying.
    if (start > today) {
      store.markRangeFetched(start, end)
      return
    }

    // Clip the fetch end to today — Strava 400s on purely future timestamps.
    const fetchEnd = end > today ? today : end

    fetchingRef.current = true
    store.setLoading(true)
    store.setError(null)

    fetchAllActivitiesInRange(start, fetchEnd)
      .then((activities) => {
        store.addActivities(activities)
        store.markRangeFetched(start, end) // mark the full requested range as done
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
