import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import CoachActivityBadge from './CoachActivityBadge'
import type { CoachDay, CoachWeek } from '../../store/types'

interface Props {
  day: CoachDay
  week: CoachWeek
  onClose: () => void
}

export default function CoachDayDetailPanel({ day, week, onClose }: Props) {
  const isMobile = useIsMobile()
  const skipCoachActivity = useAppStore((s) => s.skipCoachActivity)
  const date = parseISO(day.date)

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
                    marginBottom: activity.detail ? 10 : 0,
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
                  {activity.detail && (
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      {activity.detail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
