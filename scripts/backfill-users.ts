// One-off script: creates a user account for your existing Strava-linked data
// and backfills user_id on every row currently keyed by that athlete_id.
//
// Run AFTER supabase/migrations/20260728000000_auth_rewrite_part1.sql and
// BEFORE supabase/migrations/20260728000001_auth_rewrite_part2.sql.
//
// Usage: npx tsx scripts/backfill-users.ts
//
// A second account for another person (e.g. your wife) doesn't need this
// script — they can just use the app's /signup page once it's deployed,
// since they have no existing athlete_id-tagged data to migrate.

import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.production', override: true })

import readline from 'readline'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

const TABLES_WITH_ATHLETE_ID = [
  'activities',
  'race_goals',
  'coach_plans',
  'training_plan',
  'habit_definitions',
  'habit_completions',
  'google_tokens',
  'google_calendar_events',
  'reflection_conversations',
]

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer) }))
}

async function findDistinctAthleteIds(): Promise<number[]> {
  const found = new Set<number>()
  for (const table of TABLES_WITH_ATHLETE_ID) {
    const { data, error } = await supabase.from(table).select('athlete_id').not('athlete_id', 'is', null).limit(1000)
    if (error) {
      console.warn(`  (skipping ${table}: ${error.message})`)
      continue
    }
    for (const row of data ?? []) {
      if (row.athlete_id != null) found.add(Number(row.athlete_id))
    }
  }
  return [...found]
}

async function main() {
  console.log('Looking for existing athlete_id values across your tables...')
  const athleteIds = await findDistinctAthleteIds()

  if (athleteIds.length === 0) {
    console.log('No existing athlete_id-tagged data found. Nothing to backfill — just use /signup in the app.')
    return
  }
  if (athleteIds.length > 1) {
    console.log(`Found multiple distinct athlete_ids: ${athleteIds.join(', ')}`)
    console.log('This script only handles one at a time — rerun it for each.')
  }

  const athleteId = athleteIds.length === 1
    ? athleteIds[0]
    : Number(await ask(`Which athlete_id do you want to migrate? [${athleteIds.join(', ')}]: `))

  console.log(`Creating an account for athlete_id ${athleteId}.`)
  const username = (await ask('Username: ')).trim()
  const password = await ask('Password (min 8 characters): ')

  if (username.length < 3) throw new Error('Username must be at least 3 characters')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  const passwordHash = await bcrypt.hash(password, 12)

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ username, password_hash: passwordHash })
    .select('id, username')
    .single()

  if (userError) throw new Error(`Failed to create user: ${userError.message}`)
  console.log(`Created user ${user.username} (${user.id}).`)

  for (const table of TABLES_WITH_ATHLETE_ID) {
    const { error, count } = await supabase
      .from(table)
      .update({ user_id: user.id }, { count: 'exact' })
      .eq('athlete_id', athleteId)

    if (error) {
      console.warn(`  ${table}: skipped (${error.message})`)
    } else {
      console.log(`  ${table}: backfilled ${count ?? 0} row(s)`)
    }
  }

  console.log('\nDone. Next steps:')
  console.log('  1. Run supabase/migrations/20260728000001_auth_rewrite_part2.sql')
  console.log('  2. Log in as', username, 'and reconnect Strava from Settings (old tokens were never stored server-side, so this is a one-time reconnect).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
