import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // GET — load active coach plan
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message })
    }

    if (!data) return res.status(200).json({ plan: null })

    // Map DB row to CoachPlan shape
    return res.status(200).json({
      plan: {
        id: data.id,
        athleteId: data.athlete_id,
        raceDate: data.race_date,
        raceDistance: data.race_distance,
        raceGoal: data.race_goal,
        goalTimeSeconds: data.goal_time_seconds,
        daysPerWeekRun: data.days_per_week_run,
        daysPerWeekStrength: data.days_per_week_strength,
        strengthTypes: data.strength_types,
        includeYoga: data.include_yoga,
        fitnessSummary: data.fitness_summary,
        planStartDate: data.plan_start_date,
        planWeeks: data.plan_weeks,
        weeks: data.weekly_plan?.weeks ?? [],
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    })
  }

  // POST — save/update coach plan
  if (req.method === 'POST') {
    const plan = req.body
    if (!plan) return res.status(400).json({ error: 'Missing plan data' })

    const row = {
      id: plan.id,
      athlete_id: athleteId,
      race_date: plan.raceDate,
      race_distance: plan.raceDistance,
      race_goal: plan.raceGoal,
      goal_time_seconds: plan.goalTimeSeconds ?? null,
      days_per_week_run: plan.daysPerWeekRun,
      days_per_week_strength: plan.daysPerWeekStrength,
      strength_types: plan.strengthTypes,
      include_yoga: plan.includeYoga,
      fitness_summary: plan.fitnessSummary,
      plan_start_date: plan.planStartDate,
      plan_weeks: plan.planWeeks,
      weekly_plan: { weeks: plan.weeks },
      status: plan.status ?? 'active',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('coach_plans')
      .upsert(row, { onConflict: 'id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // DELETE — archive a plan
  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing plan id' })

    const { error } = await supabase
      .from('coach_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('athlete_id', athleteId)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
