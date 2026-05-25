// Habit-specific API calls (extracted from src/api/db.ts)

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
