import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { requireSession } from '../_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireSession(req, res)
  if (!userId) return

  const [{ data: user }, { data: connection }] = await Promise.all([
    supabase.from('users').select('id, username').eq('id', userId).single(),
    supabase.from('strava_connections').select('user_id').eq('user_id', userId).maybeSingle(),
  ])

  if (!user) return res.status(401).json({ error: 'Not authenticated' })

  return res.status(200).json({
    id: user.id,
    username: user.username,
    stravaConnected: !!connection,
  })
}
