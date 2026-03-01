import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { addDays, format, startOfWeek, differenceInWeeks, parseISO } from 'date-fns'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const GENERATE_SYSTEM_PROMPT = `You are an expert marathon coach creating a personalized training plan. You understand periodization, progressive overload, recovery, tapering, and cross-training.

Return your plan as a JSON object with this exact structure:
{
  "weeks": [
    {
      "weekNumber": 1,
      "weekStart": "YYYY-MM-DD",
      "phase": "base" | "build" | "peak" | "taper" | "race",
      "totalMiles": number,
      "summary": "Brief description of the week's focus",
      "days": [
        {
          "date": "YYYY-MM-DD",
          "dayOfWeek": 0-6,
          "activities": [
            {
              "id": "unique-id",
              "type": "Run" | "WeightTraining" | "Yoga" | "Rest",
              "label": "Easy Run" | "Tempo Run" | "Long Run" | "Intervals" | "Recovery Run" | "Upper Body" | "Lower Body" | "Full Body" | "Yoga" | "Rest Day",
              "durationMinutes": number,
              "targetDistanceMiles": number (for runs),
              "targetPace": "M:SS" (for runs, optional),
              "intensity": "easy" | "moderate" | "hard" | "recovery"
            }
          ],
          "detailGenerated": false
        }
      ]
    }
  ]
}

Key principles:
- Build weekly mileage gradually (no more than 10% increase per week)
- Include a recovery week every 3-4 weeks (reduced volume by 20-30%)
- Taper for the final 2-3 weeks before race day
- Long runs on weekends, easy runs on weekdays
- Place strength training on non-hard-run days when possible
- One quality run per week (tempo, intervals, or race pace) during build/peak phases
- Rest days are important - don't schedule activities on rest days
- Each activity needs a unique id (use short random strings like "a1b2c3")

For the initial plan, provide summary-level activity descriptions only. Do NOT provide detailed workout breakdowns - those will be requested separately.

Return ONLY the JSON object, no other text.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query

  switch (action) {
    case 'plan':    return handlePlan(req, res)
    case 'generate': return handleGenerate(req, res)
    case 'detail':  return handleDetail(req, res)
    case 'adjust':  return handleAdjust(req, res)
    case 'checkin': return handleCheckin(req, res)
    default:
      return res.status(400).json({ error: 'Missing or invalid action' })
  }
}

// ── PLAN CRUD ──────────────────────────────────────────────────────────────

async function handlePlan(req: VercelRequest, res: VercelResponse) {
  const { athlete_id } = req.query
  if (!athlete_id) return res.status(400).json({ error: 'Missing athlete_id' })
  const athleteId = Number(athlete_id)

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('coach_plans')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message })
    }
    if (!data) return res.status(200).json({ plan: null })

    return res.status(200).json({
      plan: {
        id: data.id,
        athleteId: data.athlete_id,
        raceDate: data.race_date,
        raceDistance: data.race_distance,
        raceGoal: data.race_goal,
        goalTimeSeconds: data.goal_time_seconds,
        daysPerWeekRun: data.days_per_week_run,
        daysPerWeekStrength: data.days_per_week_strength,
        strengthTypes: data.strength_types,
        includeYoga: data.include_yoga,
        fitnessSummary: data.fitness_summary,
        planStartDate: data.plan_start_date,
        planWeeks: data.plan_weeks,
        weeks: data.weekly_plan?.weeks ?? [],
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    })
  }

  if (req.method === 'POST') {
    const plan = req.body
    if (!plan) return res.status(400).json({ error: 'Missing plan data' })

    const row = {
      id: plan.id,
      athlete_id: athleteId,
      race_date: plan.raceDate,
      race_distance: plan.raceDistance,
      race_goal: plan.raceGoal,
      goal_time_seconds: plan.goalTimeSeconds ?? null,
      days_per_week_run: plan.daysPerWeekRun,
      days_per_week_strength: plan.daysPerWeekStrength,
      strength_types: plan.strengthTypes,
      include_yoga: plan.includeYoga,
      fitness_summary: plan.fitnessSummary,
      plan_start_date: plan.planStartDate,
      plan_weeks: plan.planWeeks,
      weekly_plan: { weeks: plan.weeks },
      status: plan.status ?? 'active',
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('coach_plans')
      .upsert(row, { onConflict: 'id' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing plan id' })

    const { error } = await supabase
      .from('coach_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('athlete_id', athleteId)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

// ── GENERATE ───────────────────────────────────────────────────────────────

async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    athlete_id,
    raceDate,
    raceDistance,
    raceGoal,
    goalTimeSeconds,
    daysPerWeekRun,
    daysPerWeekStrength,
    strengthTypes,
    includeYoga,
    fitnessSummary,
  } = req.body

  if (!athlete_id || !raceDate || !raceDistance) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const today = new Date()
  const planStart = startOfWeek(today, { weekStartsOn: 1 })
  const raceDateParsed = parseISO(raceDate)
  const planWeeks = Math.max(4, differenceInWeeks(raceDateParsed, planStart))

  const weekStarts = Array.from({ length: planWeeks }, (_, i) =>
    format(addDays(planStart, i * 7), 'yyyy-MM-dd')
  )

  const goalText =
    raceGoal === 'time_target' && goalTimeSeconds
      ? `Target time: ${formatTime(goalTimeSeconds)}`
      : raceGoal === 'bq'
        ? 'Boston Qualifying time'
        : raceGoal === 'pr'
          ? 'Personal Record'
          : 'Finish the race'

  const distanceLabel =
    ({ marathon: 'marathon (26.2 miles)', half_marathon: 'half marathon (13.1 miles)', '10k': '10K (6.2 miles)', '5k': '5K (3.1 miles)' } as Record<string, string>)[raceDistance] ?? raceDistance

  const userPrompt = `Create a ${distanceLabel} training plan.

