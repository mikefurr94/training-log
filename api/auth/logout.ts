import type { VercelRequest, VercelResponse } from '@vercel/node'
import { deleteSession, clearSessionCookie } from '../_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  await deleteSession(req)
  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
