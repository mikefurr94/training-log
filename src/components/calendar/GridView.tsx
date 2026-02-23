import React from 'react'
import { format, startOfYear, endOfYear, eachWeekOfInterval, addDays } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { mapStravaType, getActivityColor, ALL_ACTIVITY_TYPES } from '../../utils/activityColors'
import type { ActivityType } from '../../utils/activityColors'
import type { StravaActivity } from '../../store/types'

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

export default function GridView({ anchor, activitiesByDate }: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const selectActivity = useAppStore((s) => s.selectActivity)
  const isMobile = useIsMobile()

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

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      padding: isMobile ? '8px 8px 24px' : '20px 24px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 20 : 32,
      WebkitOverflowScrolling: 'touch' as any,
    }}>
      {activeTypes.map((type) => (
        <ActivityGrid
          key={type}
          type={type}
          grid={grid}
          monthPositions={monthPositions}
          totalWeeks={totalWeeks}
          showMonthLabels={true}
          onSelect={selectActivity}
          isMobile={isMobile}
        />
      ))}

      {activeTypes.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          No activity types selected. Use the filters above to show activities.
        </div>
      )}
    </div>
  )
}

// Quarter boundary months (month index where a new quarter starts, excluding Q1=Jan)
const QUARTER_START_MONTHS = new Set([3, 6, 9]) // April, July, October

function ActivityGrid({
  type,
  grid,
  monthPositions,
  totalWeeks,
  showMonthLabels,
  onSelect,
  isMobile,
}: {
  type: ActivityType
  grid: DayData[][]
  monthPositions: { month: number; col: number }[]
  totalWeeks: number
  showMonthLabels: boolean
  onSelect: (id: number) => void
  isMobile: boolean
}) {
  const colors = getActivityColor(type)
  const dayLabelWidth = isMobile ? 14 : DAY_LABEL_WIDTH

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
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 5 : 8, marginBottom: isMobile ? 4 : 8, marginLeft: dayLabelWidth }}>
        <span style={{ fontSize: isMobile ? 13 : 16 }}>{colors.emoji}</span>
        <span style={{ fontSize: isMobile ? 11 : 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {colors.label}
        </span>
        <span style={{ fontSize: isMobile ? 9 : 11, color: 'var(--color-text-tertiary)', marginLeft: 2 }}>
          {total} this year
        </span>
      </div>

      {/* Month labels */}
      {showMonthLabels && (
        <div style={{ marginLeft: dayLabelWidth, marginBottom: isMobile ? 2 : 4, position: 'relative', height: isMobile ? 10 : 14 }}>
          {monthPositions.map(({ month, col }) => (
            <span
              key={month}
              style={{
                position: 'absolute',
                left: `calc(${(col / totalWeeks) * 100}%)`,
                fontSize: isMobile ? 7 : 10,
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
          <div key={di} style={{ display: 'flex', alignItems: 'stretch', width: '100%', marginBottom: isMobile ? 1 : 3 }}>
            <div style={{
              width: dayLabelWidth,
              fontSize: isMobile ? 7 : 9,
              color: 'var(--color-text-tertiary)',
              fontWeight: 600,
              textAlign: 'right',
              paddingRight: isMobile ? 3 : 6,
              flexShrink: 0,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
            }}>
              {dayLabel}
            </div>
            <div style={{ display: 'flex', flex: 1, gap: isMobile ? 1 : 3 }}>
              {grid.map((week, wi) => {
                const isQuarterStart = quarterCols.includes(wi)
                const day = week[di]
                const matching = day.inYear
                  ? day.activities.filter((a) => mapStravaType(a.sport_type || a.type) === type)
                  : []
                const hasActivity = matching.length > 0

                return (
                  <React.Fragment key={wi}>
                    {/* Inline quarter divider */}
                    {isQuarterStart && !isMobile && (
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
                      <div style={{ flex: 1, aspectRatio: '1', borderRadius: isMobile ? 1 : 3, background: 'transparent' }} />
                    ) : (
                      <div
                        title={`${format(day.date, 'EEE, MMM d')}${hasActivity ? ` · ${colors.label}` : ''}`}
                        onClick={() => matching[0] && onSelect(matching[0].id)}
                        style={{
                          flex: 1,
                          aspectRatio: '1',
                          borderRadius: isMobile ? 1 : 3,
                          background: hasActivity ? colors.hex : 'var(--color-border-light, #e5e7eb)',
                          cursor: hasActivity ? 'pointer' : 'default',
                          transition: 'opacity 80ms ease',
                          minWidth: 0,
                        }}
                        onMouseEnter={(e) => { if (hasActivity) e.currentTarget.style.opacity = '0.7' }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
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
