import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useAppStore } from '../../store/useAppStore'
import { metersToMiles, metersToKm } from '../../utils/formatters'
import type { HRStream } from '../../store/types'

interface Props {
  streams: HRStream | null
  isLoading: boolean
}

interface ChartPoint {
  distance: number
  hr: number
}

// Sample data for performance (max 200 points)
function sampleData(data: ChartPoint[], maxPoints: number): ChartPoint[] {
  if (data.length <= maxPoints) return data
  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, i) => i % step === 0)
}

export default function HeartRateChart({ streams, isLoading }: Props) {
  const distanceUnit = useAppStore((s) => s.distanceUnit)

  if (isLoading) {
    return (
      <div style={{ height: 160 }}>
        <div className="skeleton" style={{ height: '100%', borderRadius: 'var(--radius-md)' }} />
      </div>
    )
  }

  if (!streams || streams.heartrate.length === 0) {
    return (
      <div style={{
        height: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
        color: 'var(--color-text-tertiary)',
        fontSize: 'var(--font-size-sm)',
        gap: 6,
      }}>
        <span>💓</span>
        No heart rate data available
      </div>
    )
  }

  // Build chart data
  const raw: ChartPoint[] = streams.heartrate.map((hr, i) => ({
    distance: streams.distance[i] ?? 0,
    hr,
  }))

  const data = sampleData(raw, 200)

  const convertDist = (m: number) =>
    distanceUnit === 'mi' ? metersToMiles(m) : metersToKm(m)

  const chartData = data.map((p) => ({
    dist: parseFloat(convertDist(p.distance).toFixed(2)),
    hr: p.hr,
  }))

  const hrValues = streams.heartrate
  const minHR = Math.max(40, Math.min(...hrValues) - 10)
  const maxHR = Math.min(220, Math.max(...hrValues) + 10)
  const avgHR = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <span style={{
          fontSize: 'var(--font-size-xs)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Heart Rate
        </span>
        <span style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          fontWeight: 500,
        }}>
          avg <strong style={{ color: '#ef4444' }}>{avgHR}</strong> bpm
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="dist"
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v} ${distanceUnit}`}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minHR, maxHR]}
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}`}
            width={40}
          />
          <ReferenceLine
            y={avgHR}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const { dist, hr } = payload[0].payload
              return (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  fontSize: 'var(--font-size-xs)',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  <div style={{ color: '#ef4444', fontWeight: 600 }}>{hr} bpm</div>
                  <div style={{ color: 'var(--color-text-tertiary)' }}>{dist} {distanceUnit}</div>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="hr"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#hrGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
