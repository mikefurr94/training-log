import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import CoachWizard from './CoachWizard'
import CoachPlanOverview from './CoachPlanOverview'
import CoachCheckinPanel from './CoachCheckinPanel'
import CoachChatInput from './CoachChatInput'

export default function CoachPage() {
  const coachPlan = useAppStore((s) => s.coachPlan)
  const coachLoading = useAppStore((s) => s.coachLoading)
  const coachError = useAppStore((s) => s.coachError)
  const coachWizardOpen = useAppStore((s) => s.coachWizardOpen)
  const setCoachWizardOpen = useAppStore((s) => s.setCoachWizardOpen)
  const setCoachError = useAppStore((s) => s.setCoachError)
  const isMobile = useIsMobile()

  // Loading state
  if (coachLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 16,
        padding: isMobile ? 24 : 40,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-accent)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{
          fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)',
          fontWeight: 'var(--font-weight-medium)', textAlign: 'center',
        }}>
          Generating your training plan...
        </p>
        <p style={{
          fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
          textAlign: 'center', maxWidth: 300,
        }}>
          This may take a moment while the AI designs your personalized program.
        </p>
      </div>
    )
  }

  // Active plan
  if (coachPlan) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        padding: isMobile ? '16px 12px' : '24px 32px',
        gap: 16,
      }}>
        {coachError && (
          <div style={{
            background: 'var(--color-status-missed-bg)',
            border: '1px solid var(--color-status-missed-border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-status-missed-text)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{coachError}</span>
            <button onClick={() => setCoachError(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-status-missed-text)', fontWeight: 600, fontSize: 16,
            }}>x</button>
          </div>
        )}
        <CoachCheckinPanel />
        <CoachPlanOverview />
        <CoachChatInput />
      </div>
    )
  }

  // Welcome state (no plan)
  return (
    <>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 20,
        padding: isMobile ? 24 : 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>🏅</div>
        <h2 style={{
          margin: 0, fontSize: isMobile ? 22 : 26,
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.5px',
        }}>
          Marathon Coach
        </h2>
        <p style={{
          margin: 0, fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-secondary)',
          maxWidth: 440, lineHeight: 1.6,
        }}>
          Get a personalized AI-powered training plan that considers your Strava history,
          race goals, and preferred schedule. Track your progress and get real-time coaching
          adjustments.
        </p>

        {coachError && (
          <div style={{
            background: 'var(--color-status-missed-bg)',
            border: '1px solid var(--color-status-missed-border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-status-missed-text)',
            maxWidth: 400,
          }}>
            {coachError}
          </div>
        )}

        <button
          onClick={() => setCoachWizardOpen(true)}
          style={{
            padding: '12px 28px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)',
            color: 'var(--color-text-inverse)',
            border: 'none',
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
          }}
        >
          Create Training Plan
        </button>

        <div style={{
          display: 'flex', gap: isMobile ? 16 : 32,
          marginTop: 12, flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { icon: '📊', text: 'Analyzes your Strava data' },
            { icon: '🎯', text: 'Tailored to your goals' },
            { icon: '📅', text: 'Full calendar plan' },
            { icon: '🔄', text: 'Adapts as you train' },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}>
              <span>{icon}</span> {text}
            </div>
          ))}
        </div>
      </div>

      {coachWizardOpen && (
        <CoachWizard onClose={() => setCoachWizardOpen(false)} />
      )}
    </>
  )
}
