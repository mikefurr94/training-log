import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useWeather } from '../../hooks/useWeather'
import { getWeatherIcon } from '../../api/weather'
import CoachActivityBadge from './CoachActivityBadge'
import type { CoachDay, CoachWeek, CoachPlannedActivity } from '../../store/types'

function getActivityDetail(a: CoachPlannedActivity): string {
  if (a.detail) return a.detail
  if (a.type === 'Rest') return 'Rest'
  if (a.type === 'Yoga') return a.durationMinutes ? `${a.durationMinutes} min yoga` : 'Yoga'
  if (a.type === 'WeightTraining') return a.durationMinutes ? `${a.durationMinutes} min ${a.label.toLowerCase()}` : a.label
  // Runs
  const parts: string[] = []
  if (a.targetDistanceMiles) parts.push(`${a.targetDistanceMiles} mi`)
  if (a.targetPace) parts.push(`@ ${a.targetPace}/mi`)
  if (parts.length > 0) return parts.join(' ')
  if (a.durationMinutes) return `${a.durationMinutes} min ${a.label.toLowerCase()}`
  return a.label
}

interface Props {
  day: CoachDay
  week: CoachWeek
  onClose: () => void
}

export default function CoachDayDetailPanel({ day, week, onClose }: Props) {
  const isMobile = useIsMobile()
  const skipCoachActivity = useAppStore((s) => s.skipCoachActivity)
  const weatherByDate = useWeather()
  const date = parseISO(day.date)

  const hasRun = day.activities.some((a) => a.type === 'Run')
  const weather = weatherByDate[day.date]

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 150,
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: isMobile ? '100%' : 420,
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 151,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h3 style={{
              margin: 0, fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}>
              {format(date, 'EEEE, MMMM d')}
            </h3>
            <p style={{
              margin: '2px 0 0', fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}>
              Week {week.weekNumber} — {week.phase} phase
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)', fontSize: 20, lineHeight: 1,
          }}>x</button>
        </div>

        {/* 7am weather for run days */}
        {hasRun && weather && (
          <div style={{
            padding: '10px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>{getWeatherIcon(weather.weatherCode).icon}</span>
            <span>
              {weather.feelsLikeAt7am != null
                ? `Feels like ${weather.feelsLikeAt7am}° at 7am`
                : `Feels like ${weather.feelsLikeLow}°–${weather.feelsLikeHigh}°`}
            </span>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {day.activities.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 40,
              color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)',
            }}>
              Rest day — no activities planned
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {day.activities.map((activity) => (
                <div key={activity.id} style={{
                  padding: 14, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                }}>
                  {/* Activity header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 10,
                  }}>
                    <CoachActivityBadge activity={activity} />
                    <button
                      onClick={() => skipCoachActivity(day.date, activity.id)}
                      style={{
                        fontSize: 10, padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                        background: activity.skipped ? 'var(--color-accent-light)' : 'transparent',
                        color: activity.skipped ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                        cursor: 'pointer', fontWeight: 500,
                      }}
                    >
                      {activity.skipped ? 'Unskip' : 'Skip'}
                    </button>
                  </div>

                  {/* Inline workout detail */}
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}>
                    {getActivityDetail(activity)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
