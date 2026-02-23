import { useMemo } from 'react'
import {
  startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval,
  startOfYear, endOfYear, isWithinInterval, parseISO
} from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine
} from 'recharts'
import { useAppStore } from '../store/useAppStore'
import { useDashboardData } from '../hooks/useDashboardData'
import { useIsMobile } from '../hooks/useIsMobile'
import { mapStravaType, getActivityColor, ACTIVITY_COLORS } from '../utils/activityColors'
import { metersToMiles, formatDuration } from '../utils/formatters'
import type { StravaActivity } from '../store/types'
import type { ActivityType } from '../utils/activityColors'

const WEEKS_TO_SHOW = 16

interface WeekStats {
  label: string       // "Feb 3"
  weekOf: string      // ISO
  runs: number
  miles: number
  weights: number
  yoga: number
  tennis: number
  totalActivities: number
  totalTime: number   // seconds
}

function buildWeekStats(
  activitiesByDate: Record<string, StravaActivity[]>,
  weeksBack: number
): WeekStats[] {
  const today = new Date()
  const stats: WeekStats[] = []

  for (let w = weeksBack - 1; w >= 0; w--) {
    const anchor = subWeeks(today, w)
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(anchor, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    let runs = 0, miles = 0, weights = 0, yoga = 0, tennis = 0
    let totalActivities = 0, totalTime = 0

    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      const acts = activitiesByDate[key] ?? []
      for (const a of acts) {
        const type = mapStravaType(a.sport_type || a.type)
        totalActivities++
        totalTime += a.moving_time ?? 0
        if (type === 'Run') { runs++; miles += metersToMiles(a.distance ?? 0) }
        else if (type === 'WeightTraining') weights++
        else if (type === 'Yoga') yoga++
        else if (type === 'Tennis') tennis++
      }
    }

    stats.push({
      label: format(weekStart, 'MMM d'),
      weekOf: format(weekStart, 'yyyy-MM-dd'),
      runs, miles: parseFloat(miles.toFixed(1)),
      weights, yoga, tennis,
      totalActivities, totalTime,
    })
  }
  return stats
}

