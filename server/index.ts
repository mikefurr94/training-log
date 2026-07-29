import dotenv from 'dotenv'
// Load .env first, then .env.production for Supabase/Anthropic keys
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.production', override: true })

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())

// Serve Vercel serverless functions locally
// The handlers use VercelRequest/VercelResponse which are Express-compatible
function mount(route: string, modulePath: string) {
  app.all(route, async (req, res) => {
    try {
      const { default: handler } = await import(modulePath)
      await handler(req as any, res as any)
    } catch (err: any) {
      console.error(`[${route}] Error:`, err.message)
      res.status(500).json({ error: err.message })
    }
  })
}

mount('/api/auth', '../api/auth.js')

// Mirrors the prod vercel.json rewrite: /api/strava/:path* -> /api/strava?path=:path*
app.all('/api/strava/*', async (req, res) => {
  req.query.path = (req.params as unknown as Record<string, string>)[0]
  try {
    const { default: handler } = await import('../api/strava.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[/api/strava] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

mount('/api/plan', '../api/plan.js')
mount('/api/reflection', '../api/reflection.js')
mount('/api/coach-plan', '../api/coach-plan.js')
mount('/api/race-goals', '../api/race-goals.js')
mount('/api/activities', '../api/activities.js')
mount('/api/google-calendar', '../api/google-calendar.js')

// Local dev: mirror the /google-callback route Vercel handles via rewrite
app.all('/google-callback', async (req, res) => {
  req.query.path = 'callback'
  try {
    const { default: handler } = await import('../api/google-calendar.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[google-callback] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})
