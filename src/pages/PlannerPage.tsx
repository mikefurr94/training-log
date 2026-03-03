import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { useIsMobile } from '../hooks/useIsMobile'
import { coachToPlanned } from '../utils/coachUtils'
import CoachCalendarView from '../components/coach/CoachCalendarView'
import CoachChatPanel from '../components/coach/CoachChatPanel'
import CoachWizard from '../components/coach/CoachWizard'
import DayPlanColumn from '../components/planning/DayPlanColumn'
import type { WeekDayIndex, PlannedActivity } from '../store/types'

// Mon-Sun day order to match Monday-start weeks (JS dayIndex: Mon=1...Sat=6, Sun=0)
const MON_TO_SUN_ORDER: WeekDayIndex[] = [1, 2, 3, 4, 5, 6, 0]

export default function PlannerPage() {
  const isMobile = useIsMobile()
  const coachPlan = useAppStore((s) => s.coachPlan)
  const coachLoading = useAppStore((s) => s.coachLoading)
  const coachWizardOpen = useAppStore((s) => s.coachWizardOpen)
  const setCoachWizardOpen = useAppStore((s) => s.setCoachWizardOpen)
  const coachChatOpen = useAppStore((s) => s.coachChatOpen)
  const openCoachChat = useAppStore((s) => s.openCoachChat)
  const closeCoachChat = useAppStore((s) => s.closeCoachChat)
  const openPlannedPanel = useAppStore((s) => s.openPlannedPanel)
  const padding = isMobile ? 8 : 16

  // Handler for clicking a day in the CoachCalendarView
  function handleDayClick(dateStr: string) {
    if (!coachPlan) return
    // Close chat on mobile to avoid crowding
    if (isMobile) closeCoachChat()
    // Find the day in the plan
    const coachDay = coachPlan.weeks
      .flatMap((w) => w.days)
      .find((d) => d.date === dateStr)
    if (!coachDay || coachDay.activities.length === 0) return
    // Convert first non-skipped activity and open the panel
    const firstActivity = coachDay.activities.find((a) => !a.skipped)
    if (!firstActivity) return
    const planned = coachToPlanned(firstActivity)
    if (planned) openPlannedPanel(planned, dateStr)
  }

  // Loading state
  if (coachLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 16, padding: isMobile ? 24 : 40,
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

  return (
    <div style={{
      height: '100%', padding, overflow: 'auto',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* AI Plan section */}
      {coachPlan ? (
        <CoachPlanSection
          onDayClick={handleDayClick}
          isMobile={isMobile}
        />
      ) : (
        <CreatePlanCTA onCreatePlan={() => setCoachWizardOpen(true)} isMobile={isMobile} />
      )}

      {/* Weekly Template — always visible as fallback */}
      <TemplateSection isMobile={isMobile} collapsed={!!coachPlan} />

      {/* Coach Chat FAB — visible when plan exists */}
      {coachPlan && !coachChatOpen && (
        <button
          onClick={() => {
            if (isMobile) {} // Don't need to close anything
            openCoachChat()
          }}
          aria-label="Chat with coach"
          style={{
            position: 'fixed', right: 20, bottom: isMobile ? 80 : 24,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--color-accent)', color: '#fff',
            border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 140,
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)'
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Coach Chat Panel */}
      <AnimatePresence>
        {coachChatOpen && <CoachChatPanel key="chat" />}
      </AnimatePresence>

      {/* Coach Wizard Modal */}
      {coachWizardOpen && (
        <CoachWizard onClose={() => setCoachWizardOpen(false)} />
      )}
    </div>
  )
}

// ── Coach Plan Calendar Section ─────────────────────────────────────────────

function CoachPlanSection({ onDayClick, isMobile }: {
  onDayClick: (date: string) => void
  isMobile: boolean
}) {
  const coachPlan = useAppStore((s) => s.coachPlan)
  if (!coachPlan) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: isMobile ? '4px 4px' : '4px 0',
      }}>
        <span style={{ fontSize: 18 }}>🏅</span>
        <span style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)', letterSpacing: '-0.2px',
        }}>
          AI Training Plan
        </span>
        <span style={{
          fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
          marginLeft: 4,
        }}>
          Click a day to view & edit
        </span>
      </div>
      <CoachCalendarView plan={coachPlan} onDayClick={onDayClick} />
    </div>
  )
}

