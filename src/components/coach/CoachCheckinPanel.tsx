import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useCoachProgress } from '../../hooks/useCoachProgress'
import { coachCheckin } from '../../api/coach'

export default function CoachCheckinPanel() {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const athlete = useAppStore((s) => s.athlete)
  const { weekProgress, overallCompletionRate, totalPlannedMiles, totalActualMiles } = useCoachProgress()
  const [suggestions, setSuggestions] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const completedWeeks = weekProgress.filter((w) => w.plannedActivities > 0)
  if (!coachPlan || completedWeeks.length === 0) return null

  async function handleCheckin() {
    if (!coachPlan || !athlete) return
    setLoading(true)
    try {
      const result = await coachCheckin(coachPlan.id, athlete.id, completedWeeks)
      setSuggestions(result.suggestions)
      setExpanded(true)
    } catch (err) {
      console.error('Check-in failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
    }}>
      {/* Summary row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📊</span>
          <div>
            <div style={{
              fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}>
              {overallCompletionRate}% completion
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              {completedWeeks.length} weeks tracked
            </div>
          </div>
        </div>

        <div style={{
          fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
        }}>
          {totalActualMiles} / {totalPlannedMiles} mi
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => suggestions ? setExpanded(!expanded) : handleCheckin()}
          disabled={loading}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-accent)',
            background: suggestions ? 'transparent' : 'var(--color-accent)',
            color: suggestions ? 'var(--color-accent)' : 'var(--color-text-inverse)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Checking in...' : suggestions ? (expanded ? 'Hide' : 'Show insights') : 'Get AI Check-in'}
        </button>
      </div>

      {/* Expanded suggestions */}
      {expanded && suggestions && (
        <div style={{
          marginTop: 12, padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {suggestions}
        </div>
      )}
    </div>
  )
}
