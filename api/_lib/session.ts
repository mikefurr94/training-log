import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { supabase } from './supabase.js'

const COOKIE_NAME = 'session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const { error } = await supabase.from('sessions').insert({ token, user_id: userId, expires_at: expiresAt })
  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return token
}

export async function getSessionUserId(req: VercelRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie as string | undefined)
  const token = cookies[COOKIE_NAME]
  if (!token) return null

  const { data, error } = await supabase
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single()

  if (error || !data) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return data.user_id as string
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res: VercelResponse) {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export async function deleteSession(req: VercelRequest): Promise<void> {
  const cookies = parseCookies(req.headers.cookie as string | undefined)
  const token = cookies[COOKIE_NAME]
  if (!token) return
  await supabase.from('sessions').delete().eq('token', token)
}

/** Returns the current user's id, or writes a 401 response and returns null. */
export async function requireSession(req: VercelRequest, res: VercelResponse): Promise<string | null> {
  const userId = await getSessionUserId(req)
  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' })
    return null
  }
  return userId
}
