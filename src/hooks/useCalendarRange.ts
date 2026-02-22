import { useMemo } from 'react'
import { parseISO, addMonths } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { getDateRange, getPeriodLabel } from '../utils/dateUtils'
import type { DateRange } from '../utils/dateUtils'

export interface CalendarRange extends DateRange {
  label: string
  anchor: Date
}

export function useCalendarRange(): CalendarRange {
  const currentView = useAppStore((s) => s.currentView)
  const anchorDate = useAppStore((s) => s.anchorDate)

  return useMemo(() => {
    const anchor = parseISO(anchorDate)
    // For 6month view, anchor is the first of the 6 months
    const range = getDateRange(currentView, anchor)
    const label = getPeriodLabel(currentView, anchor)
    return { ...range, label, anchor }
  }, [currentView, anchorDate])
}