// ── Create Plan CTA ─────────────────────────────────────────────────────────

function CreatePlanCTA({ onCreatePlan, isMobile }: { onCreatePlan: () => void; isMobile: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, padding: isMobile ? '24px 16px' : '32px 24px',
      background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
      border: '1px dashed var(--color-border)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, lineHeight: 1 }}>🏅</div>
      <h2 style={{
        margin: 0, fontSize: isMobile ? 20 : 22,
        fontWeight: 'var(--font-weight-bold)',
        color: 'var(--color-text-primary)', letterSpacing: '-0.4px',
      }}>
        AI Training Plan
      </h2>
      <p style={{
        margin: 0, fontSize: 'var(--font-size-sm)',
        color: 'var(--color-text-secondary)',
        maxWidth: 400, lineHeight: 1.5,
      }}>
        Get a personalized AI-powered training plan based on your Strava history,
        race goals, and preferred schedule.
      </p>
      <button
        onClick={onCreatePlan}
        style={{
          padding: '10px 24px', borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent)', color: 'var(--color-text-inverse)',
          border: 'none', fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}
      >
        Create Training Plan
      </button>
      <div style={{
        display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {[
          { icon: '📊', text: 'Analyzes Strava data' },
          { icon: '🎯', text: 'Tailored to goals' },
          { icon: '📅', text: 'Full calendar plan' },
          { icon: '🔄', text: 'Adapts as you train' },
        ].map(({ icon, text }) => (
          <div key={text} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
          }}>
            <span>{icon}</span> {text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Template Section ────────────────────────────────────────────────────────

function TemplateSection({ isMobile, collapsed }: { isMobile: boolean; collapsed: boolean }) {
  const weekTemplate = useAppStore((s) => s.weekTemplate)
  const [isOpen, setIsOpen] = useState(!collapsed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: isOpen ? 1 : undefined }}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isMobile ? '4px 4px' : '4px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          width: '100%', textAlign: 'left',
        }}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{
          fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-secondary)', letterSpacing: '-0.1px',
        }}>
          Weekly Template
        </span>
        <span style={{
          fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
        }}>
          {collapsed ? '— fallback for weeks outside AI plan' : '— repeats every week unless customized'}
        </span>
      </button>

      {isOpen && (
        <WeekGrid
          days={MON_TO_SUN_ORDER.map((dayIndex) => ({
            dayIndex,
            date: new Date(0),
            activities: weekTemplate.days[dayIndex] ?? [],
          }))}
          overrideWeekStart={undefined}
          showDate={false}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

// ── Shared week grid ─────────────────────────────────────────────────────────

interface DayEntry {
  dayIndex: WeekDayIndex
  date: Date
  activities: PlannedActivity[]
}

function WeekGrid({
  days, overrideWeekStart, showDate, isMobile,
}: {
  days: DayEntry[]
  overrideWeekStart?: Date
  showDate: boolean
  isMobile: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 0,
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--color-surface)',
      flex: isMobile ? undefined : 1,
      minHeight: isMobile ? undefined : 0,
    }}>
      {days.map((day, i) => (
        <div
          key={day.dayIndex}
          style={{
            flex: isMobile ? undefined : 1,
            minWidth: 0,
            borderRight: !isMobile && i < 6 ? '1px solid var(--color-border)' : 'none',
            borderBottom: isMobile && i < 6 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <DayPlanColumn
            date={day.date}
            dayIndex={day.dayIndex}
            activities={day.activities}
            overrideWeekStart={overrideWeekStart}
            showDate={showDate}
          />
        </div>
      ))}
    </div>
  )
}