Race date: ${raceDate}
Plan start: ${format(planStart, 'yyyy-MM-dd')}
Total weeks: ${planWeeks}
Week start dates (Mondays): ${weekStarts.join(', ')}

Athlete profile:
- Goal: ${goalText}
- Running days per week: ${daysPerWeekRun}
- Strength training days per week: ${daysPerWeekStrength}${daysPerWeekStrength > 0 ? ` (focus: ${strengthTypes.join(', ')})` : ''}
- Include yoga/recovery sessions: ${includeYoga ? 'yes' : 'no'}
- Current fitness: avg ${fitnessSummary?.avgWeeklyMiles ?? 0} miles/week, ${fitnessSummary?.avgRunsPerWeek ?? 0} runs/week, avg pace ${fitnessSummary?.avgPace ?? 'unknown'}, longest recent run ${fitnessSummary?.longestRecentRun ?? 0} miles, trend: ${fitnessSummary?.recentTrend ?? 'unknown'}

Each week should have exactly 7 days (Monday through Sunday). Use the week start dates provided. Generate the complete plan as JSON.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      system: GENERATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' })

    const planData = JSON.parse(jsonMatch[0])
    const planId = randomUUID()

    const plan = {
      id: planId,
      athleteId: athlete_id,
      raceDate,
      raceDistance,
      raceGoal,
      goalTimeSeconds: goalTimeSeconds ?? null,
      daysPerWeekRun,
      daysPerWeekStrength,
      strengthTypes,
      includeYoga,
      fitnessSummary,
      planStartDate: format(planStart, 'yyyy-MM-dd'),
      planWeeks,
      weeks: planData.weeks,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Archive any existing active plan first
    await supabase
      .from('coach_plans')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('athlete_id', athlete_id)
      .eq('status', 'active')

    const { error: insertError } = await supabase.from('coach_plans').insert({
      id: planId,
      athlete_id,
      race_date: raceDate,
      race_distance: raceDistance,
      race_goal: raceGoal,
      goal_time_seconds: goalTimeSeconds ?? null,
      days_per_week_run: daysPerWeekRun,
      days_per_week_strength: daysPerWeekStrength,
      strength_types: strengthTypes,
      include_yoga: includeYoga,
      fitness_summary: fitnessSummary,
      plan_start_date: format(planStart, 'yyyy-MM-dd'),
      plan_weeks: planWeeks,
      weekly_plan: { weeks: planData.weeks },
      status: 'active',
      generation_prompt: userPrompt,
    })

    if (insertError) console.error('Failed to save plan:', insertError)

    return res.status(200).json(plan)
  } catch (err) {
    console.error('Plan generation error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to generate plan',
    })
  }
}

