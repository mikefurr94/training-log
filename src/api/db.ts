// Frontend API calls to our Supabase-backed serverless functions

export async function loadHabits(athleteId: number): Promise<Record<string, string[]>> {
  const res = await fetch(`/api/habits?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to load habits')
  return res.json()
}

export async function saveHabitDay(athleteId: number, date: string, habitIds: string[]): Promise<void> {
  const res = await fetch(`/api/habits?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, habit_ids: habitIds }),
  })
  if (!res.ok) throw new Error('Failed to save habit')
}

export async function loadPlan(athleteId: number): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/plan?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to load plan')
  return res.json()
}

export async function savePlan(athleteId: number, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/plan?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save plan')
}

// ── Habit Definitions ────────────────────────────────────────────────────────

export async function loadHabitDefinitions(athleteId: number): Promise<unknown[] | null> {
  const res = await fetch(`/api/habit-definitions?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to load habit definitions')
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data : null
}

export async function saveHabitDefinitions(athleteId: number, habits: unknown[]): Promise<void> {
  const res = await fetch(`/api/habit-definitions?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habits }),
  })
  if (!res.ok) throw new Error('Failed to save habit definitions')
}

// ── Race Goals ──────────────────────────────────────────────────────────────

export async function loadRaceGoals(athleteId: number): Promise<Record<string, string>> {
  const res = await fetch(`/api/race-goals?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to load race goals')
  return res.json()
}

export async function saveRaceGoals(athleteId: number, goals: Record<string, string>): Promise<void> {
  const res = await fetch(`/api/race-goals?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goals }),
  })
  if (!res.ok) throw new Error('Failed to save race goals')
}

// ── Coach Plan ──────────────────────────────────────────────────────────────

export async function loadCoachPlan(athleteId: number): Promise<Record<string, unknown> | null> {
  const res = await fetch(`/api/coach-plan?athlete_id=${athleteId}`)
  if (!res.ok) throw new Error('Failed to load coach plan')
  return res.json()
}

export async function saveCoachPlan(
  athleteId: number,
  plan: {
    name: string
    raceName?: string
    raceDate?: string
    raceDistance?: string
    goalTime?: string
    preferences?: Record<string, unknown>
    weeks?: unknown[]
    conversationId?: string
  },
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/coach-plan?athlete_id=${athleteId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (!res.ok) throw new Error('Failed to save coach plan')
  return res.json()
}

export async function updateCoachPlan(
  athleteId: number,
  planId: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/coach-plan?athlete_id=${athleteId}&plan_id=${planId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update coach plan')
  return res.json()
}
