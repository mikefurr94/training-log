import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_weekly_stats',
    description: 'Get aggregated weekly training statistics for a date range. Returns per-week breakdown of miles, run count, total activities, average pace, average heart rate, and session counts by type.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_activities',
    description: 'Get a list of individual activities for a date range. Each activity includes name, type, distance (miles), duration, pace, heart rate, elevation, and date. Use this when you need activity-level detail rather than aggregated stats.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        activity_type: { type: 'string', description: 'Optional filter: Run, WeightTraining, Yoga, Tennis, or all (default)' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_habit_data',
    description: 'Get habit completion data for a date range. Returns daily completion records showing which habits were completed each day, plus summary statistics.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_training_plan',
    description: 'Get the athlete\'s current active training plan. Returns the full plan including race details, preferences, and all weeks with daily activities. Returns null if no active plan exists.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'save_training_plan',
    description: 'Save a structured multi-week training plan. Archives any existing active plan and creates a new one. Each week should have activities for each day using the PlannedActivity types: Run (with targetDistance in miles, targetPace as "MM:SS"), WeightTraining (with workoutType: Upper Body/Lower Body/Full Body/Core/Push/Pull/Legs), Yoga, Tennis, Rest, or Race.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Plan name, e.g. "Brooklyn Half Marathon Plan"' },
        raceName: { type: 'string', description: 'Race name' },
        raceDate: { type: 'string', description: 'Race date in YYYY-MM-DD format' },
        raceDistance: { type: 'string', description: 'Race distance (5K, 10 Miler, Half Marathon, Marathon)' },
        goalTime: { type: 'string', description: 'Goal time in H:MM:SS format' },
        preferences: {
          type: 'object',
          description: 'Training preferences',
          properties: {
            runDaysPerWeek: { type: 'number' },
            liftDaysPerWeek: { type: 'number' },
            planWeeks: { type: 'number' },
            currentWeeklyMileage: { type: 'number' },
            experienceLevel: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            notes: { type: 'string' },
          },
          required: ['runDaysPerWeek', 'liftDaysPerWeek', 'planWeeks'],
        },
        weeks: {
          type: 'array',
          description: 'Array of week objects, each with weekNumber, weekStart (YYYY-MM-DD), label (phase name), and days (Record of day index 0-6 → PlannedActivity[]). Day 0 = Sunday.',
          items: {
            type: 'object',
            properties: {
              weekNumber: { type: 'number' },
              weekStart: { type: 'string', description: 'YYYY-MM-DD of the Sunday starting this week' },
              label: { type: 'string', description: 'Phase label like "Base Building", "Speed Work", "Taper"' },
              days: {
                type: 'object',
                description: 'Record mapping day index (0=Sun, 1=Mon, ..., 6=Sat) to arrays of PlannedActivity objects. Each activity needs an id (8-char random string), type, and type-specific fields.',
              },
            },
            required: ['weekNumber', 'weekStart', 'label', 'days'],
          },
        },
      },
      required: ['name', 'weeks'],
    },
  },
  {
    name: 'update_training_plan',
    description: 'Update specific weeks in the athlete\'s active training plan. Merges the provided week updates into the existing plan.',
    input_schema: {
      type: 'object' as const,
      properties: {
        updates: {
          type: 'array',
          description: 'Array of week updates to merge into the plan',
          items: {
            type: 'object',
            properties: {
              weekNumber: { type: 'number', description: 'Which week to update (1-based)' },
              days: { type: 'object', description: 'Partial or full days record to merge' },
              label: { type: 'string', description: 'Optional new label for this week' },
            },
            required: ['weekNumber'],
          },
        },
      },
      required: ['updates'],
    },
  },
  {
    name: 'render_chart',
    description: 'Render an inline chart in the chat. Use this to create visual data representations. The chart will be displayed directly in the conversation. Always prefer charts when the user asks to "plot", "show", "graph", or "visualize" data.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['bar', 'line', 'area'], description: 'Chart type' },
        title: { type: 'string', description: 'Chart title' },
        data: {
          type: 'array',
          description: 'Array of data objects for the chart',
          items: { type: 'object' },
        },
        xKey: { type: 'string', description: 'Key in data objects to use for X axis' },
        series: {
          type: 'array',
          description: 'Array of series to plot',
          items: {
            type: 'object',
            properties: {
              dataKey: { type: 'string', description: 'Key in data objects for this series' },
              label: { type: 'string', description: 'Display label for this series' },
              color: { type: 'string', description: 'Hex color for this series (e.g. #6366f1)' },
            },
            required: ['dataKey', 'label', 'color'],
          },
        },
        xLabel: { type: 'string', description: 'Optional X axis label' },
        yLabel: { type: 'string', description: 'Optional Y axis label' },
      },
      required: ['type', 'title', 'data', 'xKey', 'series'],
    },
  },
]

