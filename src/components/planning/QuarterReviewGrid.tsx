import { useMemo } from 'react'
import { startOfWeek, addWeeks, addDays, format, startOfQuarter, endOfQuarter, isBefore, isAfter, getMonth } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { matchActualToPlanned } from '../../utils/planningUtils'
import { scoreWeek, WEEK_SCORE_COLORS } from '../../utils/weekScoring'
import WeekScoreCard from './WeekScoreCard'

interface Props {
  anchor: Date
  onSelectWeek: (weekStart: Date) => void
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function QuarterReviewGrid({ anchor, onSelectWeek }: Props) {
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)
  const keyDates = useAppStore((s) => s.keyDates)
  const getWeekPlan = useAppStore((s) => s.getWeekPlan)

  const qStart = startOfQuarter(anchor)
  const qEnd = endOfQuarter(anchor)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })

  const weeks = useMemo(() => {
    const result: Date[] = []
    let ws = startOfWeek(qStart, { weekStartsOn: 1 })
    while (isBefore(ws, qEnd)) {
      result.push(ws)
      ws = addWeeks(ws, 1)
      if (result.length > 14) break
    }
    return result
  }, [qStart, qEnd])

  const weekStats = useMemo(() => {
    return weeks.map((ws) => {
      const plan = getWeekPlan(ws)
      let completed = 0, partial = 0, missed = 0

      for (let d = 0; d < 7; d++) {
        const dayDate = addDays(ws, d)
        if (isAfter(dayDate, today)) continue
        const dayIndex = dayDate.getDay()
        const planned = plan[dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6] ?? []
        const dateStr = format(dayDate, 'yyyy-MM-dd')
        const actuals = activitiesByDate[dateStr] ?? []
        for (const r of matchActualToPlanned(planned, actuals)) {
          if (r.status === 'completed') completed++
          else if (r.status === 'partial') partial++
          else if (r.status === 'missed') missed++
        }
      }

      const wsStr = format(ws, 'yyyy-MM-dd')
      const weStr = format(addDays(ws, 6), 'yyyy-MM-dd')
      const weekKDs = keyDates.filter((kd) => kd.date >= wsStr && kd.date <= weStr)

      return { weekStart: ws, completed, partial, missed, total: completed + partial + missed, keyDates: weekKDs }
    })
  }, [weeks, getWeekPlan, activitiesByDate, keyDates, today])

  // Group weeks by month
  const monthGroups = useMemo(() => {
    const groups: { month: string; weeks: typeof weekStats }[] = []
    let currentMonth = ''
    for (const ws of weekStats) {
      const m = MONTH_NAMES[getMonth(ws.weekStart)]
      if (m !== currentMonth) {
        currentMonth = m
        groups.push({ month: m, weeks: [] })
      }
      groups[groups.length - 1].weeks.push(ws)
    }
    return groups
  }, [weekStats])

  // Quarter totals
  const totals = weekStats.reduce((acc, w) => ({
    completed: acc.completed + w.completed,
    partial: acc.partial + w.partial,
    missed: acc.missed + w.missed,
    total: acc.total + w.total,
  }), { completed: 0, partial: 0, missed: 0, total: 0 })

  const qScore = scoreWeek(totals.completed, totals.total)
  const qColors = WEEK_SCORE_COLORS[qScore]
  const qPct = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {monthGroups.map((group) => (
        <div key={group.month}>
          <div style={{
            fontSize: 'var(--font-size-sm)', fontWeight: 700,
            color: 'var(--color-text-secondary)', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {group.month}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(group.weeks.length, 5)}, 1fr)`, gap: 8 }}>
            {group.weeks.map((ws) => (
              <WeekScoreCard
                key={format(ws.weekStart, 'yyyy-MM-dd')}
                weekStart={ws.weekStart}
                completed={ws.completed}
                partial={ws.partial}
                missed={ws.missed}
                total={ws.total}
                keyDates={ws.keyDates}
                isCurrent={format(ws.weekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd')}
                onClick={() => onSelectWeek(ws.weekStart)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Quarter summary bar */}
      <div style={{
        display: 'flex', gap: 16, padding: '14px 20px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)', alignItems: 'center',
      }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: qColors.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Quarter summary:
        </span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: qColors.text, fontWeight: 700 }}>
          {totals.completed}/{totals.total} completed
        </span>
        {totals.partial > 0 && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-status-partial-text)' }}>
            {totals.partial} partial
          </span>
        )}
        {totals.missed > 0 && (
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-status-missed-text)' }}>
            {totals.missed} missed
          </span>
        )}
        {qPct !== null && (
          <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: qColors.text }}>
            {qPct}%
          </span>
        )}
      </div>
    </div>
  )
}
