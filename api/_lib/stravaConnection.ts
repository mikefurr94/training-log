import { supabase } from './supabase.js'

const CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
const TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token'

export interface StravaConnection {
  accessToken: string
  athleteId: number
}

/**
 * Looks up the user's Strava connection, refreshing the access token if it's
 * near expiry. Returns null if the user has no connection, or if the stored
 * refresh token itself has been revoked/expired (caller should prompt reconnect).
 */
export async function getValidStravaConnection(userId: string): Promise<StravaConnection | null> {
  const { data, error } = await supabase
    .from('strava_connections')
    .select('athlete_id, access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  if (data.expires_at < Math.floor(Date.now() / 1000) + 60) {
    const refreshRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: data.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshRes.ok) return null

    const refreshed = await refreshRes.json()
    await supabase
      .from('strava_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: refreshed.expires_at,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return { accessToken: refreshed.access_token, athleteId: data.athlete_id }
  }

  return { accessToken: data.access_token, athleteId: data.athlete_id }
}

export async function disconnectStrava(userId: string): Promise<void> {
  await supabase.from('strava_connections').delete().eq('user_id', userId)
}
