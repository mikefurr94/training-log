import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { calculateStreak, buildHabitWeekStats } from '../../utils/habitUtils'

const WEEKS_TO_SHOW = 12
const HABIT_COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#f97316']

export default function HabitDashboard() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  )

  const today = useMemo(() => new Date(), [])

  // Streaks
  const streaks = useMemo(() =>
    sortedHabits.map((h) => ({
      ...h,
      ...calculateStreak(h.id, habitCompletions, today),
    })),
    [sortedHabits, habitCompletions, today]
  )

  // Week stats
  const weekStats = useMemo(
    () => buildHabitWeekStats(sortedHabits, habitCompletions, WEEKS_TO_SHOW),
    [sortedHabits, habitCompletions]
  )

  // Overall completion (last 30 days)
  const last30 = useMemo(() => {
    let total = 0, completed = 0
    for (let i = 0; i < 30; i++) {
      const d = format(new Date(today.getTime() - i * 86400000), 'yyyy-MM-dd')
      for (const h of sortedHabits) {
        total++
        if ((habitCompletions[d] ?? []).includes(h.id)) completed++
      }
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }, [sortedHabits, habitCompletions, today])

  // Chart data for per-habit weekly rates
  const barData = useMemo(() =>
    weekStats.map((ws) => {
      const row: Record<string, string | number> = { week: ws.label }
      for (const h of sortedHabits) {
        row[h.id] = Math.round((ws.rates[h.id] ?? 0) * 100)
      }
      return row
    }),
    [weekStats, sortedHabits]
  )

  // Line data for overall trend
  const lineData = useMemo(() =>
    weekStats.map((ws) => ({
      week: ws.label,
      overall: Math.round(ws.overallRate * 100),
      ...Object.fromEntries(
        sortedHabits.map((h) => [h.id, Math.round((ws.rates[h.id] ?? 0) * 100)])
      ),
    })),
    [weekStats, sortedHabits]
  )

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 24,
      maxWidth: 1000, margin: '0 auto', width: '100%',
    }}>
      {/* Overall stat */}
      <section>
        <SectionHeader title="30-Day Overview" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatCard
            emoji="📊"
            label="Overall Rate"
            value={`${last30}%`}
            subtitle="Last 30 days"
            color="var(--color-accent)"
          />
          {streaks.map((h, i) => (
            <StatCard
              key={h.id}
              emoji={h.emoji}
              label={h.name}
              value={`${h.current}d`}
              subtitle={`Best: ${h.longest}d`}
              color={HABIT_COLORS[i % HABIT_COLORS.length]}
            />
          ))}
        </div>
      </section>

      {/* Weekly completion rates chart */}
      <section>
        <SectionHeader title="Weekly Completion Rate" subtitle={`${WEEKS_TO_SHOW}-week rolling`} />
        <ChartCard>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip habits={sortedHabits} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {sortedHabits.map((h, i) => (
                <Line
                  key={h.id}
                  type="monotone"
                  dataKey={h.id}
                  stroke={HABIT_COLORS[i % HABIT_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={h.name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Bar chart — per-habit weekly rates */}
      <section>
        <SectionHeader title="Habit Breakdown by Week" subtitle={`${WEEKS_TO_SHOW}-week rolling`} />
        <ChartCard>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip habits={sortedHabits} />} />
              {sortedHabits.map((h, i) => (
                <Bar
                  key={h.id}
                  dataKey={h.id}
                  fill={HABIT_COLORS[i % HABIT_COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  name={h.name}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Streak table */}
      <section>
        <SectionHeader title="Streak Leaderboard" />
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                {['Habit', 'Current Streak', 'Longest Streak'].map((h) => (
                  <th key={h} style={{
                    padding: '9px 14px',
                    textAlign: h === 'Habit' ? 'left' : 'right',
                    fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {streaks.map((h, i) => (
                <tr key={h.id} style={{
                  borderBottom: i < streaks.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                  background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                }}>
                  <td style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{h.emoji}</span>
                    <span style={{ fontWeight: 500 }}>{h.name}</span>
                  </td>
                  <td style={{
                    padding: '9px 14px', textAlign: 'right', fontWeight: 700,
                    color: h.current > 0 ? HABIT_COLORS[i % HABIT_COLORS.length] : 'var(--color-text-tertiary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {h.current > 0 ? `${h.current} days` : '—'}
                  </td>
                  <td style={{
                    padding: '9px 14px', textAlign: 'right',
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {h.longest > 0 ? `${h.longest} days` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{
        fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)', letterSpacing: '-0.3px', display: 'inline',
      }}>
        {title}
      </h2>
      {subtitle && (
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginLeft: 10, fontWeight: 400 }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}

function StatCard({ emoji, label, value, subtitle, color }: {
  emoji: string; label: string; value: string; subtitle: string; color: string
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
        {subtitle}
      </div>
    </div>
  )
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: '16px 16px 8px',
    }}>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label, habits }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--color-text-primary)' }}>Week of {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, justifyContent: 'space-between', color: p.color }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{p.value}%</span>
        </div>
      ))}
    </div>
  )
}
