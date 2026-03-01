import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { getCoachDayDetail } from '../../api/coach'
import CoachActivityBadge from './CoachActivityBadge'
import type { CoachDay, CoachWeek, CoachPlannedActivity } from '../../store/types'

interface Props {
  day: CoachDay
  week: CoachWeek
  onClose: () => void
}

export default function CoachDayDetailPanel({ day, week, onClose }: Props) {
  const isMobile = useIsMobile()
  const coachPlan = useAppStore((s) => s.coachPlan)
  const markDayDetailGenerated = useAppStore((s) => s.markDayDetailGenerated)
  const skipCoachActivity = useAppStore((s) => s.skipCoachActivity)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const date = parseISO(day.date)

  async function handleLoadDetail(activity: CoachPlannedActivity) {
    if (!coachPlan || activity.detail) return
    setLoadingId(activity.id)
    try {
      const detail = await getCoachDayDetail(
        coachPlan.id,
        day.date,
        { weekNumber: week.weekNumber, phase: week.phase, summary: week.summary },
        {
          label: activity.label,
          targetDistanceMiles: activity.targetDistanceMiles,
          intensity: activity.intensity,
        }
      )
      markDayDetailGenerated(day.date, detail, activity.id)
    } catch (err) {
      console.error('Failed to load detail:', err)
    } finally {
      setLoadingId(null)
    }
  }

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

                  {/* Activity info */}
                  <div style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10,
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    {activity.targetDistanceMiles && (
                      <div>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>Distance: </span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {activity.targetDistanceMiles} mi
                        </span>
                      </div>
                    )}
                    {activity.targetPace && (
                      <div>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>Pace: </span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {activity.targetPace}/mi
                        </span>
                      </div>
                    )}
                    {activity.durationMinutes && (
                      <div>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>Duration: </span>
                        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {activity.durationMinutes} min
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detail section */}
                  {activity.detail ? (
                    <div style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      padding: '10px 12px',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}>
                      {activity.detail}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleLoadDetail(activity)}
                      disabled={loadingId === activity.id}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px dashed var(--color-border)',
                        background: 'transparent',
                        color: 'var(--color-accent)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        cursor: loadingId === activity.id ? 'wait' : 'pointer',
                        opacity: loadingId === activity.id ? 0.5 : 1,
                      }}
                    >
                      {loadingId === activity.id ? 'Loading workout details...' : 'Load Workout Details'}
                    </button>
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
