import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { hashPassword, verifyPassword } from './_lib/password.js'
import {
  createSession,
  setSessionCookie,
  deleteSession,
  clearSessionCookie,
  getSessionUserId,
  requireSession,
} from './_lib/session.js'
import { disconnectStrava } from './_lib/stravaConnection.js'

// Consolidated into a single serverless function (dispatched by ?action=) to
// stay under Vercel's Hobby-plan function count limit — see individual
// handlers below for what each action does.

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!
const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'

async function handleSignup(req: VercelRequest, res: VercelResponse) {
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

async function handleLogin(req: VercelRequest, res: VercelResponse) {
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

async function handleLogout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  await deleteSession(req)
  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}

async function handleMe(req: VercelRequest, res: VercelResponse) {
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

async function handleStravaConnect(req: VercelRequest, res: VercelResponse) {
  const userId = await getSessionUserId(req)
  if (!userId) return res.redirect('/login')

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}

async function handleStravaCallback(req: VercelRequest, res: VercelResponse) {
  const userId = await getSessionUserId(req)
  if (!userId) return res.redirect('/login')

  const { code } = req.query
  if (!code || typeof code !== 'string') return res.redirect('/settings?strava=error')

  try {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      console.error('Strava token exchange failed:', await response.text())
      return res.redirect('/settings?strava=error')
    }

    const data = await response.json()
    const { access_token, refresh_token, expires_at, athlete } = data

    const { error } = await supabase.from('strava_connections').upsert({
      user_id: userId,
      athlete_id: athlete.id,
      access_token,
      refresh_token,
      expires_at,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) {
      console.error('Failed to store Strava connection:', error)
      return res.redirect('/settings?strava=error')
    }

    return res.redirect('/settings?strava=connected')
  } catch (err) {
    console.error('Strava callback error:', err)
    return res.redirect('/settings?strava=error')
  }
}

async function handleStravaDisconnect(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const userId = await requireSession(req, res)
  if (!userId) return

  await disconnectStrava(userId)
  return res.status(200).json({ ok: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action ?? '')

  switch (action) {
    case 'signup': return handleSignup(req, res)
    case 'login': return handleLogin(req, res)
    case 'logout': return handleLogout(req, res)
    case 'me': return handleMe(req, res)
    case 'strava-connect': return handleStravaConnect(req, res)
    case 'strava-callback': return handleStravaCallback(req, res)
    case 'strava-disconnect': return handleStravaDisconnect(req, res)
    default: return res.status(400).json({ error: 'Missing or invalid action' })
  }
}
