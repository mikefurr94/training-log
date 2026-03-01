import type { CoachPlan, CoachWizardData, FitnessSummary } from '../store/types'

export async function loadCoachPlan(athleteId: number): Promise<CoachPlan | null> {
  const res = await fetch(`/api/coach/plan?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to load coach plan')
  const data = await res.json()
  return data.plan ?? null
}

export async function saveCoachPlan(athleteId: number, plan: CoachPlan): Promise<void> {
  const res = await fetch(`/api/coach/plan?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (!res.ok) throw new Error('Failed to save coach plan')
}

export async function generateCoachPlan(
  athleteId: number,
  wizardData: CoachWizardData,
  fitnessSummary: FitnessSummary
): Promise<CoachPlan> {
  const res = await fetch('/api/coach/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athlete_id: athleteId, ...wizardData, fitnessSummary }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }))
    throw new Error(err.error || 'Failed to generate plan')
  }
  return res.json()
}

export async function getCoachDayDetail(
  planId: string,
  date: string,
  weekContext: { weekNumber: number; phase: string; summary: string },
  activity: { label: string; targetDistanceMiles?: number; intensity?: string }
): Promise<string> {
  const res = await fetch('/api/coach/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id: planId, date, weekContext, activity }),
  })
  if (!res.ok) throw new Error('Failed to get workout detail')
  const data = await res.json()
  return data.detail
}

export async function adjustCoachPlan(
  planId: string,
  athleteId: number,
  request: string,
  context: {
    currentWeek: number
    remainingWeeks: unknown[]
  }
): Promise<{ weeks: unknown[] }> {
  const res = await fetch('/api/coach/adjust', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id: planId, athlete_id: athleteId, request, context }),
  })
  if (!res.ok) throw new Error('Failed to adjust plan')
  return res.json()
}

export async function coachCheckin(
  planId: string,
  athleteId: number,
  weeksCompleted: unknown[]
): Promise<{ suggestions: string; updatedWeeks?: unknown[] }> {
  const res = await fetch('/api/coach/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id: planId, athlete_id: athleteId, weeksCompleted }),
  })
  if (!res.ok) throw new Error('Failed to get check-in')
  return res.json()
}
