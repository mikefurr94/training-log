import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { adjustCoachPlan } from '../../api/coach'
import type { CoachWeek } from '../../store/types'

export default function CoachChatInput() {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const athlete = useAppStore((s) => s.athlete)
  const setCoachPlan = useAppStore((s) => s.setCoachPlan)
  const setCoachError = useAppStore((s) => s.setCoachError)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!input.trim() || !coachPlan || !athlete) return
    setLoading(true)

    // Find current week
    const today = new Date().toISOString().split('T')[0]
    const currentWeekIdx = coachPlan.weeks.findIndex((w) =>
      w.days.some((d) => d.date === today)
    )
    const currentWeek = currentWeekIdx >= 0 ? currentWeekIdx + 1 : 1
    const remainingWeeks = coachPlan.weeks.filter((w) => w.weekNumber >= currentWeek)

    try {
      const result = await adjustCoachPlan(
        coachPlan.id,
        athlete.id,
        input.trim(),
        { currentWeek, remainingWeeks }
      )

      // Merge updated weeks back into the plan
      if (result.weeks) {
        const updatedWeeks = coachPlan.weeks.map((existingWeek) => {
          const updated = (result.weeks as CoachWeek[]).find(
            (w) => w.weekNumber === existingWeek.weekNumber
          )
          return updated ?? existingWeek
        })
        setCoachPlan({ ...coachPlan, weeks: updatedWeeks })
      }
      setInput('')
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Failed to adjust plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 8,
      padding: '12px 0',
      borderTop: '1px solid var(--color-border)',
      flexShrink: 0,
    }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
        placeholder="Ask coach to adjust your plan..."
        disabled={loading}
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-sm)',
          outline: 'none',
          opacity: loading ? 0.6 : 1,
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || loading}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          background: input.trim() && !loading ? 'var(--color-accent)' : 'var(--color-border)',
          color: input.trim() && !loading ? 'var(--color-text-inverse)' : 'var(--color-text-tertiary)',
          border: 'none',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '...' : 'Send'}
      </button>
    </div>
  )
}