// ── DETAIL ─────────────────────────────────────────────────────────────────

async function handleDetail(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { plan_id, date, weekContext, activity } = req.body
  if (!plan_id || !date || !weekContext || !activity) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `Provide detailed workout instructions for ${date} in week ${weekContext.weekNumber} (${weekContext.phase} phase) of a training plan.

Week context: ${weekContext.summary}
Activity: ${activity.label}${activity.targetDistanceMiles ? ` - ${activity.targetDistanceMiles} miles` : ''}${activity.intensity ? ` at ${activity.intensity} intensity` : ''}

Provide specific instructions including:
- Warm-up protocol
- Main workout details (splits, paces, reps if intervals, or specific exercises/sets/reps for strength)
- Cool-down
- Effort/heart rate guidance
- Notes on what to feel/focus on

Keep the response concise but actionable. Use plain text formatting with line breaks.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const detail = message.content[0].type === 'text' ? message.content[0].text : ''

    // Cache the detail in the plan's weekly_plan JSONB
    try {
      const { data: planRow } = await supabase
        .from('coach_plans')
        .select('weekly_plan')
        .eq('id', plan_id)
        .single()

      if (planRow?.weekly_plan?.weeks) {
        const weeks = planRow.weekly_plan.weeks.map((week: { days: { date: string; detailGenerated: boolean; activities: { id: string; label: string; detail?: string }[] }[] }) => ({
          ...week,
          days: week.days.map((day: { date: string; detailGenerated: boolean; activities: { id: string; label: string; detail?: string }[] }) =>
            day.date === date
              ? {
                  ...day,
                  detailGenerated: true,
                  activities: day.activities.map((a: { id: string; label: string; detail?: string }) =>
                    a.label === activity.label ? { ...a, detail } : a
                  ),
                }
              : day
          ),
        }))

        await supabase
          .from('coach_plans')
          .update({ weekly_plan: { weeks }, updated_at: new Date().toISOString() })
          .eq('id', plan_id)
      }
    } catch (err) {
      console.error('Failed to cache detail:', err)
    }

    return res.status(200).json({ detail })
  } catch (err) {
    console.error('Detail generation error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to generate detail',
    })
  }
}

// ── ADJUST ─────────────────────────────────────────────────────────────────

async function handleAdjust(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { request, context } = req.body
  if (!request || !context) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `You are a marathon training coach. The athlete has asked you to adjust their training plan.

Current week: ${context.currentWeek}
Remaining plan weeks: ${JSON.stringify(context.remainingWeeks, null, 2)}

Athlete's request: "${request}"

Modify the remaining weeks as needed to accommodate the request. Return a JSON object with:
{
  "explanation": "Brief explanation of what you changed and why",
  "weeks": [... the modified remaining weeks in the same format as provided]
}

Return ONLY the JSON object.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' })

    return res.status(200).json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Adjust error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to adjust plan',
    })
  }
}

// ── CHECKIN ────────────────────────────────────────────────────────────────

async function handleCheckin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { weeksCompleted } = req.body
  if (!weeksCompleted) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const prompt = `You are a marathon training coach reviewing an athlete's recent training progress.

Here is the data for the completed weeks (planned vs actual):
${JSON.stringify(weeksCompleted, null, 2)}

Provide a brief, encouraging check-in with:
1. A summary of how they're doing (completion rate, consistency)
2. What's going well
3. Any concerns or areas to watch
4. 1-2 specific, actionable suggestions for the upcoming week

Keep the tone supportive and motivating. Be specific to their data. Keep the response under 200 words.

Return a JSON object:
{
  "suggestions": "Your check-in message here as a single string with line breaks"
}

Return ONLY the JSON object.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' })

    return res.status(200).json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Checkin error:', err)
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to generate check-in',
    })
  }
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
