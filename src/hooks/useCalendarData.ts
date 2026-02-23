import { useEffect, useRef } from 'react'
import { startOfYear, startOfQuarter, endOfQuarter, startOfWeek, subWeeks, min, parseISO } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { fetchAllActivitiesInRange } from '../api/strava'

/**
 * Proactively ensures activitiesByDate is populated for the full range the
 * calendar/grid page needs:
 *
 *   On mount (current year):
 *     - Start of current year through today (covers all month/quarter/year views)
 *     - At least 16 weeks back (so week view always has context)
 *
 *   On anchor change:
 *     - Fetches the full quarter containing the anchor date, so navigating
 *       the grid back by quarter always loads a complete, clean block of data.
 *
 * Uses the same markRangeFetched / isRangeFetched caching as useActivities so
 * it never makes duplicate requests, and plays nicely with useDashboardData.
 */
export function useCalendarData() {
  const store = useAppStore()
  const anchorDate = useAppStore((s) => s.anchorDate)
  const fetchingRef = useRef(false)

  // On mount: fetch current-year + 16-weeks-back range
  useEffect(() => {
    if (!store.accessToken) return

    const today = new Date()
    const yearStart = startOfYear(today)
    const sixteenWeeksAgo = startOfWeek(subWeeks(today, 15), { weekStartsOn: 1 })
    const rangeStart = min([yearStart, sixteenWeeksAgo])
    const rangeEnd = today

    if (store.isRangeFetched(rangeStart, rangeEnd)) return
    if (fetchingRef.current) return

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

  // On anchor change: fetch the full quarter containing the anchor so grid
  // navigation always loads a complete block of data per step.
  useEffect(() => {
    if (!store.accessToken) return

    const anchor = parseISO(anchorDate)
    const rangeStart = startOfQuarter(anchor)
    const rangeEnd = endOfQuarter(anchor)

    if (store.isRangeFetched(rangeStart, rangeEnd)) return
    if (fetchingRef.current) return

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
  }, [anchorDate, store.accessToken])
}
