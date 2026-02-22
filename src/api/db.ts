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
