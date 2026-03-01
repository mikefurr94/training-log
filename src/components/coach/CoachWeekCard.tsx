import { format, parseISO, addDays, isBefore, isAfter } from 'date-fns'
import type { CoachWeek } from '../../store/types'
import { PHASE_COLORS, PHASE_LABELS } from '../../utils/coachUtils'
import { getActivityColor } from '../../utils/activityColors'

interface Props {
  week: CoachWeek
  isExpanded: boolean
  isCurrent: boolean
  onClick: () => void
}

export default function CoachWeekCard({ week, isExpanded, isCurrent, onClick }: Props) {
  const weekStart = parseISO(week.weekStart)
  const weekEnd = addDays(weekStart, 6)
  const phaseColor = PHASE_COLORS[week.phase] ?? 'var(--color-text-tertiary)'
  const today = new Date()
  const isPast = isBefore(weekEnd, today)

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        border: isCurrent
          ? `2px solid ${phaseColor}`
          : '1px solid var(--color-border)',
        background: isExpanded ? 'var(--color-accent-light)' : isCurrent ? 'var(--color-surface)' : 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        opacity: isPast && !isCurrent ? 0.6 : 1,
      }}
    >
      {/* Week number */}
      <div style={{
        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
        background: phaseColor, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {week.weekNumber}
      </div>

      {/* Week info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}>
          <span>{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}</span>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-full)',
            background: phaseColor + '18', color: phaseColor,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {PHASE_LABELS[week.phase] ?? week.phase}
          </span>
          {isCurrent && (
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent)', color: '#fff',
              fontWeight: 700,
            }}>
              Current
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--color-text-tertiary)',
          marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {week.summary}
        </div>
      </div>

      {/* Miles */}
      <div style={{
        fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {week.totalMiles} mi
      </div>

      {/* Activity dots */}
      <div style={{
        display: 'flex', gap: 3, flexShrink: 0,
      }}>
        {week.days.map((day) =>
          day.activities.length > 0 ? (
            <div key={day.date} style={{ display: 'flex', gap: 1 }}>
              {day.activities.map((a) => (
                <div
                  key={a.id}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: a.skipped ? 'var(--color-border)' : getActivityColor(a.type).bg,
                  }}
                />
              ))}
            </div>
          ) : (
            <div key={day.date} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--color-border)', opacity: 0.3,
            }} />
          )
        )}
      </div>

      {/* Expand indicator */}
      <span style={{
        fontSize: 14, color: 'var(--color-text-tertiary)',
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 150ms',
        flexShrink: 0,
      }}>
        ▾
      </span>
    </button>
  )
}
