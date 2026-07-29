// Frontend API calls to our Supabase-backed serverless functions
import { apiFetch } from './client'

export async function loadPlan(): Promise<Record<string, unknown>> {
  const res = await apiFetch('/api/plan')
  if (!res.ok) throw new Error('Failed to load plan')
  return res.json()
}

export async function savePlan(data: Record<string, unknown>): Promise<void> {
  const res = await apiFetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to save plan')
}

// ── Race Goals ──────────────────────────────────────────────────────────────

export async function loadRaceGoals(): Promise<Record<string, string>> {
  const res = await apiFetch('/api/race-goals')
  if (!res.ok) throw new Error('Failed to load race goals')
  return res.json()
}

export async function saveRaceGoals(goals: Record<string, string>): Promise<void> {
  const res = await apiFetch('/api/race-goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goals }),
  })
  if (!res.ok) throw new Error('Failed to save race goals')
}

// ── Coach Plan ──────────────────────────────────────────────────────────────

export async function loadCoachPlan(): Promise<Record<string, unknown> | null> {
  const res = await apiFetch('/api/coach-plan')
  if (!res.ok) throw new Error('Failed to load coach plan')
  return res.json()
}

export async function saveCoachPlan(
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
  const res = await apiFetch('/api/coach-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plan),
  })
  if (!res.ok) throw new Error('Failed to save coach plan')
  return res.json()
}

export async function updateCoachPlan(
  planId: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/coach-plan?plan_id=${planId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update coach plan')
  return res.json()
}
