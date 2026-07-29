import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { verifyPassword } from '../_lib/password.js'
import { createSession, setSessionCookie } from '../_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing username or password' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, password_hash')
    .eq('username', username.trim())
    .single()

  if (error || !user) return res.status(401).json({ error: 'Invalid username or password' })

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Invalid username or password' })

  const token = await createSession(user.id)
  setSessionCookie(res, token)
  return res.status(200).json({ id: user.id, username: user.username })
}
