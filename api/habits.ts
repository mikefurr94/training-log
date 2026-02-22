import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // GET — load all habit completions for this athlete
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('habit_completions')
      .select('date, habit_ids')
      .eq('athlete_id', athleteId)

    if (error) return res.status(500).json({ error: error.message })

    // Return as { "2024-01-01": ["habit-1", "habit-2"], ... }
    const result: Record<string, string[]> = {}
    for (const row of data ?? []) {
      result[row.date] = row.habit_ids
    }
    return res.status(200).json(result)
  }

  // POST — upsert a single day's completions
  if (req.method === 'POST') {
    const { date, habit_ids } = req.body
    if (!date || !Array.isArray(habit_ids)) {
      return res.status(400).json({ error: 'Missing date or habit_ids' })
    }

    const { error } = await supabase
      .from('habit_completions')
      .upsert({ athlete_id: athleteId, date, habit_ids, updated_at: new Date().toISOString() },
        { onConflict: 'athlete_id,date' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
