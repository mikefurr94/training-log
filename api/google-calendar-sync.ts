import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/google-callback'
)

// Build a human-readable event title from a planned activity
function buildEventTitle(activity: any): string {
  switch (activity.type) {
    case 'Run':
      return `${activity.targetDistance} Mile Run`
    case 'Race':
      return activity.name || `Race${activity.distance ? ` — ${activity.distance}` : ''}`
    case 'WeightTraining':
      return `Weight Training — ${activity.workoutType || 'Workout'}`
    case 'Yoga':
      return 'Yoga'
    case 'Tennis':
      return 'Tennis'
    case 'Rest':
      return 'Rest Day'
    default:
      return 'Workout'
  }
}

// Build an event description with relevant details
function buildEventDescription(activity: any): string {
  const lines: string[] = []

  if (activity.type === 'Run') {
    if (activity.targetPace && activity.targetPace !== '0:00') {
      lines.push(`Target pace: ${activity.targetPace} /mi`)
    }
  }
  if (activity.type === 'Race') {
    if (activity.distance) lines.push(`Distance: ${activity.distance}`)
    if (activity.goalTime) lines.push(`Goal time: ${activity.goalTime}`)
    if (activity.targetPace) lines.push(`Target pace: ${activity.targetPace} /mi`)
  }
  if (activity.type === 'WeightTraining' && activity.exercises?.length) {
    lines.push('Exercises:')
    for (const ex of activity.exercises) {
      lines.push(`  • ${ex.name} — ${ex.sets}×${ex.reps}${ex.notes ? ` (${ex.notes})` : ''}`)
    }
  }
  if (activity.notes) {
    if (lines.length > 0) lines.push('')
    lines.push(activity.notes)
  }

  return lines.join('\n')
}

async function getAuthenticatedClient(athleteId: number) {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('athlete_id', athleteId)
    .single()

  if (error || !data) return null

  oauth2Client.setCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: data.expiry_date,
  })

  // Auto-refresh if expired
  oauth2Client.on('tokens', async (tokens) => {
    await supabase
      .from('google_tokens')
      .update({
        access_token: tokens.access_token,
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        expiry_date: tokens.expiry_date,
        updated_at: new Date().toISOString(),
      })
      .eq('athlete_id', athleteId)
  })

  return oauth2Client
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  // GET — check if Google Calendar is connected
  if (req.method === 'GET') {
    const { data } = await supabase
      .from('google_tokens')
      .select('athlete_id')
      .eq('athlete_id', athleteId)
      .single()

    return res.status(200).json({ connected: !!data })
  }

  // POST — create or update a calendar event
  if (req.method === 'POST') {
    const { activity, date, action } = req.body
    // action: 'upsert' | 'delete'

    const auth = await getAuthenticatedClient(athleteId)
    if (!auth) return res.status(401).json({ error: 'Google Calendar not connected' })

    const calendar = google.calendar({ version: 'v3', auth })
    const activityId = activity?.id

    if (action === 'delete' && activityId) {
      // Look up existing event
      const { data: mapping } = await supabase
        .from('google_calendar_events')
        .select('google_event_id')
        .eq('athlete_id', athleteId)
        .eq('activity_id', activityId)
        .single()

      if (mapping?.google_event_id) {
        try {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: mapping.google_event_id,
          })
        } catch (err: any) {
          // Event may have been manually deleted — that's fine
          if (err.code !== 404 && err.code !== 410) {
            console.error('Failed to delete calendar event:', err.message)
          }
        }
        await supabase
          .from('google_calendar_events')
          .delete()
          .eq('athlete_id', athleteId)
          .eq('activity_id', activityId)
      }

      return res.status(200).json({ ok: true })
    }

    // Upsert — create or update
    if (!activity || !date) {
      return res.status(400).json({ error: 'Missing activity or date' })
    }

    // Skip rest days
    if (activity.type === 'Rest') {
      return res.status(200).json({ ok: true, skipped: true })
    }

    const time = activity.scheduledTime || '07:00'
    const [hours, minutes] = time.split(':').map(Number)

    // Build start/end times (1 hour duration)
    const startDate = new Date(`${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // +1 hour

    const eventBody = {
      summary: buildEventTitle(activity),
      description: buildEventDescription(activity),
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/New_York',
      },
    }

    // Check for existing mapping
    const { data: existing } = await supabase
      .from('google_calendar_events')
      .select('google_event_id')
      .eq('athlete_id', athleteId)
      .eq('activity_id', activityId)
      .single()

    try {
      if (existing?.google_event_id) {
        // Update existing event
        await calendar.events.update({
          calendarId: 'primary',
          eventId: existing.google_event_id,
          requestBody: eventBody,
        })
        return res.status(200).json({ ok: true, updated: true })
      } else {
        // Create new event
        const event = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventBody,
        })

        // Store mapping
        await supabase
          .from('google_calendar_events')
          .upsert({
            athlete_id: athleteId,
            activity_id: activityId,
            google_event_id: event.data.id,
            date,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'athlete_id,activity_id' })

        return res.status(200).json({ ok: true, created: true, eventId: event.data.id })
      }
    } catch (err: any) {
      console.error('Google Calendar API error:', err.message)
      return res.status(500).json({ error: 'Failed to sync calendar event' })
    }
  }

  // DELETE — disconnect Google Calendar
  if (req.method === 'DELETE') {
    await supabase.from('google_tokens').delete().eq('athlete_id', athleteId)
    await supabase.from('google_calendar_events').delete().eq('athlete_id', athleteId)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
