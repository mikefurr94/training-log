import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useActivityDetail } from '../../hooks/useActivityDetail'
import { useActivityStreams } from '../../hooks/useActivityStreams'
import { mapStravaType, getActivityColor } from '../../utils/activityColors'
import { stravaActivityUrl } from '../../api/strava'
import { formatDistance, formatDuration } from '../../utils/formatters'
import RunDetails from './RunDetails'

export default function ActivityPanel() {
  const isPanelOpen = useAppStore((s) => s.isPanelOpen)
  const selectedId = useAppStore((s) => s.selectedActivityId)
  const closePanel = useAppStore((s) => s.closePanel)
  const distanceUnit = useAppStore((s) => s.distanceUnit)

  // Find the activity summary from the store
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)
  const summary = Object.values(activitiesByDate)
    .flat()
    .find((a) => a.id === selectedId) ?? null

  const { detail, isLoading: detailLoading } = useActivityDetail(selectedId)
  const { streams, isLoading: streamsLoading } = useActivityStreams(
    detail && mapStravaType(detail.sport_type || detail.type) === 'Run' ? selectedId : null
  )

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const activityType = summary
    ? mapStravaType(summary.sport_type || summary.type)
    : null
  const colors = activityType ? getActivityColor(activityType) : null

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closePanel}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.2)',
              backdropFilter: 'blur(1px)',
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              maxWidth: '92vw',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-panel)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              flexShrink: 0,
            }}>
              {/* Activity type badge */}
              {colors && (
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: colors.light,
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {colors.emoji}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: 3,
                }}>
                  {summary?.name ?? 'Activity'}
                </h2>
                {summary && (
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}>
                    <span>{format(parseISO(summary.start_date_local), 'EEEE, MMMM d, yyyy')}</span>
                    <span>·</span>
                    <span>{format(parseISO(summary.start_date_local), 'h:mm a')}</span>
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={closePanel}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 20,
                  flexShrink: 0,
                  transition: 'all var(--transition-fast)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }}
              >
                ×
              </button>
            </div>

            {/* Panel body */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}>
              {detailLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[120, 160, 200, 80].map((h, i) => (
                    <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-md)' }} />
                  ))}
                </div>
              ) : detail ? (
                <>
                  {activityType === 'Run' ? (
                    <RunDetails
                      detail={detail}
                      streams={streams ?? null}
                      streamsLoading={streamsLoading}
                    />
                  ) : (
                    <GenericDetails detail={detail} distanceUnit={distanceUnit} />
                  )}

                  {/* Strava link */}
                  <a
                    href={stravaActivityUrl(detail.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      background: 'var(--color-strava)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      textDecoration: 'none',
                      transition: 'background var(--transition-fast)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-strava-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-strava)')}
                  >
                    <StravaIcon />
                    View on Strava ↗
                  </a>
                </>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function GenericDetails({ detail, distanceUnit }: { detail: any; distanceUnit: 'mi' | 'km' }) {
  const items = [
    { label: 'Duration', value: formatDuration(detail.moving_time) },
    detail.distance > 0 && { label: 'Distance', value: formatDistance(detail.distance, distanceUnit) },
    detail.total_elevation_gain > 0 && { label: 'Elevation Gain', value: `${Math.round(detail.total_elevation_gain * 3.28084)} ft` },
    detail.average_heartrate && { label: 'Avg HR', value: `${Math.round(detail.average_heartrate)} bpm` },
    detail.calories && { label: 'Calories', value: `${detail.calories} kcal` },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
    }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 4,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.5px',
          }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function StravaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  )
}
