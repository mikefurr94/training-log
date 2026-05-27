import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { athlete_id, resource } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // ── Habit definitions (resource=definitions) ─────────────────────────────
  if (resource === 'definitions') {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('habit_definitions')
        .select('habits')
        .eq('athlete_id', athleteId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json(data?.habits ?? [])
    }

    if (req.method === 'POST') {
      const { habits } = req.body
      if (!Array.isArray(habits)) return res.status(400).json({ error: 'Missing habits array' })

      const { error } = await supabase
        .from('habit_definitions')
        .upsert({ athlete_id: athleteId, habits, updated_at: new Date().toISOString() },
          { onConflict: 'athlete_id' })

      if (error) {
        console.error('habit_definitions upsert failed:', { athleteId, error })
        return res.status(500).json({ error: error.message })
      }
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Habit completions (default) ──────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('habit_completions')
      .select('date, habit_ids')
      .eq('athlete_id', athleteId)

    if (error) {
      console.error('habit_completions select failed:', { athleteId, error })
      return res.status(500).json({ error: error.message })
    }

    const result: Record<string, string[]> = {}
    for (const row of data ?? []) {
      result[row.date] = row.habit_ids
    }
    return res.status(200).json(result)
  }

  if (req.method === 'POST') {
    const { date, habit_ids } = req.body
    if (!date || !Array.isArray(habit_ids)) {
      return res.status(400).json({ error: 'Missing date or habit_ids' })
    }

    const { error } = await supabase
      .from('habit_completions')
      .upsert({ athlete_id: athleteId, date, habit_ids, updated_at: new Date().toISOString() },
        { onConflict: 'athlete_id,date' })

    if (error) {
      console.error('habit_completions upsert failed:', { athleteId, date, error })
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
