import { format } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { matchActualToPlanned, STATUS_ICONS, STATUS_COLORS, getPlannedActivityEmoji, getPlannedActivityLabel, secondsToPaceString, speedToSecondsPerMile } from '../../utils/planningUtils'
import { mapStravaType, getActivityColor } from '../../utils/activityColors'
import type { PlannedActivity } from '../../store/types'
import type { StravaActivity } from '../../store/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  date: Date
  planned: PlannedActivity[]
  actuals: StravaActivity[]
  onSelectActivity: (id: number) => void
  compact?: boolean
}

export default function WeekReviewCell({ date, planned, actuals, onSelectActivity, compact }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cellDate = new Date(date)
  cellDate.setHours(0, 0, 0, 0)
  const isFuture = cellDate > today
  const matchResults = matchActualToPlanned(planned, actuals)

  const dayIndex = date.getDay()
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  // Find unplanned actuals (not matched to any planned)
  const matchedIds = new Set(
    matchResults.map((r) => r.actualActivityId).filter(Boolean)
  )
  const unplannedActuals = actuals.filter((a) => !matchedIds.has(a.id))

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        background: isToday ? 'var(--color-today-bg)' : 'var(--color-surface)',
      }}>
        {/* Day label */}
        <div style={{
          width: 44,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 2,
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: isToday ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          }}>{DAY_LABELS[dayIndex]}</span>
          {isToday ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              marginTop: 1,
            }}>{format(date, 'd')}</span>
          ) : (
            <span style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              marginTop: 1,
            }}>{format(date, 'd')}</span>
          )}
        </div>

        {/* Content: planned + actual inline */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Planned pills */}
          {matchResults.map((result) => {
            const colors = isFuture
              ? { bg: 'var(--color-bg)', border: 'var(--color-border)', text: 'var(--color-text-secondary)' }
              : STATUS_COLORS[result.status]
            return (
              <div
                key={result.planned.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px',
                  borderRadius: 5,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  fontSize: 11,
                }}
              >
                <span style={{ fontSize: 11 }}>
                  {getPlannedActivityEmoji(result.planned)}
                </span>
                <span style={{
                  flex: 1,
                  color: colors.text,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 11,
                }}>
                  {getPlannedActivityLabel(result.planned)}
                </span>
                {!isFuture && result.status !== 'unplanned' && (
                  <span style={{ fontSize: 10, flexShrink: 0 }}>
                    {STATUS_ICONS[result.status]}
                  </span>
                )}
              </div>
            )
          })}
          {planned.length === 0 && !isFuture && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              No plan
            </span>
          )}

          {/* Actual pills */}
          {actuals.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: matchResults.length > 0 ? 2 : 0 }}>
              {actuals.map((activity) => {
                const atype = mapStravaType(activity.sport_type || activity.type)
                const colors = getActivityColor(atype)
                const isRun = atype === 'Run'
                const distMi = activity.distance > 0
                  ? ` · ${(activity.distance / 1609.344).toFixed(1)}mi`
                  : ''
                const pace = isRun && activity.average_speed > 0
                  ? ` · ${secondsToPaceString(speedToSecondsPerMile(activity.average_speed))}/mi`
                  : ''
                return (
                  <button
                    key={activity.id}
                    onClick={() => onSelectActivity(activity.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 8px',
                      borderRadius: 5,
                      background: colors.light,
                      border: `1px solid ${colors.hex}33`,
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{colors.emoji}</span>
                    <span style={{
                      flex: 1,
                      color: colors.hex,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {activity.name}
                      {distMi && <span style={{ opacity: 0.75 }}>{distMi}</span>}
                      {pace && <span style={{ opacity: 0.75 }}>{pace}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {actuals.length === 0 && !isFuture && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              borderRadius: 5,
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              fontSize: 11,
            }}>
              <span style={{ fontSize: 11 }}>😴</span>
              <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Rest</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    >
      {/* Day header */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--color-border)',
          background: isToday ? 'var(--color-accent-light)' : 'var(--color-bg)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isToday ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          }}
        >
          {DAY_LABELS[dayIndex]}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: isToday ? 700 : 500,
            color: isToday ? 'var(--color-accent)' : 'var(--color-text-primary)',
            marginTop: 1,
          }}
        >
          {format(date, 'MMM d')}
        </div>
      </div>

      {/* Planned section — fixed height so Actual always starts at the same position */}
      <div
        style={{
          padding: '12px 12px 8px',
          height: 200,
          overflow: 'auto',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 7,
          }}
        >
          Planned
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {matchResults.map((result, i) => {
            const colors = isFuture
              ? { bg: 'var(--color-bg)', border: 'var(--color-border)', text: 'var(--color-text-secondary)' }
              : STATUS_COLORS[result.status]
            return (
              <div
                key={result.planned.id}
                title={isFuture ? undefined : result.notes}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 8px',
                  borderRadius: 5,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  fontSize: 11,
                }}
              >
                <span style={{ fontSize: 11 }}>
                  {getPlannedActivityEmoji(result.planned)}
                </span>
                <span
                  title={getPlannedActivityLabel(result.planned)}
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                  }}
                >
                  {getPlannedActivityLabel(result.planned)}
                </span>
                {!isFuture && result.status !== 'unplanned' && (
                  <span style={{ fontSize: 10, flexShrink: 0 }}>
                    {STATUS_ICONS[result.status]}
                  </span>
                )}
              </div>
            )
          })}
          {planned.length === 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                fontStyle: 'italic',
              }}
            >
              No plan
            </div>
          )}
        </div>
      </div>

      {/* Actual section */}
      <div style={{ padding: '10px 12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 7,
            marginTop: 28,
            paddingTop: 10,
            borderTop: '1px dashed var(--color-border)',
          }}
        >
          Actual
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {actuals.map((activity) => {
            const atype = mapStravaType(activity.sport_type || activity.type)
            const colors = getActivityColor(atype)
            const isRun = atype === 'Run'
            const distMi = activity.distance > 0
              ? ` · ${(activity.distance / 1609.344).toFixed(1)}mi`
              : ''
            const pace = isRun && activity.average_speed > 0
              ? ` · ${secondsToPaceString(speedToSecondsPerMile(activity.average_speed))}/mi`
              : ''
            return (
              <button
                key={activity.id}
                onClick={() => onSelectActivity(activity.id)}
                title={`${activity.name}${distMi}${pace}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 8px',
                  borderRadius: 5,
                  background: colors.light,
                  border: `1px solid ${colors.hex}33`,
                  fontSize: 11,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ fontSize: 11 }}>{colors.emoji}</span>
                <span
                  style={{
                    flex: 1,
                    color: colors.hex,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activity.name}
                  {distMi && (
                    <span style={{ opacity: 0.75 }}>{distMi}</span>
                  )}
                  {pace && (
                    <span style={{ opacity: 0.75 }}>{pace}</span>
                  )}
                </span>
              </button>
            )
          })}
          {actuals.length === 0 && !isFuture && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 8px',
                borderRadius: 5,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                fontSize: 11,
              }}
            >
              <span style={{ fontSize: 11 }}>😴</span>
              <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 500 }}>Rest</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
