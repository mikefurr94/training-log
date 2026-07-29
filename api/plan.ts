import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { requireSession } from './_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await requireSession(req, res)
  if (!userId) return

  // GET — load training plan for this user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('training_plan')
      .select('data')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[api/plan] GET error:', error)
      return res.status(500).json({ error: error.message, code: error.code, details: error.details, hint: error.hint })
    }

    return res.status(200).json(data?.data ?? {})
  }

  // POST — save training plan for this user
  if (req.method === 'POST') {
    const planData = req.body
    if (!planData) return res.status(400).json({ error: 'Missing plan data' })

    const { error } = await supabase
      .from('training_plan')
      .upsert({ user_id: userId, data: planData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' })

    if (error) {
      console.error('[api/plan] POST error:', error)
      return res.status(500).json({ error: error.message, code: error.code, details: error.details, hint: error.hint })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
