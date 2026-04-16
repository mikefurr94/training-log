# TrainingLog Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            BROWSER (SPA)                                │
│                                                                         │
│   React 18 + TypeScript + Vite                                          │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ │
│   │ Calendar  │ │ Dashboard │ │   Coach   │ │  Week    │ │  Race    │ │
│   │   Page    │ │   Page    │ │   Page    │ │  Review  │ │Predictor │ │
│   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘ │
│         │              │             │             │            │       │
│   ┌─────┴──────────────┴─────────────┴─────────────┴────────────┴─────┐ │
│   │                     Zustand Store (persisted to localStorage)      │ │
│   │  Auth │ Activities │ Plans │ Habits │ Coach │ Reflections │ UI    │ │
│   └───────────────────────────┬───────────────────────────────────────┘ │
│                               │                                         │
│   ┌───────────────────────────┴───────────────────────────────────────┐ │
│   │                     Frontend API Layer                            │ │
│   │  src/api/auth.ts  ·  strava.ts  ·  db.ts  ·  reflection.ts      │ │
│   └───────────────────────────┬───────────────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                          HTTP / REST
                         (JSON + SSE)
                                │
                    ┌───────────┴───────────┐
                    │   Vite proxy (dev)     │
                    │   Vercel rewrites (prod)│
                    └───────────┬───────────┘
                                │
┌───────────────────────────────┼─────────────────────────────────────────┐
│                         BACKEND (API)                                   │
│                                                                         │
│   Express (dev) / Vercel Serverless Functions (prod)                    │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                        API Routes                               │   │
│   │                                                                 │   │
│   │  /api/auth/*        Strava OAuth (login, callback, refresh)     │   │
│   │  /api/activities    Fetch & cache Strava activities              │   │
│   │  /api/strava        Proxy to Strava API v3                      │   │
│   │  /api/habits        Habit completions CRUD                      │   │
│   │  /api/plan          Training plan CRUD                          │   │
│   │  /api/coach-plan    AI-generated plan CRUD                      │   │
│   │  /api/reflection    AI chat with SSE streaming                  │   │
│   │  /api/race-goals    Race goal CRUD                              │   │
│   └────────┬──────────────────────────────────┬─────────────────────┘   │
│            │                                  │                         │
└────────────┼──────────────────────────────────┼─────────────────────────┘
             │                                  │
             ▼                                  ▼
┌────────────────────────┐         ┌─────────────────────────────┐
│      Supabase          │         │      Anthropic Claude       │
│     (PostgreSQL)       │         │        (AI Coach)           │
│                        │         │                             │
│  Tables:               │         │  Model: Claude 3            │
│  ─────────────────     │         │  Features:                  │
│  activities            │         │  · SSE streaming responses  │
│  habit_completions     │◄────────│  · Tool calling to query    │
│  habit_definitions     │         │    Supabase for context     │
│  training_plan         │         │  · Inline chart rendering   │
│  coach_plans           │         │                             │
│  reflection_convo's    │         │  Tools available to Claude: │
│  reflection_messages   │         │  · get_weekly_stats         │
│                        │         │  · get_activities           │
│  Access: Supabase JS   │         │  · get_habit_data           │
│  SDK (no ORM)          │         │  · get_training_plan        │
│                        │         │  · save/update_plan         │
│                        │         │  · render_chart             │
└────────────────────────┘         └─────────────────────────────┘

             ▲
             │
┌────────────┴───────────┐
│      Strava API v3     │
│                        │
│  · Activity data       │
│  · Athlete profile     │
│  · Heart rate streams  │
│  · Auth: OAuth 2.0     │
└────────────────────────┘
```

---

## How It All Connects

### Frontend

The app is a **React 18 SPA** written in **TypeScript**, bundled with **Vite**. Routing is handled by **React Router**. State lives in a **Zustand** store that persists to `localStorage` for offline-first behavior and cross-session continuity.

Key UI libraries: **Recharts** (charts), **Framer Motion** (animations), **React Markdown** (rendering AI responses).

### Frontend → Backend Communication

All communication is **REST over HTTP** with JSON request/response bodies, except for the AI chat which uses **Server-Sent Events (SSE)** for real-time streaming.

In development, **Vite's dev proxy** forwards `/api/*` requests to the Express server on port 3001. In production, **Vercel rewrites** route requests to serverless functions.

### Authentication

```
User → "Login with Strava" → /api/auth/strava → Strava OAuth consent
     ← redirect to /callback ← /api/auth/callback (exchanges code for tokens)

Tokens stored in Zustand + localStorage
Auto-refresh 5 min before expiry via /api/auth/refresh
```

No username/password — authentication is entirely via **Strava OAuth 2.0**.

### Backend

The backend is a thin API layer — **Express** locally, **Vercel Serverless Functions** in production. The same handler code runs in both environments. It has three jobs:

1. **Proxy & cache Strava data** — fetches activities from Strava, caches them as JSONB in Supabase to avoid rate limits
2. **CRUD for user data** — habits, plans, race goals, coach plans
3. **AI orchestration** — sends messages to Claude with tool definitions, streams responses back via SSE

### Database

**Supabase (hosted PostgreSQL)**. No ORM — the app uses the Supabase JS SDK's query builder directly. Data is stored as JSONB blobs where flexibility is needed (activities, coach plan weeks, habit definitions).

### AI Integration

The **Coach** and **Week Review** features use the **Anthropic Claude API** with:

- **Streaming** — responses arrive token-by-token via SSE for a responsive chat UX
- **Tool calling** — Claude can call backend functions to query the user's real training data (activities, habits, plans) before responding, so advice is grounded in actual data
- **System prompt** — a detailed running coach persona synthesizing methodologies from Daniels, Pfitzinger, Higdon, Hudson, and Fitzgerald

### Deployment

```
npm run build  →  Vite builds SPA to /dist
                  Vercel deploys /dist (static) + /api (serverless)
```

Hosted on **Vercel**. Environment variables (Supabase keys, Anthropic API key, Strava secrets) are configured in Vercel's dashboard.

---

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Zustand + localStorage | Offline-first; app works without network, syncs when online |
| JSONB columns in Supabase | Flexible schema for evolving features without migrations |
| SSE for AI chat | Real-time token streaming without WebSocket complexity |
| Claude tool calling | AI can query real user data instead of relying on context window |
| Strava activity caching | Avoids Strava's strict rate limits; faster page loads |
| Vercel serverless | Zero-config deployment; scales to zero when idle |
| No ORM | Supabase SDK is sufficient; avoids abstraction overhead |