export default function DashboardPage() {
  // Fetch the full date range the dashboard needs (YTD + 16 weeks)
  const activitiesByDate = useDashboardData()
  const distanceUnit = useAppStore((s) => s.distanceUnit)
  const isMobile = useIsMobile()

  const weekStats = useMemo(
    () => buildWeekStats(activitiesByDate, WEEKS_TO_SHOW),
    [activitiesByDate]
  )

  // Current week + last week for comparison cards
  const thisWeek = weekStats[weekStats.length - 1]
  const lastWeek = weekStats[weekStats.length - 2]

  // Year-to-date totals
  const today = new Date()
  const yearStart = startOfYear(today)
  const ytdActivities = Object.values(activitiesByDate).flat().filter((a) => {
    const d = parseISO(a.start_date_local)
    return isWithinInterval(d, { start: yearStart, end: today })
  })

  const ytdRuns = ytdActivities.filter((a) => mapStravaType(a.sport_type || a.type) === 'Run')
  const ytdMiles = ytdRuns.reduce((s, a) => s + metersToMiles(a.distance ?? 0), 0)
  const ytdWeights = ytdActivities.filter((a) => mapStravaType(a.sport_type || a.type) === 'WeightTraining').length
  const ytdYoga = ytdActivities.filter((a) => mapStravaType(a.sport_type || a.type) === 'Yoga').length
  const ytdTennis = ytdActivities.filter((a) => mapStravaType(a.sport_type || a.type) === 'Tennis').length

  // Average miles/week (non-zero weeks only)
  const nonZeroWeeks = weekStats.filter((w) => w.runs > 0)
  const avgMilesPerWeek = nonZeroWeeks.length
    ? nonZeroWeeks.reduce((s, w) => s + w.miles, 0) / nonZeroWeeks.length
    : 0

  const chartInterval = isMobile ? 3 : 1

  return (
    <div style={{
      padding: isMobile ? '16px 12px 24px' : '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 20 : 28,
      maxWidth: 1100,
      margin: '0 auto',
      width: '100%',
    }}>

      {/* ── Section: This week summary cards ── */}
      <section>
        <SectionHeader title="This Week" subtitle={thisWeek ? `Week of ${thisWeek.label}` : ''} isMobile={isMobile} />
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12 }}>
          <StatCard
            emoji="🏃" label="Miles Run"
            value={distanceUnit === 'mi' ? thisWeek?.miles.toFixed(1) ?? '0' : (thisWeek?.miles * 1.60934).toFixed(1) ?? '0'}
            unit={distanceUnit}
            delta={thisWeek && lastWeek ? thisWeek.miles - lastWeek.miles : undefined}
            deltaLabel="vs last week" color={ACTIVITY_COLORS.Run.hex} isMobile={isMobile}
          />
          <StatCard
            emoji="🏃" label="Runs" value={String(thisWeek?.runs ?? 0)} unit="sessions"
            delta={thisWeek && lastWeek ? thisWeek.runs - lastWeek.runs : undefined}
            deltaLabel="vs last week" color={ACTIVITY_COLORS.Run.hex} isMobile={isMobile}
          />
          <StatCard
            emoji="🏋️" label="Weights" value={String(thisWeek?.weights ?? 0)} unit="sessions"
            delta={thisWeek && lastWeek ? thisWeek.weights - lastWeek.weights : undefined}
            deltaLabel="vs last week" color={ACTIVITY_COLORS.WeightTraining.hex} isMobile={isMobile}
          />
          <StatCard
            emoji="🎾" label="Tennis" value={String(thisWeek?.tennis ?? 0)} unit="sessions"
            delta={thisWeek && lastWeek ? thisWeek.tennis - lastWeek.tennis : undefined}
            deltaLabel="vs last week" color={ACTIVITY_COLORS.Tennis.hex} isMobile={isMobile}
          />
        </div>
      </section>

      {/* ── Section: Year-to-date totals ── */}
      <section>
        <SectionHeader title={`${format(today, 'yyyy')} Year to Date`} isMobile={isMobile} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
          gap: isMobile ? 8 : 12,
        }}>
          <YTDCard emoji="🏃" label="Total Miles" value={ytdMiles.toFixed(0)} unit={distanceUnit} color={ACTIVITY_COLORS.Run.hex} isMobile={isMobile} />
          <YTDCard emoji="🏃" label="Total Runs" value={String(ytdRuns.length)} unit="runs" color={ACTIVITY_COLORS.Run.hex} isMobile={isMobile} />
          <YTDCard emoji="🏋️" label="Lifts" value={String(ytdWeights)} unit="sessions" color={ACTIVITY_COLORS.WeightTraining.hex} isMobile={isMobile} />
          <YTDCard emoji="🧘" label="Yoga" value={String(ytdYoga)} unit="sessions" color={ACTIVITY_COLORS.Yoga.hex} isMobile={isMobile} />
          <YTDCard emoji="🎾" label="Tennis" value={String(ytdTennis)} unit="sessions" color={ACTIVITY_COLORS.Tennis.hex} isMobile={isMobile} />
        </div>
      </section>

      {/* ── Section: Miles per week chart ── */}
      <section>
        <SectionHeader
          title="Miles per Week"
          subtitle={`${WEEKS_TO_SHOW}-wk avg ${avgMilesPerWeek.toFixed(1)} ${distanceUnit}/wk`}
          isMobile={isMobile}
        />
        <ChartCard isMobile={isMobile}>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
            <BarChart data={weekStats} barSize={isMobile ? 10 : 16} margin={{ top: 4, right: 4, left: isMobile ? -28 : -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: isMobile ? 9 : 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={chartInterval} />
              <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <ReferenceLine y={avgMilesPerWeek} stroke={ACTIVITY_COLORS.Run.hex} strokeDasharray="4 4" strokeOpacity={0.5} />
              <Tooltip content={<MilesTooltip unit={distanceUnit} />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="miles" fill={ACTIVITY_COLORS.Run.hex} radius={[4, 4, 0, 0]} name={`Miles (${distanceUnit})`} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* ── Section: Activity counts per week ── */}
      <section>
        <SectionHeader title="Weekly Breakdown" subtitle={`${WEEKS_TO_SHOW}-week rolling`} isMobile={isMobile} />
        <ChartCard isMobile={isMobile}>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
            <LineChart data={weekStats} margin={{ top: 4, right: 4, left: isMobile ? -28 : -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: isMobile ? 9 : 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={chartInterval} />
              <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ActivityCountTooltip />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: isMobile ? 10 : 12, paddingTop: 8 }} />
              <Line type="monotone" dataKey="runs" stroke={ACTIVITY_COLORS.Run.hex} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Runs" />
              <Line type="monotone" dataKey="weights" stroke={ACTIVITY_COLORS.WeightTraining.hex} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Weights" />
              <Line type="monotone" dataKey="yoga" stroke={ACTIVITY_COLORS.Yoga.hex} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Yoga" />
              <Line type="monotone" dataKey="tennis" stroke={ACTIVITY_COLORS.Tennis.hex} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Tennis" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* ── Section: Week-over-week table ── */}
      <section>
        <SectionHeader title="Week-over-Week Log" isMobile={isMobile} />
        <div style={{
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)', overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          {isMobile ? (
            <MobileWeekLog weekStats={weekStats} distanceUnit={distanceUnit} />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  {['Week of', 'Miles', 'Runs', 'Weights', 'Yoga', 'Tennis', 'Active Days', 'Total Time'].map((h) => (
                    <th key={h} style={{
                      padding: '9px 14px', textAlign: h === 'Week of' ? 'left' : 'right',
                      fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...weekStats].reverse().map((w, i) => {
                  const isThisWeek = i === 0
                  return (
                    <tr key={w.weekOf} style={{
                      borderBottom: '1px solid var(--color-border-light)',
                      background: isThisWeek ? 'var(--color-accent-light)' : i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                    }}>
                      <td style={{ padding: '9px 14px', fontWeight: isThisWeek ? 600 : 400, color: isThisWeek ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                        {w.label}{isThisWeek && <span style={{ fontSize: 10, marginLeft: 6, background: 'var(--color-accent)', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>Now</span>}
                      </td>
                      <ColorCell value={w.miles.toFixed(1)} max={Math.max(...weekStats.map(x => x.miles))} color={ACTIVITY_COLORS.Run.hex} suffix={distanceUnit} />
                      <ColorCell value={String(w.runs)} max={Math.max(...weekStats.map(x => x.runs))} color={ACTIVITY_COLORS.Run.hex} />
                      <ColorCell value={String(w.weights)} max={Math.max(...weekStats.map(x => x.weights))} color={ACTIVITY_COLORS.WeightTraining.hex} />
                      <ColorCell value={String(w.yoga)} max={Math.max(...weekStats.map(x => x.yoga))} color={ACTIVITY_COLORS.Yoga.hex} />
                      <ColorCell value={String(w.tennis)} max={Math.max(...weekStats.map(x => x.tennis))} color={ACTIVITY_COLORS.Tennis.hex} />
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{w.totalActivities}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{w.totalTime > 0 ? formatDuration(w.totalTime) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Mobile week log (card-based instead of table) ────────────────────────────

function MobileWeekLog({ weekStats, distanceUnit }: { weekStats: WeekStats[]; distanceUnit: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {[...weekStats].reverse().map((w, i) => {
        const isThisWeek = i === 0
        return (
          <div key={w.weekOf} style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--color-border-light)',
            background: isThisWeek ? 'var(--color-accent-light)' : i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
            }}>
              <span style={{
                fontSize: 'var(--font-size-sm)', fontWeight: isThisWeek ? 700 : 500,
                color: isThisWeek ? 'var(--color-accent)' : 'var(--color-text-primary)',
              }}>
                {w.label}
                {isThisWeek && <span style={{ fontSize: 9, marginLeft: 6, background: 'var(--color-accent)', color: '#fff', padding: '1px 5px', borderRadius: 99, fontWeight: 600 }}>Now</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                {w.totalTime > 0 ? formatDuration(w.totalTime) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {w.miles > 0 && <MiniStat label="Miles" value={`${w.miles.toFixed(1)}`} color={ACTIVITY_COLORS.Run.hex} />}
              {w.runs > 0 && <MiniStat label="Runs" value={String(w.runs)} color={ACTIVITY_COLORS.Run.hex} />}
              {w.weights > 0 && <MiniStat label="Wt" value={String(w.weights)} color={ACTIVITY_COLORS.WeightTraining.hex} />}
              {w.yoga > 0 && <MiniStat label="Yoga" value={String(w.yoga)} color={ACTIVITY_COLORS.Yoga.hex} />}
              {w.tennis > 0 && <MiniStat label="Tennis" value={String(w.tennis)} color={ACTIVITY_COLORS.Tennis.hex} />}
              {w.totalActivities === 0 && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No activity</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, isMobile = false }: { title: string; subtitle?: string; isMobile?: boolean }) {
  return (
    <div style={{ marginBottom: isMobile ? 8 : 12 }}>
      <h2 style={{
        fontSize: isMobile ? 'var(--font-size-base)' : 'var(--font-size-md)',
        fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)',
        letterSpacing: '-0.3px', display: 'inline',
      }}>{title}</h2>
      {subtitle && (
        <span style={{
          fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)', marginLeft: 8, fontWeight: 400,
        }}>{subtitle}</span>
      )}
    </div>
  )
}

function StatCard({
  emoji, label, value, unit, delta, deltaLabel, color, isMobile = false,
}: {
  emoji: string; label: string; value: string; unit: string
  delta?: number; deltaLabel?: string; color: string; isMobile?: boolean
}) {
  const up = delta !== undefined && delta > 0
  const down = delta !== undefined && delta < 0

  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: isMobile ? '12px 12px' : '16px 18px',
      display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 7 }}>
        <span style={{ fontSize: isMobile ? 14 : 18 }}>{emoji}</span>
        <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontSize: isMobile ? 22 : 28, fontWeight: 800, color,
          letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        <span style={{ fontSize: isMobile ? 10 : 12, color: 'var(--color-text-tertiary)', fontWeight: 500 }}>{unit}</span>
      </div>
      {delta !== undefined && (
        <div style={{ fontSize: isMobile ? 10 : 11, color: up ? '#10b981' : down ? '#ef4444' : 'var(--color-text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
          {up ? '↑' : down ? '↓' : '→'}
          {Math.abs(delta).toFixed(delta % 1 !== 0 ? 1 : 0)} {deltaLabel}
        </div>
      )}
    </div>
  )
}

function YTDCard({ emoji, label, value, unit, color, isMobile = false }: {
  emoji: string; label: string; value: string; unit: string; color: string; isMobile?: boolean
}) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)', padding: isMobile ? '10px 10px' : '14px 16px',
      display: 'flex', flexDirection: 'column', gap: isMobile ? 3 : 6,
    }}>
      <div style={{ fontSize: isMobile ? 16 : 20 }}>{emoji}</div>
      <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: isMobile ? 9 : 11, color: 'var(--color-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  )
}

function ChartCard({ children, isMobile = false }: { children: React.ReactNode; isMobile?: boolean }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: isMobile ? '10px 8px 4px' : '16px 16px 8px',
    }}>
      {children}
    </div>
  )
}

function ColorCell({ value, max, color, suffix = '' }: { value: string; max: number; color: string; suffix?: string }) {
  const num = parseFloat(value)
  const intensity = max > 0 ? num / max : 0
  return (
    <td style={{
      padding: '9px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
      fontWeight: num > 0 ? 600 : 400, color: num > 0 ? color : 'var(--color-text-tertiary)',
      opacity: num > 0 ? 0.4 + intensity * 0.6 : 1,
    }}>
      {num > 0 ? `${value}${suffix ? ` ${suffix}` : ''}` : '—'}
    </td>
  )
}

function MilesTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Week of {label}</div>
      <div style={{ color: ACTIVITY_COLORS.Run.hex, fontWeight: 700 }}>{payload[0]?.value} {unit}</div>
    </div>
  )
}

function ActivityCountTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Week of {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', color: p.color }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}
