import React, { useState, useMemo } from 'react'
import { startOfWeek, addWeeks, subWeeks, addMonths, subMonths, addQuarters, subQuarters, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { useWeekPlan } from '../hooks/useWeekPlan'
import WeekReviewCell from '../components/planning/WeekReviewCell'
import MonthReviewGrid from '../components/planning/MonthReviewGrid'
import QuarterReviewGrid from '../components/planning/QuarterReviewGrid'
import { STATUS_ICONS, STATUS_COLORS, matchActualToPlanned, getPlannedActivityLabel, getPlannedActivityEmoji, secondsToPaceString, speedToSecondsPerMile } from '../utils/planningUtils'
import type { PlanStatus, PlannedActivity, StravaActivity, PlanMatchResult, ReviewScope } from '../store/types'

const STATUSES: PlanStatus[] = ['completed', 'partial', 'missed']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SCOPE_OPTIONS: { scope: ReviewScope; label: string }[] = [
  { scope: 'week', label: 'Week' },
  { scope: 'month', label: 'Month' },
  { scope: 'quarter', label: 'Quarter' },
]

export default function WeekReviewPage() {
  const [anchor, setAnchor] = useState(() => new Date())
  const [showExport, setShowExport] = useState(false)
  const [scope, setScope] = useState<ReviewScope>('week')

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)
  const selectActivity = useAppStore((s) => s.selectActivity)
  const weekPlan = useWeekPlan(weekStart)

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addWeeks(weekStart, 1), 'MMM d, yyyy')}`

  const days = useMemo(() =>
    weekPlan.map((day) => ({
      date: day.date,
      dayIndex: day.dayIndex,
      planned: day.activities,
      actuals: activitiesByDate[format(day.date, 'yyyy-MM-dd')] ?? [],
    })),
    [weekPlan, activitiesByDate]
  )

  const isCurrentWeek =
    format(weekStart, 'yyyy-MM-dd') === format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const { completed, partial, missed } = useMemo(() => {
    let completed = 0, partial = 0, missed = 0
    for (const day of days) {
      for (const r of matchActualToPlanned(day.planned, day.actuals)) {
        if (r.status === 'completed') completed++
        else if (r.status === 'partial') partial++
        else if (r.status === 'missed') missed++
      }
    }
    return { completed, partial, missed }
  }, [days])

  const total = completed + partial + missed

  function navigateScope(direction: 'prev' | 'next') {
    setAnchor((a) => {
      if (scope === 'week') return direction === 'prev' ? subWeeks(a, 1) : addWeeks(a, 1)
      if (scope === 'month') return direction === 'prev' ? subMonths(a, 1) : addMonths(a, 1)
      return direction === 'prev' ? subQuarters(a, 1) : addQuarters(a, 1)
    })
  }

  function getScopeLabel(): string {
    if (scope === 'week') return weekLabel
    if (scope === 'month') return format(anchor, 'MMMM yyyy')
    const q = Math.floor(anchor.getMonth() / 3) + 1
    return `Q${q} ${format(anchor, 'yyyy')}`
  }

  function handleSelectWeekFromGrid(ws: Date) {
    setAnchor(ws)
    setScope('week')
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '24px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
          Review
        </h2>

        {/* Scope tabs */}
        <div style={{
          display: 'flex', background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', padding: 2, gap: 1,
        }}>
          {SCOPE_OPTIONS.map(({ scope: s, label }) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-sm)', fontWeight: scope === s ? 600 : 500,
                color: scope === s ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                background: scope === s ? 'var(--color-accent)' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'all 120ms ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <NavBtn onClick={() => navigateScope('prev')} label={`Previous ${scope}`}>‹</NavBtn>
          <button onClick={() => setAnchor(new Date())} style={ghostBtnStyle}>
            Today
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: 160, textAlign: 'center' }}>
            {getScopeLabel()}
          </span>
          <NavBtn onClick={() => navigateScope('next')} label={`Next ${scope}`}>›</NavBtn>
        </div>

        <div style={{ flex: 1 }} />

        {/* Legend — only in week view */}
        {scope === 'week' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {STATUSES.map((s) => {
              const colors = STATUS_COLORS[s]
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12 }}>{STATUS_ICONS[s]}</span>
                  <span style={{ fontSize: 11, color: colors.text, fontWeight: 600, textTransform: 'capitalize' }}>
                    {s}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Export button — only in week view */}
        {scope === 'week' && (
          <button
            onClick={() => setShowExport((v) => !v)}
            style={{
              ...ghostBtnStyle,
              background: showExport ? 'var(--color-accent-light)' : 'transparent',
              color: showExport ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderColor: showExport ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            📊 Summary table
          </button>
        )}
      </div>

      {/* Export modal */}
      {showExport && scope === 'week' && (
        <ExportModal days={days} weekLabel={weekLabel} onClose={() => setShowExport(false)} />
      )}

      {/* Content based on scope */}
      {scope === 'week' && (
        <>
          {/* 7-column review grid */}
          <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 300 }}>
            {days.map((day) => (
              <WeekReviewCell
                key={format(day.date, 'yyyy-MM-dd')}
                date={day.date}
                planned={day.planned}
                actuals={day.actuals}
                onSelectActivity={selectActivity}
              />
            ))}
          </div>

          {/* Summary bar */}
          <div style={{ display: 'flex', gap: 16, padding: '14px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 4 }}>
              Week summary:
            </span>
            {([['completed', completed], ['partial', partial], ['missed', missed]] as [PlanStatus, number][]).map(([status, value]) => {
              const c = STATUS_COLORS[status]
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13 }}>{STATUS_ICONS[status]}</span>
                  <span style={{ fontSize: 'var(--font-size-sm)', color: c.text, fontWeight: 700 }}>{value}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{status}</span>
                </div>
              )
            })}
            {total > 0 && (
              <div style={{ marginLeft: 'auto', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span style={{ fontWeight: 700, color: STATUS_COLORS.completed.text }}>{Math.round((completed / total) * 100)}%</span>
                {' '}completion
              </div>
            )}
            {total === 0 && (
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                No planned activities — add some in the Planner tab.
              </span>
            )}
          </div>
        </>
      )}

      {scope === 'month' && (
        <MonthReviewGrid anchor={anchor} onSelectWeek={handleSelectWeekFromGrid} />
      )}

      {scope === 'quarter' && (
        <QuarterReviewGrid anchor={anchor} onSelectWeek={handleSelectWeekFromGrid} />
      )}
    </div>
  )
}

// ── Export panel ──────────────────────────────────────────────────────────────

interface DayData {
  date: Date
  dayIndex: number
  planned: PlannedActivity[]
  actuals: StravaActivity[]
}

function ExportModal({ days, weekLabel, onClose }: { days: DayData[]; weekLabel: string; onClose: () => void }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows: ExportRow[] = []
  for (const day of days) {
    const dayName = DAY_LABELS[day.date.getDay()]
    const isFuture = day.date > today
    const results = matchActualToPlanned(day.planned, day.actuals)

    for (const result of results) {
      const actual = result.actualActivityId
        ? day.actuals.find((a) => a.id === result.actualActivityId)
        : undefined
      rows.push({ dayName, result, actual, isUnplanned: false, isFuture })
    }

    const matchedIds = new Set(results.map((r) => r.actualActivityId).filter(Boolean))
    for (const act of day.actuals.filter((a) => !matchedIds.has(a.id))) {
      rows.push({ dayName, result: null, actual: act, isUnplanned: true, isFuture })
    }

    if (results.length === 0 && day.actuals.length === 0) {
      rows.push({ dayName, result: null, actual: null, isUnplanned: false, isFuture })
    }
  }

  let completed = 0, partial = 0, missed = 0
  for (const day of days) {
    if (day.date > today) continue
    for (const r of matchActualToPlanned(day.planned, day.actuals)) {
      if (r.status === 'completed') completed++
      else if (r.status === 'partial') partial++
      else if (r.status === 'missed') missed++
    }
  }
  const total = completed + partial + missed
  const pct = total > 0 ? Math.round((completed / total) * 100) : null

  const thStyle: React.CSSProperties = {
    padding: '11px 20px', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '0.07em',
    color: 'var(--color-text-tertiary)', textAlign: 'left',
    borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap',
    background: 'var(--color-bg)',
  }

  const table = (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
      overflow: 'hidden', border: '1px solid var(--color-border)',
      width: 700, boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
    }}>
      <div style={{
        padding: '20px 28px 18px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-surface)',
      }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>
            Week of {weekLabel}
          </div>
          {pct !== null && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {completed}/{total} completed · {pct}% · {partial} partial · {missed} missed
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Close" style={{
          marginLeft: 'auto', width: 28, height: 28, borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)', background: 'transparent',
          color: 'var(--color-text-tertiary)', fontSize: 18, lineHeight: 1, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>

      <div style={{ padding: '16px 20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <colgroup>
          <col style={{ width: 56 }} />
          <col style={{ width: '40%' }} />
          <col />
          <col style={{ width: 90 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}>Day</th>
            <th style={{ ...thStyle, borderLeft: '1px solid var(--color-border)' }}>Target</th>
            <th style={{ ...thStyle, borderLeft: '1px solid var(--color-border)' }}>Actual</th>
            <th style={{ ...thStyle, borderLeft: '1px solid var(--color-border)', textAlign: 'center', padding: '11px 16px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isEven = i % 2 === 0
            const rowBg = isEven ? 'var(--color-surface)' : 'var(--color-bg)'
            const statusColors = (!row.isFuture && row.result) ? STATUS_COLORS[row.result.status] : null
            const targetCell = row.result
              ? `${getPlannedActivityEmoji(row.result.planned)}  ${getPlannedActivityLabel(row.result.planned)}`
              : '—'
            const actualCell = row.isFuture ? '—' : buildActualLabel(row.result, row.actual, row.isUnplanned)
            const statusIcon = row.isFuture ? '' : (row.result ? STATUS_ICONS[row.result.status] : row.isUnplanned ? '➕' : '')
            const tdBase: React.CSSProperties = {
              padding: '11px 20px', fontSize: 12, color: 'var(--color-text-primary)',
              borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
              background: rowBg, verticalAlign: 'middle', opacity: row.isFuture ? 0.45 : 1,
            }
            return (
              <tr key={i}>
                <td style={{ ...tdBase, fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11, letterSpacing: '0.02em' }}>
                  {row.dayName}
                </td>
                <td style={{ ...tdBase, borderLeft: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {targetCell}
                </td>
                <td style={{
                  ...tdBase, borderLeft: '1px solid var(--color-border)',
                  fontWeight: actualCell !== '—' ? 500 : undefined,
                  color: statusColors?.text ?? 'var(--color-text-tertiary)',
                }}>
                  {actualCell}
                </td>
                <td style={{ ...tdBase, borderLeft: '1px solid var(--color-border)', textAlign: 'center', fontSize: 16, padding: '11px 16px' }}>
                  {statusIcon}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      {total > 0 && (
        <div style={{
          padding: '14px 20px 18px', borderTop: '1px solid var(--color-border)',
          display: 'flex', gap: 16, alignItems: 'center', background: 'var(--color-bg)',
        }}>
          {([['completed', completed], ['partial', partial], ['missed', missed]] as [PlanStatus, number][]).map(([status, val]) => (
            <span key={status} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{STATUS_ICONS[status]}</span>
              <span style={{ color: STATUS_COLORS[status].text, fontWeight: 700 }}>{val}</span>
              <span style={{ color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>{status}</span>
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: STATUS_COLORS.completed.text }}>
            {pct}% completion
          </span>
        </div>
      )}
    </div>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
      }}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {table}
      </div>
    </div>
  )
}

interface ExportRow {
  dayName: string
  result: PlanMatchResult | null
  actual: StravaActivity | null | undefined
  isUnplanned: boolean
  isFuture: boolean
}

function buildActualLabel(result: PlanMatchResult | null, actual: StravaActivity | null | undefined, isUnplanned: boolean): string {
  if (isUnplanned && actual) {
    const distMi = actual.distance > 0 ? ` · ${(actual.distance / 1609.344).toFixed(1)}mi` : ''
    return `${actual.name}${distMi}`
  }
  if (!result && !actual) return '😴 Rest'
  if (result && result.planned.type === 'Rest' && !actual) return '😴 Rest'
  if (result && result.status === 'missed') return '😴 Rest'
  if (!result) return '—'
  if (!actual) return '—'
  if (result.planned.type === 'Run') {
    const distMi = (actual.distance / 1609.344).toFixed(1)
    const pace = actual.average_speed > 0
      ? `  ·  ${secondsToPaceString(speedToSecondsPerMile(actual.average_speed))}/mi`
      : ''
    return `${distMi}mi${pace}`
  }
  return actual.name
}

// ── Shared ────────────────────────────────────────────────────────────────────

const ghostBtnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--font-size-sm)', fontWeight: 500,
  color: 'var(--color-text-secondary)', background: 'transparent',
  border: '1px solid var(--color-border)', cursor: 'pointer',
}

function NavBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
      background: 'transparent', border: '1px solid var(--color-border)',
      color: 'var(--color-text-secondary)', fontSize: 20, lineHeight: 1,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300,
    }}>
      {children}
    </button>
  )
}
