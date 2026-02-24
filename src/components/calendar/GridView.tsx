import React, { useState } from 'react'
import { format, startOfYear, endOfYear, eachWeekOfInterval, addDays, startOfWeek } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { mapStravaType, getActivityColor, ALL_ACTIVITY_TYPES } from '../../utils/activityColors'
import { formatDistance, formatDuration, formatPace, formatHeartRate, formatElevation } from '../../utils/formatters'
import type { ActivityType } from '../../utils/activityColors'
import type { StravaActivity } from '../../store/types'
import type { DistanceUnit } from '../../utils/formatters'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_LABEL_WIDTH = 20

interface Props {
  anchor: Date
  activitiesByDate: Record<string, StravaActivity[]>
}

interface DayData {
  date: Date
  activities: StravaActivity[]
  inYear: boolean
}

interface TooltipState {
  activity: StravaActivity
  x: number
  y: number
}

export default function GridView({ anchor, activitiesByDate }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const selectActivity = useAppStore((s) => s.selectActivity)
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const activeTypes = ALL_ACTIVITY_TYPES.filter((t) => enabledTypes.includes(t))

  const yearStart = startOfYear(anchor)
  const yearEnd = endOfYear(anchor)

  // Skip the partial first week — only include weeks whose Monday is on or after Jan 1
  const weekStarts = eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 1 }
  ).filter((ws) => ws >= yearStart)

  const grid: DayData[][] = weekStarts.map((ws) =>
    Array.from({ length: 7 }, (_, di) => {
      const date = addDays(ws, di)
      const key = format(date, 'yyyy-MM-dd')
      return {
        date,
        activities: activitiesByDate[key] ?? [],
        inYear: date >= yearStart && date <= yearEnd,
      }
    })
  )

  const monthPositions: { month: number; col: number }[] = []
  weekStarts.forEach((ws, col) => {
    if (col === 0 || ws.getMonth() !== weekStarts[col - 1]?.getMonth()) {
      monthPositions.push({ month: ws.getMonth(), col })
    }
  })

  const totalWeeks = weekStarts.length
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).getTime()

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      padding: '20px 24px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
    }}>
      {activeTypes.map((type) => (
        <ActivityGrid
          key={type}
          type={type}
          grid={grid}
          monthPositions={monthPositions}
          totalWeeks={totalWeeks}
          showMonthLabels={true}
          currentWeekStart={currentWeekStart}
          onSelect={selectActivity}
          onCellHover={(activity, x, y) => setTooltip({ activity, x, y })}
          onCellLeave={() => setTooltip(null)}
        />
      ))}

      {activeTypes.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          No activity types selected. Use the filters above to show activities.
        </div>
      )}

      {tooltip && (
        <ActivityTooltip
          activity={tooltip.activity}
          x={tooltip.x}
          y={tooltip.y}
          distanceUnit={distanceUnit}
        />
      )}
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ActivityTooltip({ activity, x, y, distanceUnit }: {
  activity: StravaActivity
  x: number
  y: number
  distanceUnit: DistanceUnit
}) {
  const type = mapStravaType(activity.sport_type || activity.type)
  const colors = getActivityColor(type)
  const isRun = type === 'Run'

  const TOOLTIP_WIDTH = 200
  const OFFSET_X = 12
  const OFFSET_Y = -8

  const left = x + OFFSET_X + TOOLTIP_WIDTH > window.innerWidth
    ? x - TOOLTIP_WIDTH - OFFSET_X
    : x + OFFSET_X

  const top = y + OFFSET_Y

  const rows: { label: string; value: string }[] = []
  if (activity.distance > 0) rows.push({ label: 'Distance', value: formatDistance(activity.distance, distanceUnit) })
  if (activity.moving_time > 0) rows.push({ label: 'Time', value: formatDuration(activity.moving_time) })
  if (isRun && activity.average_speed > 0) rows.push({ label: 'Pace', value: formatPace(activity.average_speed, distanceUnit) })
  if (activity.average_heartrate) rows.push({ label: 'Avg HR', value: formatHeartRate(activity.average_heartrate) })
  if (activity.total_elevation_gain > 0) rows.push({ label: 'Elevation', value: formatElevation(activity.total_elevation_gain, distanceUnit) })

  return (
    <div style={{
      position: 'fixed',
      top,
      left,
      width: TOOLTIP_WIDTH,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      padding: '8px 10px',
      pointerEvents: 'none',
      zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: rows.length > 0 ? 6 : 0 }}>
        <span style={{ fontSize: 13 }}>{colors.emoji}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {activity.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            {format(new Date(activity.start_date_local), 'EEE, MMM d')}
          </div>
        </div>
      </div>

      {/* Stats */}
      {rows.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '3px 8px',
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: 6,
        }}>
          {rows.map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Quarter boundary months ───────────────────────────────────────────────────

const QUARTER_START_MONTHS = new Set([3, 6, 9]) // April, July, October

function ActivityGrid({
  type,
  grid,
  monthPositions,
  totalWeeks,
  showMonthLabels,
  currentWeekStart,
  onSelect,
  onCellHover,
  onCellLeave,
}: {
  type: ActivityType
  grid: DayData[][]
  monthPositions: { month: number; col: number }[]
  totalWeeks: number
  showMonthLabels: boolean
  currentWeekStart: number
  onSelect: (id: number) => void
  onCellHover: (activity: StravaActivity, x: number, y: number) => void
  onCellLeave: () => void
}) {
  const colors = getActivityColor(type)

  // Count total for the year
  let total = 0
  for (const week of grid) {
    for (const day of week) {
      if (!day.inYear) continue
      if (day.activities.some((a) => mapStravaType(a.sport_type || a.type) === type)) total++
    }
  }

  // Quarter divider positions — cols where Q2/Q3/Q4 begin
  const quarterCols = monthPositions
    .filter(({ month }) => QUARTER_START_MONTHS.has(month))
    .map(({ col }) => col)

  return (
    <div>
      {/* Lane header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: DAY_LABEL_WIDTH }}>
        <span style={{ fontSize: 16 }}>{colors.emoji}</span>
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {colors.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 2 }}>
          {total} this year
        </span>
      </div>

      {/* Month labels */}
      {showMonthLabels && (
        <div style={{ marginLeft: DAY_LABEL_WIDTH, marginBottom: 4, position: 'relative', height: 14 }}>
          {monthPositions.map(({ month, col }) => (
            <span
              key={month}
              style={{
                position: 'absolute',
                left: `calc(${(col / totalWeeks) * 100}%)`,
                fontSize: 10,
                color: QUARTER_START_MONTHS.has(month)
                  ? 'var(--color-text-secondary)'
                  : 'var(--color-text-tertiary)',
                fontWeight: QUARTER_START_MONTHS.has(month) ? 700 : 600,
                whiteSpace: 'nowrap',
                letterSpacing: '0.04em',
              }}
            >
              {MONTH_LABELS[month]}
            </span>
          ))}
        </div>
      )}

      {/* Day rows with quarter dividers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {DAY_LABELS.map((dayLabel, di) => (
          <div key={di} style={{ display: 'flex', alignItems: 'stretch', width: '100%', marginBottom: 3 }}>
            <div style={{
              width: DAY_LABEL_WIDTH,
              fontSize: 9,
              color: 'var(--color-text-tertiary)',
              fontWeight: 600,
              textAlign: 'right',
              paddingRight: 6,
              flexShrink: 0,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
            }}>
              {dayLabel}
            </div>
            <div style={{ display: 'flex', flex: 1, gap: 3 }}>
              {grid.map((week, wi) => {
                const isQuarterStart = quarterCols.includes(wi)
                const day = week[di]
                const matching = day.inYear
                  ? day.activities.filter((a) => mapStravaType(a.sport_type || a.type) === type)
                  : []
                const hasActivity = matching.length > 0
                const isCurrentWeek = week[0].date.getTime() === currentWeekStart

                return (
                  <React.Fragment key={wi}>
                    {/* Inline quarter divider — perfectly centred in its own space */}
                    {isQuarterStart && (
                      <div
                        aria-hidden
                        style={{
                          width: 2,
                          borderRadius: 1,
                          background: 'var(--color-text-tertiary, #9ca3af)',
                          opacity: 0.35,
                          flexShrink: 0,
                          margin: '0 5px',
                          alignSelf: 'stretch',
                        }}
                      />
                    )}
                    {!day.inYear ? (
                      <div style={{ flex: 1, aspectRatio: '1', borderRadius: 3, background: 'transparent' }} />
                    ) : (
                      <div
                        onClick={() => matching[0] && onSelect(matching[0].id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.7'
                          if (matching[0]) {
                            onCellHover(matching[0], e.clientX, e.clientY)
                          }
                        }}
                        onMouseMove={(e) => {
                          if (matching[0]) {
                            onCellHover(matching[0], e.clientX, e.clientY)
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1'
                          onCellLeave()
                        }}
                        style={{
                          flex: 1,
                          aspectRatio: '1',
                          borderRadius: 3,
                          background: hasActivity ? colors.hex : isCurrentWeek ? 'var(--color-today-bg)' : 'var(--color-border-light, #e5e7eb)',
                          cursor: hasActivity ? 'pointer' : 'default',
                          transition: 'opacity 80ms ease',
                          minWidth: 0,
                        }}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