// ── Tool Execution ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>

const METERS_PER_MILE = 1609.344

function metersToMiles(m: number): number {
  return Math.round((m / METERS_PER_MILE) * 100) / 100
}

function formatPace(speedMs: number): string {
  if (!speedMs || speedMs <= 0) return '-'
  const paceMinPerMile = (METERS_PER_MILE / speedMs) / 60
  const mins = Math.floor(paceMinPerMile)
  const secs = Math.round((paceMinPerMile - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

// Normalize Strava type to our types
function normalizeType(stravaType: string): string {
  const map: Record<string, string> = {
    Run: 'Run', TrailRun: 'Run', VirtualRun: 'Run', Treadmill: 'Run',
    WeightTraining: 'WeightTraining', Workout: 'WeightTraining', CrossFit: 'WeightTraining',
    Yoga: 'Yoga', Pilates: 'Yoga', Stretching: 'Yoga',
    Tennis: 'Tennis', Squash: 'Tennis', Racquetball: 'Tennis', Badminton: 'Tennis',
    Pickleball: 'Tennis', TableTennis: 'Tennis',
  }
  return map[stravaType] ?? 'Other'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr)
  // Get Monday of that week
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  const month = monday.toLocaleString('en-US', { month: 'short' })
  return `${month} ${monday.getDate()}`
}

async function executeGetWeeklyStats(athleteId: number, input: ToolInput): Promise<string> {
  const { start_date, end_date } = input
  const { data, error } = await supabase
    .from('activities')
    .select('data')
    .eq('athlete_id', athleteId)
    .gte('data->>start_date_local', `${start_date}T00:00:00`)
    .lte('data->>start_date_local', `${end_date}T23:59:59`)

  if (error) return JSON.stringify({ error: error.message })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities = (data ?? []).map((r: any) => r.data)
    .filter((a: ToolInput) => !['Walk', 'Hike'].includes(a.type))

  // Group by week (Monday-based)
  const weeks: Record<string, ToolInput[]> = {}
  for (const a of activities) {
    const weekKey = getWeekLabel(a.start_date_local)
    if (!weeks[weekKey]) weeks[weekKey] = []
    weeks[weekKey].push(a)
  }

  const weekStats = Object.entries(weeks).map(([week, acts]) => {
    const runs = acts.filter((a) => normalizeType(a.type) === 'Run')
    const totalMiles = metersToMiles(runs.reduce((sum, a) => sum + (a.distance || 0), 0))
    const avgPaces = runs.filter((a) => a.average_speed > 0)
    const avgPace = avgPaces.length > 0
      ? formatPace(avgPaces.reduce((sum, a) => sum + a.average_speed, 0) / avgPaces.length)
      : '-'
    const hrsRuns = runs.filter((a) => a.average_heartrate)
    const avgHR = hrsRuns.length > 0
      ? Math.round(hrsRuns.reduce((sum, a) => sum + a.average_heartrate, 0) / hrsRuns.length)
      : null
    const totalTime = acts.reduce((sum, a) => sum + (a.moving_time || 0), 0)

    return {
      week,
      totalActivities: acts.length,
      runs: runs.length,
      totalMiles,
      avgPace,
      avgHeartRate: avgHR,
      weights: acts.filter((a) => normalizeType(a.type) === 'WeightTraining').length,
      yoga: acts.filter((a) => normalizeType(a.type) === 'Yoga').length,
      tennis: acts.filter((a) => normalizeType(a.type) === 'Tennis').length,
      totalTime: formatDuration(totalTime),
    }
  })

  return JSON.stringify({ weeks: weekStats, totalActivities: activities.length })
}

async function executeGetActivities(athleteId: number, input: ToolInput): Promise<string> {
  const { start_date, end_date, activity_type } = input
  const { data, error } = await supabase
    .from('activities')
    .select('data')
    .eq('athlete_id', athleteId)
    .gte('data->>start_date_local', `${start_date}T00:00:00`)
    .lte('data->>start_date_local', `${end_date}T23:59:59`)

  if (error) return JSON.stringify({ error: error.message })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activities = (data ?? []).map((r: any) => r.data)
    .filter((a: ToolInput) => !['Walk', 'Hike'].includes(a.type))

  if (activity_type && activity_type !== 'all') {
    activities = activities.filter((a: ToolInput) => normalizeType(a.type) === activity_type)
  }

  // Sort by date
  activities.sort((a: ToolInput, b: ToolInput) =>
    new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  )

  // Map to a useful format (limit to 100 for context size)
  const mapped = activities.slice(0, 100).map((a: ToolInput) => ({
    name: a.name,
    type: normalizeType(a.type),
    date: a.start_date_local?.slice(0, 10),
    distanceMiles: metersToMiles(a.distance || 0),
    duration: formatDuration(a.moving_time || 0),
    pace: a.average_speed > 0 ? formatPace(a.average_speed) : null,
    avgHeartRate: a.average_heartrate ?? null,
    maxHeartRate: a.max_heartrate ?? null,
    elevationGainFt: a.total_elevation_gain ? Math.round(a.total_elevation_gain * 3.28084) : 0,
    calories: a.calories ?? null,
  }))

  return JSON.stringify({
    activities: mapped,
    total: activities.length,
    showing: mapped.length,
  })
}

async function executeGetHabitData(athleteId: number, input: ToolInput): Promise<string> {
  const { start_date, end_date } = input
  const { data, error } = await supabase
    .from('habit_completions')
    .select('date, habit_ids')
    .eq('athlete_id', athleteId)
    .gte('date', start_date)
    .lte('date', end_date)

  if (error) return JSON.stringify({ error: error.message })

  const records = data ?? []
  const totalDays = Math.ceil(
    (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1

  // Count completions per habit
  const habitCounts: Record<string, number> = {}
  for (const row of records) {
    for (const id of row.habit_ids ?? []) {
      habitCounts[id] = (habitCounts[id] || 0) + 1
    }
  }

  return JSON.stringify({
    totalDays,
    daysWithCompletions: records.length,
    habitCompletionRates: Object.entries(habitCounts).map(([id, count]) => ({
      habitId: id,
      completions: count,
      rate: `${Math.round((count / totalDays) * 100)}%`,
    })),
    dailyRecords: records.slice(0, 60), // Limit for context size
  })
}

// ── Training Plan Tool Execution ────────────────────────────────────────────

async function executeGetTrainingPlan(athleteId: number): Promise<string> {
  const { data, error } = await supabase
    .from('coach_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return JSON.stringify({ error: error.message })
  if (!data) return JSON.stringify({ plan: null, message: 'No active training plan found.' })

  return JSON.stringify({
    plan: {
      id: data.id,
      name: data.name,
      raceName: data.race_name,
      raceDate: data.race_date,
      raceDistance: data.race_distance,
      goalTime: data.goal_time,
      preferences: data.preferences,
      weeks: data.weeks,
      status: data.status,
      conversationId: data.conversation_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  })
}

async function executeSaveTrainingPlan(
  athleteId: number,
  input: ToolInput,
  conversationId: string | null,
): Promise<{ result: string; plan: ToolInput | null }> {
  // Archive any existing active plan
  await supabase
    .from('coach_plans')
    .update({ status: 'archived' })
    .eq('athlete_id', athleteId)
    .eq('status', 'active')

  // Insert new plan
  const { data, error } = await supabase
    .from('coach_plans')
    .insert({
      athlete_id: athleteId,
      name: input.name,
      race_name: input.raceName ?? null,
      race_date: input.raceDate ?? null,
      race_distance: input.raceDistance ?? null,
      goal_time: input.goalTime ?? null,
      preferences: input.preferences ?? {},
      weeks: input.weeks ?? [],
      status: 'active',
      conversation_id: conversationId,
    })
    .select()
    .single()

  if (error) return { result: JSON.stringify({ error: error.message }), plan: null }

  const plan = {
    id: data.id,
    athleteId: data.athlete_id,
    name: data.name,
    raceName: data.race_name,
    raceDate: data.race_date,
    raceDistance: data.race_distance,
    goalTime: data.goal_time,
    preferences: data.preferences,
    weeks: data.weeks,
    status: data.status,
    conversationId: data.conversation_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return {
    result: JSON.stringify({ success: true, planId: data.id, message: 'Training plan saved successfully.' }),
    plan,
  }
}

async function executeUpdateTrainingPlan(
  athleteId: number,
  input: ToolInput,
): Promise<{ result: string; plan: ToolInput | null }> {
  // Load current plan
  const { data: current, error: loadErr } = await supabase
    .from('coach_plans')
    .select('*')
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (loadErr) return { result: JSON.stringify({ error: loadErr.message }), plan: null }
  if (!current) return { result: JSON.stringify({ error: 'No active plan to update.' }), plan: null }

  // Merge updates into weeks
  const weeks = [...(current.weeks ?? [])]
  for (const update of input.updates ?? []) {
    const idx = weeks.findIndex((w: ToolInput) => w.weekNumber === update.weekNumber)
    if (idx >= 0) {
      if (update.days) weeks[idx].days = { ...weeks[idx].days, ...update.days }
      if (update.label) weeks[idx].label = update.label
    }
  }

  const { data, error } = await supabase
    .from('coach_plans')
    .update({ weeks, updated_at: new Date().toISOString() })
    .eq('id', current.id)
    .select()
    .single()

  if (error) return { result: JSON.stringify({ error: error.message }), plan: null }

  const plan = {
    id: data.id,
    athleteId: data.athlete_id,
    name: data.name,
    raceName: data.race_name,
    raceDate: data.race_date,
    raceDistance: data.race_distance,
    goalTime: data.goal_time,
    preferences: data.preferences,
    weeks: data.weeks,
    status: data.status,
    conversationId: data.conversation_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return {
    result: JSON.stringify({ success: true, message: 'Training plan updated successfully.' }),
    plan,
  }
}

// ── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a training coach helping an athlete with their workouts and training plans. You have access to their Strava activity data, habit tracking data, training plan tools, and can create charts.

Key guidelines:
- Be concise and insightful. Focus on actionable observations.
- When the user asks to plot, graph, show, or visualize data, ALWAYS use the render_chart tool.
- Use miles for distance (the data is already in miles when returned by tools).
- When showing weekly trends, a bar chart works well for volume and a line chart for pace/HR.
- Format pace as min:sec per mile (e.g., 8:30).
- Activity types available: Run, WeightTraining, Yoga, Tennis.
- Today's date is ${new Date().toISOString().slice(0, 10)}.
- When the user says "this year" use Jan 1 of the current year to today.
- When the user says "last N weeks" calculate the date range from today.
- If no date range is specified, default to the last 8 weeks.
- Pick good chart colors: use #6366f1 (indigo) for primary metrics, #f59e0b (amber) for secondary, #10b981 (green) for positive indicators, #ef4444 (red) for intensity/HR.

Training Plan guidelines:
- The athlete may have an active training plan. Use get_training_plan to check.
- When asked to create a training plan, generate a week-by-week schedule using save_training_plan.
- Each day should have PlannedActivity objects matching the app's type system:
  - Run: { id: "8-char", type: "Run", targetDistance: number (miles), targetPace: "MM:SS" }
  - WeightTraining: { id: "8-char", type: "WeightTraining", workoutType: "Upper Body"|"Lower Body"|"Full Body"|"Core"|"Push"|"Pull"|"Legs" }
  - Yoga: { id: "8-char", type: "Yoga" }
  - Tennis: { id: "8-char", type: "Tennis" }
  - Rest: { id: "8-char", type: "Rest" }
  - Race: { id: "8-char", type: "Race", name: "...", distance: "Half Marathon", goalTime: "H:MM:SS", targetPace: "MM:SS" }
- Each activity needs a unique 8-character alphanumeric id.
- Day indices: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.
- weekStart should be the Sunday starting each week, in YYYY-MM-DD format.
- For plan generation, work backwards from the race date to determine week starts.
- Use progressive overload: gradually increase mileage, add intensity in middle weeks, taper before race.
- Include rest days, easy runs, tempo runs, long runs, and speed work as appropriate for the experience level.
- When asked about progress against the plan, use get_training_plan + get_activities to compare actual vs planned.
- When asked to adjust the plan, use update_training_plan to modify specific weeks.`
}

// ── SSE Helpers ──────────────────────────────────────────────────────────────

function sseWrite(res: VercelResponse, event: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

// ── Auto-title Generation ───────────────────────────────────────────────────

async function generateTitle(userMessage: string, assistantMessage: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Summarize this conversation in 3-5 words for a sidebar title. No quotes, no punctuation. User asked: "${userMessage.slice(0, 100)}" Assistant started with: "${assistantMessage.slice(0, 100)}"`,
      }],
    })
    const block = response.content[0]
    if (block.type === 'text') return block.text.trim()
    return 'New conversation'
  } catch {
    return userMessage.slice(0, 40)
  }
}

// ── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET — list conversations or load messages
  if (req.method === 'GET') {
    const { athlete_id, conversation_id } = req.query

    if (conversation_id) {
      // Load messages for a conversation
      const { data, error } = await supabase
        .from('reflection_messages')
        .select('*')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })

      if (error) return res.status(500).json({ error: error.message })

      const messages = (data ?? []).map((r) => ({
        id: r.id,
        role: r.role,
        content: r.content,
        charts: r.charts,
        createdAt: r.created_at,
      }))
      return res.status(200).json({ messages })
    }

    if (athlete_id) {
      // List conversations
      const { data, error } = await supabase
        .from('reflection_conversations')
        .select('*')
        .eq('athlete_id', Number(athlete_id))
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) return res.status(500).json({ error: error.message })

      const conversations = (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
      return res.status(200).json({ conversations })
    }

    return res.status(400).json({ error: 'Missing athlete_id or conversation_id' })
  }

  // DELETE — delete a conversation
  if (req.method === 'DELETE') {
    const { conversation_id } = req.query
    if (!conversation_id) return res.status(400).json({ error: 'Missing conversation_id' })

    const { error } = await supabase
      .from('reflection_conversations')
      .delete()
      .eq('id', conversation_id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // POST — send message with SSE streaming
  if (req.method === 'POST') {
    const { athlete_id, conversation_id, message, history } = req.body
    if (!athlete_id || !message) {
      return res.status(400).json({ error: 'Missing athlete_id or message' })
    }

    const athleteId = Number(athlete_id)

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    try {
      // Create or get conversation
      let convId = conversation_id
      let isNewConversation = false

      if (!convId) {
        const { data: conv, error } = await supabase
          .from('reflection_conversations')
          .insert({ athlete_id: athleteId, title: 'New conversation' })
          .select()
          .single()

        if (error) throw error
        convId = conv.id
        isNewConversation = true
        sseWrite(res, { type: 'conversation', id: convId })
      }

      // Save user message
      await supabase.from('reflection_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      })

      // Build messages for Claude
      const claudeMessages: Anthropic.MessageParam[] = [
        ...(history ?? []).map((h: { role: string; content: string }) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: message },
      ]

      // Stream with tool-use loop
      let accumulatedText = ''
      const charts: ToolInput[] = []
      let continueLoop = true

      while (continueLoop) {
        const stream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: buildSystemPrompt(),
          tools: TOOLS,
          messages: claudeMessages,
        })

        let currentToolUse: { id: string; name: string; input: string } | null = null
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        let hasToolUse = false

        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'text') {
              // Text block starting
            } else if (event.content_block.type === 'tool_use') {
              hasToolUse = true
              currentToolUse = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: '',
              }
              const statusMap: Record<string, string> = {
                get_weekly_stats: 'Fetching weekly stats...',
                get_activities: 'Loading activities...',
                get_habit_data: 'Checking habit data...',
                render_chart: 'Creating chart...',
                get_training_plan: 'Loading training plan...',
                save_training_plan: 'Saving training plan...',
                update_training_plan: 'Updating training plan...',
              }
              sseWrite(res, {
                type: 'tool_status',
                message: statusMap[event.content_block.name] ?? 'Processing...',
              })
            }
          } else if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              accumulatedText += event.delta.text
              sseWrite(res, { type: 'text', content: event.delta.text })
            } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.input += event.delta.partial_json
            }
          } else if (event.type === 'content_block_stop') {
            if (currentToolUse) {
              let parsedInput: ToolInput = {}
              try {
                parsedInput = JSON.parse(currentToolUse.input)
              } catch { /* empty */ }

              // Execute tool
              let toolResult: string
              if (currentToolUse.name === 'render_chart') {
                charts.push(parsedInput)
                sseWrite(res, { type: 'chart', spec: parsedInput })
                toolResult = JSON.stringify({ success: true, message: 'Chart rendered successfully.' })
              } else if (currentToolUse.name === 'get_weekly_stats') {
                toolResult = await executeGetWeeklyStats(athleteId, parsedInput)
              } else if (currentToolUse.name === 'get_activities') {
                toolResult = await executeGetActivities(athleteId, parsedInput)
              } else if (currentToolUse.name === 'get_habit_data') {
                toolResult = await executeGetHabitData(athleteId, parsedInput)
              } else if (currentToolUse.name === 'get_training_plan') {
                toolResult = await executeGetTrainingPlan(athleteId)
              } else if (currentToolUse.name === 'save_training_plan') {
                const { result, plan } = await executeSaveTrainingPlan(athleteId, parsedInput, convId)
                toolResult = result
                if (plan) sseWrite(res, { type: 'plan_saved', plan })
              } else if (currentToolUse.name === 'update_training_plan') {
                const { result, plan } = await executeUpdateTrainingPlan(athleteId, parsedInput)
                toolResult = result
                if (plan) sseWrite(res, { type: 'plan_updated', plan })
              } else {
                toolResult = JSON.stringify({ error: 'Unknown tool' })
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: currentToolUse.id,
                content: toolResult,
              })

              currentToolUse = null
            } else {
              // Text block stopped — capture it
              // We already streamed text deltas, but need to track for contentBlocks
            }
          } else if (event.type === 'message_stop') {
            // Message complete
          }
        }

        // If there were tool calls, add assistant message + tool results and continue
        if (hasToolUse && toolResults.length > 0) {
          const finalMessage = await stream.finalMessage()
          claudeMessages.push({
            role: 'assistant',
            content: finalMessage.content,
          })
          claudeMessages.push({
            role: 'user',
            content: toolResults,
          })
          // Continue the loop to get Claude's response after tools
          continueLoop = true
        } else {
          continueLoop = false
        }
      }

      // Save assistant message
      const { data: savedMsg } = await supabase
        .from('reflection_messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          content: accumulatedText,
          charts: charts.length > 0 ? charts : null,
        })
        .select('id')
        .single()

      // Auto-title for new conversations
      if (isNewConversation && accumulatedText) {
        const title = await generateTitle(message, accumulatedText)
        await supabase
          .from('reflection_conversations')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', convId)

        sseWrite(res, {
          type: 'done',
          message_id: savedMsg?.id,
          conversation: { id: convId, title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        })
      } else {
        // Update conversation timestamp
        await supabase
          .from('reflection_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', convId)

        // Fetch updated conversation for sidebar
        const { data: conv } = await supabase
          .from('reflection_conversations')
          .select('*')
          .eq('id', convId)
          .single()

        sseWrite(res, {
          type: 'done',
          message_id: savedMsg?.id,
          conversation: conv ? {
            id: conv.id,
            title: conv.title,
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
          } : null,
        })
      }

      res.write('data: [DONE]\n\n')
      res.end()
    } catch (err) {
      console.error('[reflection] Error:', err)
      sseWrite(res, { type: 'error', message: String(err) })
      res.end()
    }
    return
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
