import { useEffect, useRef } from 'react'
import { subMonths } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { fetchAllActivitiesInRange } from '../api/strava'

/**
 * Ensures activitiesByDate is populated for the full range the race predictor needs:
 * - 12 months back (6 months of trailing windows starting from 6 months ago)
 *
 * Uses the same markRangeFetched / isRangeFetched caching as useActivities so
 * it never makes duplicate requests.
 */
export function useRacePredictorData() {
  const store = useAppStore()
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!store.accessToken) return
    if (fetchingRef.current) return

    const today = new Date()
    const twelveMonthsAgo = subMonths(today, 12)

    if (store.isRangeFetched(twelveMonthsAgo, today)) return

    fetchingRef.current = true
    store.setLoading(true)
    store.setError(null)

    fetchAllActivitiesInRange(twelveMonthsAgo, today)
      .then((activities) => {
        store.addActivities(activities)
        store.markRangeFetched(twelveMonthsAgo, today)
      })
      .catch((err: Error) => {
        store.setError(err.message)
      })
      .finally(() => {
        store.setLoading(false)
        fetchingRef.current = false
      })
  }, [store.accessToken])

  return store.activitiesByDate
}
