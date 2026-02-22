import { useMemo } from 'react'
import HeartRateChart from './HeartRateChart'
import SplitsTable from './SplitsTable'
import { useAppStore } from '../../store/useAppStore'
import { formatDistance, formatPace, formatHeartRate, formatElevation, formatCalories, formatDuration } from '../../utils/formatters'
import { mapStravaType } from '../../utils/activityColors'
import { computeEffortScore } from '../../utils/effortScore'
import type { StravaActivityDetail, HRStream } from '../../store/types'

interface StatProps {
  label: string
  value: string
  accent?: boolean
}

function Stat({ label, value, accent }: StatProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: 'var(--font-weight-bold)',
        color: accent ? 'var(--color-accent)' : 'var(--color-text-primary)',
        letterSpacing: '-0.5px',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  )
}

interface Props {
  detail: StravaActivityDetail
  streams: HRStream | null
  streamsLoading: boolean
}

export default function RunDetails({ detail, streams, streamsLoading }: Props) {
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)

  // Use metric splits for km, standard for miles
  const splits = distanceUnit === 'km' ? detail.splits_metric : detail.splits_standard

  const effort = useMemo(() => {
    const allRuns = Object.values(activitiesByDate)
      .flat()
      .filter((a) => mapStravaType(a.sport_type || a.type) === 'Run')
    return computeEffortScore(detail, allRuns, streams)
  }, [activitiesByDate, detail, streams])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Key stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        border: '1px solid var(--color-border)',
      }}>
        <Stat
          label="Distance"
          value={formatDistance(detail.distance, distanceUnit)}
          accent
        />
        <Stat
          label="Pace"
          value={formatPace(detail.average_speed, distanceUnit)}
        />
        <Stat
          label="Duration"
          value={formatDuration(detail.moving_time)}
        />
        <Stat
          label="Elevation"
          value={formatElevation(detail.total_elevation_gain, distanceUnit)}
        />
        <Stat
          label="Avg HR"
          value={formatHeartRate(detail.average_heartrate)}
        />
        <Stat
          label="Max HR"
          value={formatHeartRate(detail.max_heartrate)}
        />
      </div>

      {/* Effort score */}
      <div style={{
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <div style={{
            fontSize: 9,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Effort Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: effort.color,
              letterSpacing: '-0.5px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {effort.score}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: effort.color,
            }}>
              {effort.label}
            </span>
          </div>
        </div>
        {/* Bar gauge */}
        <div style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--color-border)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${effort.score}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg, #22c55e, #f59e0b, #f97316, #ef4444)`,
            backgroundSize: `${10000 / Math.max(effort.score, 1)}% 100%`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Heart rate chart */}
      <HeartRateChart streams={streams} isLoading={streamsLoading} />

      {/* Splits */}
      <SplitsTable splits={splits} />
    </div>
  )
}
