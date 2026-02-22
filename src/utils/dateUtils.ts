import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  getDay,
  addDays,
} from 'date-fns'

export type CalendarView = 'week' | 'month' | 'quarter' | '6month' | 'year'

export interface DateRange {
  start: Date
  end: Date
}

export function getDateRange(view: CalendarView, anchor: Date): DateRange {
  switch (view) {
    case 'week':
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
      }
    case 'month':
      return {
        start: startOfMonth(anchor),
        end: endOfMonth(anchor),
      }
    case 'quarter':
      return {
        start: startOfQuarter(anchor),
        end: endOfQuarter(anchor),
      }
    case '6month': {
      const start = startOfMonth(anchor)
      const end = endOfMonth(addMonths(anchor, 5))
      return { start, end }
    }
    case 'year':
      return {
        start: startOfYear(anchor),
        end: endOfYear(anchor),
      }
  }
}

export function getPeriodLabel(view: CalendarView, anchor: Date): string {
  switch (view) {
    case 'week': {
      const start = startOfWeek(anchor, { weekStartsOn: 1 })
      const end = endOfWeek(anchor, { weekStartsOn: 1 })
      if (isSameMonth(start, end)) {
        return `${format(start, 'MMM d')}–${format(end, 'd, yyyy')}`
      }
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    }
    case 'month':
      return format(anchor, 'MMMM yyyy')
    case 'quarter':
      return `Q${Math.ceil((anchor.getMonth() + 1) / 3)} ${format(anchor, 'yyyy')}`
    case '6month': {
      const start = startOfMonth(anchor)
      const end = addMonths(anchor, 5)
      return `${format(start, 'MMM')}–${format(end, 'MMM yyyy')}`
    }
    case 'year':
      return format(anchor, 'yyyy')
  }
}

export function navigateAnchor(view: CalendarView, anchor: Date, direction: 'prev' | 'next'): Date {
  const delta = direction === 'next' ? 1 : -1
  switch (view) {
    case 'week':
      return direction === 'next' ? addWeeks(anchor, 1) : subWeeks(anchor, 1)
    case 'month':
      return direction === 'next' ? addMonths(anchor, 1) : subMonths(anchor, 1)
    case 'quarter':
      return direction === 'next' ? addMonths(anchor, 3) : subMonths(anchor, 3)
    case '6month':
      return direction === 'next' ? addMonths(anchor, 6) : subMonths(anchor, 6)
    case 'year':
      return direction === 'next' ? addYears(anchor, 1) : subYears(anchor, 1)
    default:
      return addMonths(anchor, delta)
  }
}

// Build a 6-row × 7-col grid for a month view (includes padding days from adjacent months)
export function buildMonthGrid(monthDate: Date): Date[][] {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

// Build 7-day array for week view
export function buildWeekGrid(anchor: Date): Date[] {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export { isSameDay, isSameMonth, isToday, format, eachDayOfInterval }
