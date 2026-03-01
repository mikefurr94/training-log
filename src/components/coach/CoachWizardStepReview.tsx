import { format, parseISO, differenceInWeeks } from 'date-fns'
import type { CoachWizardData, FitnessSummary } from '../../store/types'
import { RACE_DISTANCE_LABELS, RACE_GOAL_LABELS, formatGoalTime } from '../../utils/coachUtils'

interface Props {
  data: CoachWizardData
  fitnessSummary: FitnessSummary | null
}

export default function CoachWizardStepReview({ data, fitnessSummary }: Props) {
  const weeksUntilRace = data.raceDate
    ? differenceInWeeks(parseISO(data.raceDate), new Date())
    : 0
  const raceDate = data.raceDate ? format(parseISO(data.raceDate), 'MMMM d, yyyy') : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{
        margin: 0, fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)', lineHeight: 1.5,
      }}>
        Review your plan settings. The AI coach will generate a {weeksUntilRace}-week training plan
        tailored to your goals and fitness level.
      </p>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 14, borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
      }}>
        <ReviewRow label="Race" value={RACE_DISTANCE_LABELS[data.raceDistance]} />
        <ReviewRow label="Race Date" value={raceDate} />
        <ReviewRow label="Weeks" value={`${weeksUntilRace} weeks`} />
        <ReviewRow
          label="Goal"
          value={
            data.raceGoal === 'time_target' && data.goalTimeSeconds
              ? `${RACE_GOAL_LABELS[data.raceGoal]}: ${formatGoalTime(data.goalTimeSeconds)}`
              : RACE_GOAL_LABELS[data.raceGoal]
          }
        />
        <ReviewRow label="Run days/week" value={String(data.daysPerWeekRun)} />
        <ReviewRow label="Strength days/week" value={String(data.daysPerWeekStrength)} />
        {data.daysPerWeekStrength > 0 && (
          <ReviewRow label="Strength types" value={data.strengthTypes.join(', ')} />
        )}
        <ReviewRow label="Yoga/Recovery" value={data.includeYoga ? 'Yes' : 'No'} />
      </div>

      {fitnessSummary && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-light)',
          fontSize: 'var(--font-size-sm)', color: 'var(--color-accent)',
          lineHeight: 1.5,
        }}>
          Based on your current {fitnessSummary.avgWeeklyMiles} mi/week average
          and {fitnessSummary.avgPace} pace, the AI will design an appropriate progression.
        </div>
      )}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-primary)',
      }}>
        {value}
      </span>
    </div>
  )
}
