import { useEffect, useRef } from 'react'
import { startOfYear, subWeeks, startOfWeek, min } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { fetchAllActivitiesInRange } from '../api/strava'

const WEEKS_TO_SHOW = 16

/**
 * Ensures activitiesByDate is populated for the full range the dashboard needs:
 * - Year-to-date (from Jan 1 of the current year)
 * - Last 16 weeks of week stats
 *
 * Uses the same markRangeFetched / isRangeFetched caching as useActivities so
 * it never makes duplicate requests.
 */
export function useDashboardData() {
  const store = useAppStore()
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!store.accessToken) return
    if (fetchingRef.current) return

    const today = new Date()

    // Dashboard needs from the earliest of:
    //   • start of this year (for YTD totals)
    //   • 16 weeks ago Monday (for the weekly stats chart)
    const yearStart = startOfYear(today)
    const sixteenWeeksAgo = startOfWeek(subWeeks(today, WEEKS_TO_SHOW - 1), { weekStartsOn: 1 })
    const rangeStart = min([yearStart, sixteenWeeksAgo])
    const rangeEnd = today

    if (store.isRangeFetched(rangeStart, rangeEnd)) return

    fetchingRef.current = true
    store.setLoading(true)
    store.setError(null)

    fetchAllActivitiesInRange(rangeStart, rangeEnd)
      .then((activities) => {
        store.addActivities(activities)
        store.markRangeFetched(rangeStart, rangeEnd)
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
