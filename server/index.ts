import dotenv from 'dotenv'
// Load .env first, then .env.production for Supabase/Anthropic keys
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.production', override: true })

import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())

app.use('/auth', authRouter)

// Serve Vercel serverless functions locally
// The handlers use VercelRequest/VercelResponse which are Express-compatible
app.all('/api/habits', async (req, res) => {
  try {
    const { default: handler } = await import('../api/habits.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/habits] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.all('/api/plan', async (req, res) => {
  try {
    const { default: handler } = await import('../api/plan.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/plan] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.all('/api/reflection', async (req, res) => {
  try {
    const { default: handler } = await import('../api/reflection.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/reflection] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.all('/api/activities', async (req, res) => {
  try {
    const { default: handler } = await import('../api/activities.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/activities] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.all('/api/google-auth', async (req, res) => {
  try {
    const { default: handler } = await import('../api/google-auth.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/google-auth] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.all('/api/google-callback', async (req, res) => {
  try {
    const { default: handler } = await import('../api/google-callback.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/google-callback] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.all('/api/google-calendar-sync', async (req, res) => {
  try {
    const { default: handler } = await import('../api/google-calendar-sync.js')
    await handler(req as any, res as any)
  } catch (err: any) {
    console.error('[api/google-calendar-sync] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`)
})
