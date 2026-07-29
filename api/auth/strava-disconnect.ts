import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireSession } from '../_lib/session.js'
import { disconnectStrava } from '../_lib/stravaConnection.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireSession(req, res)
  if (!userId) return

  await disconnectStrava(userId)
  return res.status(200).json({ ok: true })
}
