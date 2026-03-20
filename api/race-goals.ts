import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // GET — load race goals for this athlete
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('race_goals')
      .select('goals')
      .eq('athlete_id', athleteId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data?.goals ?? {})
  }

  // POST — save race goals for this athlete
  if (req.method === 'POST') {
    const { goals } = req.body
    if (!goals || typeof goals !== 'object') return res.status(400).json({ error: 'Missing goals object' })

    const { error } = await supabase
      .from('race_goals')
      .upsert({ athlete_id: athleteId, goals, updated_at: new Date().toISOString() },
        { onConflict: 'athlete_id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
