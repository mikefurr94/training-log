import type { VercelRequest, VercelResponse } from '@vercel/node'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-callback'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: String(athlete_id),
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return res.status(200).json({ url })
}
