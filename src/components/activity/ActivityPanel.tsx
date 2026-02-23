import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useActivityDetail } from '../../hooks/useActivityDetail'
import { useActivityStreams } from '../../hooks/useActivityStreams'
import { useIsMobile } from '../../hooks/useIsMobile'
import { mapStravaType, getActivityColor } from '../../utils/activityColors'
import { stravaActivityUrl } from '../../api/strava'
import { formatDistance, formatDuration } from '../../utils/formatters'
import RunDetails from './RunDetails'

export default function ActivityPanel() {
  const isPanelOpen = useAppStore((s) => s.isPanelOpen)
  const selectedId = useAppStore((s) => s.selectedActivityId)
  const closePanel = useAppStore((s) => s.closePanel)
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const isMobile = useIsMobile()

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
              position: isMobile ? 'fixed' : 'absolute',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.2)',
              backdropFilter: 'blur(1px)',
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: isMobile ? 'fixed' : 'absolute',
              top: isMobile ? 0 : 0,
              right: isMobile ? 0 : 0,
              bottom: 0,
              left: isMobile ? 0 : undefined,
              width: isMobile ? '100%' : 420,
              maxWidth: isMobile ? '100%' : '92vw',
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
              padding: isMobile ? '12px 16px' : '16px 20px',
              paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : '16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              flexShrink: 0,
            }}>
              {/* Activity type badge */}
              {colors && (
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: colors.light,
                  border: `1px solid ${colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>
                  {colors.emoji}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)', letterSpacing: '-0.3px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3,
                }}>
                  {summary?.name ?? 'Activity'}
                </h2>
                {summary && (
                  <div style={{
                    fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
                    display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
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
                  width: 32, height: 32,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-tertiary)', fontSize: 22, flexShrink: 0,
                  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                }}
              >
                ×
              </button>
            </div>

            {/* Panel body */}
            <div style={{
              flex: 1, overflow: 'auto',
              padding: isMobile ? '16px' : '20px',
              display: 'flex', flexDirection: 'column', gap: 20,
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '12px 16px',
                      background: 'var(--color-strava)', color: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
                      textDecoration: 'none', flexShrink: 0,
                    }}
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {items.map(({ label, value }) => (
        <div key={label} style={{
          background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
          padding: '12px 14px', border: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {label}
          </div>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
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
