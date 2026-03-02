import { useMemo } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { format, subWeeks, startOfWeek, addDays } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { buildHabitWeekStats } from '../../utils/habitUtils'

const WEEKS_TO_SHOW = 12
const HABIT_COLORS = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#f97316']

export default function HabitDashboard() {
  const habits = useAppStore((s) => s.habits)
  const habitCompletions = useAppStore((s) => s.habitCompletions)
  const isMobile = useIsMobile()

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.order - b.order),
    [habits]
  )

  const weekStats = useMemo(
    () => buildHabitWeekStats(sortedHabits, habitCompletions, WEEKS_TO_SHOW),
    [sortedHabits, habitCompletions]
  )

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

  const chartInterval = isMobile ? 2 : 1

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24,
      maxWidth: 1000, margin: '0 auto', width: '100%',
    }}>
      {/* Weekly completion rates chart */}
      <section>
        <SectionHeader title="Weekly Completion" subtitle={`${WEEKS_TO_SHOW}-wk`} isMobile={isMobile} />
        <ChartCard isMobile={isMobile}>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
            <LineChart data={lineData} margin={{ top: 4, right: 4, left: isMobile ? -28 : -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} interval={chartInterval} />
              <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-tertiary)' }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip habits={sortedHabits} />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: isMobile ? 10 : 12, paddingTop: 8 }} />
              {sortedHabits.map((h, i) => (
                <Line key={h.id} type="monotone" dataKey={h.id} stroke={HABIT_COLORS[i % HABIT_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={h.name} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Weekly Review */}
      <section>
        <SectionHeader title="Weekly Review" subtitle="8-wk" isMobile={isMobile} />
        <WeeklyReview habits={sortedHabits} completions={habitCompletions} isMobile={isMobile} />
      </section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, isMobile = false }: { title: string; subtitle?: string; isMobile?: boolean }) {
  return (
    <div style={{ marginBottom: isMobile ? 8 : 12 }}>
      <h2 style={{
        fontSize: isMobile ? 'var(--font-size-base)' : 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)', letterSpacing: '-0.3px', display: 'inline',
      }}>{title}</h2>
      {subtitle && (
        <span style={{ fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginLeft: 8, fontWeight: 400 }}>{subtitle}</span>
      )}
    </div>
  )
}


function ChartCard({ children, isMobile = false }: { children: React.ReactNode; isMobile?: boolean }) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)', padding: isMobile ? '10px 8px 4px' : '16px 16px 8px',
    }}>{children}</div>
  )
}

function CustomTooltip({ active, payload, label, habits }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
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

// ── Weekly Review ─────────────────────────────────────────────────────────────

function WeeklyReview({ habits, completions, isMobile }: {
  habits: { id: string; name: string; emoji: string; order: number }[]
  completions: Record<string, string[]>
  isMobile: boolean
}) {
  const weeks = useMemo(() => {
    const today = new Date()
    const rows: { label: string; counts: Record<string, number> }[] = []

    for (let w = 0; w < 8; w++) {
      const ws = startOfWeek(subWeeks(today, w), { weekStartsOn: 1 })
      const counts: Record<string, number> = {}
      for (const h of habits) {
        let done = 0
        for (let d = 0; d < 7; d++) {
          const key = format(addDays(ws, d), 'yyyy-MM-dd')
          if ((completions[key] ?? []).includes(h.id)) done++
        }
        counts[h.id] = done
      }
      rows.push({ label: format(ws, 'MMM d'), counts })
    }

    return rows
  }, [habits, completions])

  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)', overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)',
        padding: isMobile ? '8px 10px' : '9px 14px',
        gap: isMobile ? 6 : 8,
      }}>
        <div style={{
          width: isMobile ? 60 : 80, flexShrink: 0,
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Week
        </div>
        {habits.map((h) => (
          <div key={h.id} style={{
            flex: 1, textAlign: 'center', minWidth: 0,
            fontSize: isMobile ? 14 : 16,
          }} title={h.name}>
            {h.emoji}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, i) => (
        <div key={week.label} style={{
          display: 'flex', alignItems: 'center',
          padding: isMobile ? '8px 10px' : '9px 14px',
          gap: isMobile ? 6 : 8,
          borderBottom: i < weeks.length - 1 ? '1px solid var(--color-border-light)' : 'none',
          background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
        }}>
          <div style={{
            width: isMobile ? 60 : 80, flexShrink: 0,
            fontSize: isMobile ? 11 : 'var(--font-size-sm)', fontWeight: 500,
            color: 'var(--color-text-secondary)',
          }}>
            {week.label}
          </div>
          {habits.map((h, hi) => {
            const count = week.counts[h.id] ?? 0
            const ratio = count / 7
            return (
              <div key={h.id} style={{
                flex: 1, textAlign: 'center',
                fontSize: isMobile ? 13 : 14,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: count === 7
                  ? HABIT_COLORS[hi % HABIT_COLORS.length]
                  : count === 0
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-primary)',
                opacity: count === 0 ? 0.5 : 0.4 + ratio * 0.6,
              }}>
                {count}/7
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
