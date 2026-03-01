import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { buildFitnessSummary } from '../../utils/coachUtils'
import { generateCoachPlan } from '../../api/coach'
import CoachWizardStepRace from './CoachWizardStepRace'
import CoachWizardStepGoals from './CoachWizardStepGoals'
import CoachWizardStepSchedule from './CoachWizardStepSchedule'
import CoachWizardStepFitness from './CoachWizardStepFitness'
import CoachWizardStepReview from './CoachWizardStepReview'
import type { CoachWizardStep, CoachWizardData, FitnessSummary } from '../../store/types'

const STEPS: CoachWizardStep[] = ['race', 'goals', 'schedule', 'fitness', 'review']
const STEP_LABELS: Record<CoachWizardStep, string> = {
  race: 'Race',
  goals: 'Goals',
  schedule: 'Schedule',
  fitness: 'Fitness',
  review: 'Review',
}

interface Props {
  onClose: () => void
}

export default function CoachWizard({ onClose }: Props) {
  const isMobile = useIsMobile()
  const athlete = useAppStore((s) => s.athlete)
  const activitiesByDate = useAppStore((s) => s.activitiesByDate)
  const setCoachPlan = useAppStore((s) => s.setCoachPlan)
  const setCoachLoading = useAppStore((s) => s.setCoachLoading)
  const setCoachError = useAppStore((s) => s.setCoachError)
  const setCoachWizardOpen = useAppStore((s) => s.setCoachWizardOpen)

  const [step, setStep] = useState<CoachWizardStep>('race')
  const [data, setData] = useState<CoachWizardData>({
    raceDate: '',
    raceDistance: 'marathon',
    raceGoal: 'just_finish',
    daysPerWeekRun: 4,
    daysPerWeekStrength: 2,
    strengthTypes: ['Upper Body', 'Lower Body'],
    includeYoga: true,
  })
  const [fitnessSummary, setFitnessSummary] = useState<FitnessSummary | null>(null)

  const stepIndex = STEPS.indexOf(step)

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1]
      // Compute fitness summary when entering fitness step
      if (nextStep === 'fitness' && !fitnessSummary) {
        setFitnessSummary(buildFitnessSummary(activitiesByDate))
      }
      setStep(nextStep)
    }
  }

  function goBack() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1])
  }

  function updateData(partial: Partial<CoachWizardData>) {
    setData((d) => ({ ...d, ...partial }))
  }

  async function handleGenerate() {
    if (!athlete) return
    const summary = fitnessSummary ?? buildFitnessSummary(activitiesByDate)
    onClose()
    setCoachLoading(true)
    setCoachError(null)
    try {
      const plan = await generateCoachPlan(athlete.id, data, summary)
      setCoachPlan(plan)
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setCoachLoading(false)
      setCoachWizardOpen(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? 20 : 28,
          width: isMobile ? 'calc(100vw - 32px)' : 480,
          maxHeight: '85vh',
          overflowY: 'auto',
          zIndex: 201,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{
            margin: 0, fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
          }}>
            Create Training Plan
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)', fontSize: 18, lineHeight: 1,
          }}>x</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <div style={{
                height: 3, flex: 1, borderRadius: 2,
                background: i <= stepIndex ? 'var(--color-accent)' : 'var(--color-border)',
                transition: 'background 200ms',
              }} />
              {i === stepIndex && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'var(--color-accent)', whiteSpace: 'nowrap',
                }}>
                  {STEP_LABELS[s]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'race' && <CoachWizardStepRace data={data} onChange={updateData} />}
        {step === 'goals' && <CoachWizardStepGoals data={data} onChange={updateData} />}
        {step === 'schedule' && <CoachWizardStepSchedule data={data} onChange={updateData} />}
        {step === 'fitness' && (
          <CoachWizardStepFitness
            summary={fitnessSummary ?? buildFitnessSummary(activitiesByDate)}
            onUpdate={setFitnessSummary}
          />
        )}
        {step === 'review' && <CoachWizardStepReview data={data} fitnessSummary={fitnessSummary} />}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          {stepIndex > 0 && (
            <button onClick={goBack} style={secondaryBtnStyle}>Back</button>
          )}
          {step === 'review' ? (
            <button onClick={handleGenerate} style={{
              ...primaryBtnStyle,
              background: '#10b981',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}>
              Generate Plan
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={step === 'race' && !data.raceDate}
              style={{
                ...primaryBtnStyle,
                opacity: (step === 'race' && !data.raceDate) ? 0.5 : 1,
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </>
  )
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-accent)',
  color: 'var(--color-text-inverse)',
  border: 'none',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  cursor: 'pointer',
}
