import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { hashPassword } from '../_lib/password.js'
import { createSession, setSessionCookie } from '../_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing username or password' })
  }

  const trimmedUsername = username.trim()
  if (trimmedUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const passwordHash = await hashPassword(password)

  const { data: user, error } = await supabase
    .from('users')
    .insert({ username: trimmedUsername, password_hash: passwordHash })
    .select('id, username')
    .single()

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Username already taken' })
    return res.status(500).json({ error: error.message })
  }

  const token = await createSession(user.id)
  setSessionCookie(res, token)
  return res.status(200).json({ id: user.id, username: user.username })
}
