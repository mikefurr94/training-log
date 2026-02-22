import { useAppStore } from '../../store/useAppStore'
import { splitPace, formatDuration, formatHeartRate, formatElevation } from '../../utils/formatters'
import type { Split } from '../../store/types'

interface Props {
  splits: Split[]
}

export default function SplitsTable({ splits }: Props) {
  const distanceUnit = useAppStore((s) => s.distanceUnit)

  if (!splits || splits.length === 0) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--font-size-sm)',
      }}>
        No split data available
      </div>
    )
  }

  // Find fastest split (by pace)
  const paces = splits.map((s) => (s.distance > 0 ? s.elapsed_time / s.distance : Infinity))
  const fastestIdx = paces.indexOf(Math.min(...paces))

  return (
    <div>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}>
        Splits ({distanceUnit})
      </div>

      <div style={{ overflow: 'hidden', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--font-size-sm)',
        }}>
          <thead>
            <tr style={{
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              {['#', 'Pace', 'Time', 'Elev', 'HR'].map((col) => (
                <th key={col} style={{
                  padding: '7px 10px',
                  textAlign: col === '#' ? 'center' : 'right',
                  fontSize: 10,
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {splits.map((split, i) => {
              const isFastest = i === fastestIdx
              const isPartial = split.distance < (distanceUnit === 'mi' ? 1600 : 950)

              return (
                <tr
                  key={i}
                  style={{
                    background: isFastest
                      ? 'var(--color-accent-light)'
                      : i % 2 === 0
                      ? 'var(--color-surface)'
                      : 'var(--color-bg)',
                    borderLeft: isFastest ? '3px solid var(--color-accent)' : '3px solid transparent',
                    opacity: isPartial ? 0.6 : 1,
                  }}
                >
                  <td style={{
                    padding: '7px 10px',
                    textAlign: 'center',
                    color: isFastest ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontWeight: isFastest ? 'var(--font-weight-semibold)' : 'normal',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    {split.split}
                    {isFastest && <span style={{ marginLeft: 2, fontSize: 9 }}>⚡</span>}
                  </td>
                  <td style={{
                    padding: '7px 10px',
                    textAlign: 'right',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {splitPace(split.distance, split.elapsed_time, distanceUnit)}
                  </td>
                  <td style={{
                    padding: '7px 10px',
                    textAlign: 'right',
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    {formatDuration(split.moving_time)}
                  </td>
                  <td style={{
                    padding: '7px 10px',
                    textAlign: 'right',
                    color: split.elevation_difference > 0 ? '#f97316' : split.elevation_difference < -2 ? '#10b981' : 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-xs)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {split.elevation_difference > 0 ? '↑' : split.elevation_difference < -2 ? '↓' : '—'}
                    {Math.abs(split.elevation_difference) > 1
                      ? formatElevation(Math.abs(split.elevation_difference), distanceUnit)
                      : ''}
                  </td>
                  <td style={{
                    padding: '7px 10px',
                    textAlign: 'right',
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-xs)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatHeartRate(split.average_heartrate)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
