import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { requireSession } from './_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireSession(req, res)
  if (!userId) return

  // GET — load race goals for this user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('race_goals')
      .select('goals')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data?.goals ?? {})
  }

  // POST — save race goals for this user
  if (req.method === 'POST') {
    const { goals } = req.body
    if (!goals || typeof goals !== 'object') return res.status(400).json({ error: 'Missing goals object' })

    const { error } = await supabase
      .from('race_goals')
      .upsert({ user_id: userId, goals, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
