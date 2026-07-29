import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSessionUserId } from '../_lib/session.js'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = await getSessionUserId(req)
  if (!userId) return res.redirect('/login')

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
  })
  return res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`)
}
