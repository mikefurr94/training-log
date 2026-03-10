# Coach Feature — Implementation Plan

## Overview

Rename "Reflect" → "Coach" and add a **Training Plan Builder** that lets you:
1. Fill an intake form (race details, preferences)
2. Claude generates a multi-week structured training plan
3. View/edit the plan in a visual week grid
4. Cherry-pick individual days or entire weeks to push to the training calendar
5. Chat with the coach about progress against the plan, request adjustments

**One active plan at a time.** Plans stored in Supabase. Plan editable via visual grid. Add to calendar supports both weeks and individual days.

---

## Phase 1: Rename "Reflect" → "Coach" + Store Plumbing

**Goal:** Rename everywhere, add `coachView` state, add types for the new plan data model.

### Files to change:

1. **`src/store/types.ts`**
   - Rename `ActiveApp = 'training' | 'habits' | 'reflection'` → `'training' | 'habits' | 'coach'`
   - Add `CoachView = 'chat' | 'plan' | 'intake'`
   - Add new types:
     ```ts
     interface CoachPlanPreferences {
       runDaysPerWeek: number
       liftDaysPerWeek: number
       planWeeks: number
       currentWeeklyMileage?: number
       experienceLevel?: 'beginner' | 'intermediate' | 'advanced'
     }

     interface CoachPlanWeek {
       weekNumber: number
       weekStart: string          // "YYYY-MM-DD"
       label: string              // "Base Building", "Speed Work", "Taper"
       days: Record<WeekDayIndex, PlannedActivity[]>
     }

     interface CoachPlan {
       id: string
       athleteId: number
       name: string
       raceName?: string
       raceDate?: string
       raceDistance?: string
       goalTime?: string
       preferences: CoachPlanPreferences
       weeks: CoachPlanWeek[]
       status: 'active' | 'archived'
       conversationId?: string
       createdAt: string
       updatedAt: string
     }
     ```

2. **`src/store/useAppStore.ts`**
   - Rename persisted `activeApp` migration: `'reflection'` → `'coach'`
   - Add state: `coachView: CoachView` (default `'chat'`), `coachPlan: CoachPlan | null`
   - Add actions: `setCoachView(view)`, `setCoachPlan(plan)`, `clearCoachPlan()`, `updateCoachPlanWeek(weekNumber, days)`
   - Persist `coachPlan` to localStorage as cache (source of truth is Supabase)

3. **`src/components/layout/SideNav.tsx`**
   - Change `{ app: 'reflection', label: 'Reflect', Icon: IconReflection }` → `{ app: 'coach', label: 'Coach', Icon: IconCoach }`
   - Update icon (could reuse reflection icon or create a clipboard/whistle icon)

4. **`src/components/layout/Header.tsx`**
   - Rename all `reflection` references to `coach`

5. **`src/pages/CalendarPage.tsx`**
   - Change `isReflection = activeApp === 'reflection'` → `isCoach = activeApp === 'coach'`
   - Render `<CoachPage />` instead of `<ReflectionPage />`

6. **`src/pages/ReflectionPage.tsx`** → rename file to **`src/pages/CoachPage.tsx`**
   - Update component name and all internal references

7. **`src/hooks/useReflectionChat.ts`** → cosmetic rename optional (low priority)

8. **`src/api/reflection.ts`** (frontend) — no rename needed, it's the API path

---

## Phase 2: Supabase Table + API Endpoints

**Goal:** Persistent plan storage in the cloud.

### Database:

1. **New table: `coach_plans`**
   ```sql
   CREATE TABLE coach_plans (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     athlete_id BIGINT NOT NULL,
     name TEXT NOT NULL,
     race_name TEXT,
     race_date TEXT,
     race_distance TEXT,
     goal_time TEXT,
     preferences JSONB DEFAULT '{}',
     weeks JSONB NOT NULL DEFAULT '[]',
     status TEXT DEFAULT 'active',
     conversation_id TEXT,
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );
   ```

### API Endpoints:

2. **`/api/coach-plan.ts`** (new serverless function)
   - `GET ?athlete_id=N` — Load active plan (status = 'active') for athlete
   - `POST ?athlete_id=N` — Create or upsert plan
   - `PATCH ?athlete_id=N&plan_id=X` — Update specific fields (weeks, status, etc.)
   - `DELETE ?plan_id=X` — Archive plan (set status = 'archived')

3. **`src/api/db.ts`** — Add frontend functions:
   - `loadCoachPlan(athleteId)` → GET
   - `saveCoachPlan(athleteId, plan)` → POST
   - `updateCoachPlan(athleteId, planId, updates)` → PATCH

---

## Phase 3: Intake Form (Plan Builder Wizard)

**Goal:** Structured form that collects all inputs needed to generate a training plan.

### New Component: `src/components/coach/PlanBuilderForm.tsx`

Form fields:
- **Race name** (text) — "Brooklyn Half Marathon"
- **Race date** (date picker) — selects from calendar
- **Race distance** (preset buttons) — 5K, 10 Miler, Half Marathon, Marathon, Custom
- **Goal time** (text) — "1:45:00" (with pace↔time toggle from existing utils)
- **Plan duration** (slider or select) — 8, 10, 12, 16, 20 weeks
- **Run days per week** (number stepper) — 3, 4, 5, 6
- **Lift days per week** (number stepper) — 0, 1, 2, 3
- **Current weekly mileage** (number input) — e.g. 15
- **Experience level** (radio) — Beginner, Intermediate, Advanced
- **Notes / constraints** (textarea) — "I can only run mornings", "bad knee", etc.

**Submit action:**
1. Serialize form into `CoachPlanPreferences`
2. Build a structured prompt from the form data
3. Start a new conversation with Claude using that prompt
4. Claude generates the plan via `save_training_plan` tool call
5. Navigate to plan grid view

---

## Phase 4: Claude Plan Generation (API Tools)

**Goal:** Give Claude the ability to create and modify structured training plans.

### New tools added to `/api/reflection.ts`:

1. **`save_training_plan`** — Claude calls this to save a generated plan
   ```ts
   {
     name: "save_training_plan",
     description: "Save a structured multi-week training plan",
     input_schema: {
       name: string,
       raceName?: string,
       raceDate?: string,
       raceDistance?: string,
       goalTime?: string,
       preferences: CoachPlanPreferences,
       weeks: CoachPlanWeek[]  // The full plan
     }
   }
   ```
   Handler: Upserts into `coach_plans` table, returns plan ID.
   SSE event: `{ type: 'plan_saved', plan: CoachPlan }`

2. **`get_training_plan`** — Claude reads the current active plan
   ```ts
   {
     name: "get_training_plan",
     description: "Get the athlete's current active training plan",
     input_schema: {}
   }
   ```
   Handler: Queries `coach_plans` where `athlete_id` and `status = 'active'`.

3. **`update_training_plan`** — Claude modifies specific weeks
   ```ts
   {
     name: "update_training_plan",
     description: "Update specific weeks in the training plan",
     input_schema: {
       updates: Array<{ weekNumber: number, days: Record<WeekDayIndex, PlannedActivity[]>, label?: string }>
     }
   }
   ```
   Handler: Merges updates into existing plan's `weeks` array.
   SSE event: `{ type: 'plan_updated', plan: CoachPlan }`

### System prompt updates:

Add to Claude's system prompt:
- Awareness of the plan context: "The athlete may have an active training plan. Use get_training_plan to check."
- Plan generation instructions: "When asked to create a training plan, generate a week-by-week schedule using save_training_plan. Each day should have PlannedActivity objects matching the app's type system."
- Progress analysis: "When asked about progress, compare the plan against actual activities using get_training_plan + get_activities."

### Frontend streaming updates:

In `useReflectionChat.ts`, handle new SSE events:
- `plan_saved` → `setCoachPlan(plan)`, auto-switch to plan view
- `plan_updated` → `setCoachPlan(plan)`, refresh grid

---

## Phase 5: Plan Grid View

**Goal:** Visual week-by-week grid to view, edit, and push plan to calendar.

### New Component: `src/components/coach/CoachPlanGrid.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Plan Header: "Brooklyn Half Marathon" | Race: Apr 5 │
│ 12 weeks · Goal 1:45:00 · 4 runs/wk + 2 lifts/wk  │
├─────────────────────────────────────────────────────┤
│ Wk  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri │ Sat │ Sun  │
├─────┼──────┼──────┼──────┼──────┼─────┼─────┼──────┤
│ 1   │ Run  │ Lift │ Run  │ Rest │ Run │ Lift│ Long │
│ Base│ 3mi  │ UB   │ 4mi  │      │ 3mi │ LB  │ 6mi  │
│     │                              [+ Add to Cal]   │
├─────┼──────┼──────┼──────┼──────┼─────┼─────┼──────┤
│ 2   │ ...  │      │      │      │     │     │      │
│ Base│                              [✓ On Calendar]  │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Week rows with label (phase name) on the left
- Day cells show activity type + key details (distance, workout type)
- Click a cell → opens edit modal (reuse `ActivityPlanModal` or similar inline editor)
- Highlight current week based on today's date
- Visual state per week/day: "draft" (default), "on calendar" (pushed)

### Day Cell Interactions:
- **Click** → Edit activity in that cell
- **Right-click or long-press** → "Add this day to calendar" context action

### Week Row Actions:
- **"Add Week to Calendar" button** → Pushes all 7 days to `weekOverrides` via `setDayOverride`
- **Visual indicator** → Checkmark or "On Calendar" badge if week was already pushed
- **"Remove from Calendar" button** → Clears that week's overrides

### Add-to-Calendar Logic:
```ts
function addWeekToCalendar(week: CoachPlanWeek) {
  const weekStart = startOfWeek(parseISO(week.weekStart), { weekStartsOn: 1 })
  for (const [dayIdx, activities] of Object.entries(week.days)) {
    if (activities.length > 0) {
      setDayOverride(weekStart, Number(dayIdx) as WeekDayIndex, activities)
    }
  }
}

function addDayToCalendar(week: CoachPlanWeek, dayIndex: WeekDayIndex) {
  const weekStart = startOfWeek(parseISO(week.weekStart), { weekStartsOn: 1 })
  setDayOverride(weekStart, dayIndex, week.days[dayIndex] ?? [])
}
```

---

## Phase 6: Coach Page Layout (Unified View)

**Goal:** Combine chat + plan grid into the Coach tab.

### Updated `src/pages/CoachPage.tsx`

**Three view modes** (`coachView` state):

1. **`'chat'`** — Same as current reflection page (sidebar + chat area). But sidebar gets a "Training Plan" card at the top if a plan exists, clicking it switches to `'plan'` view. Also shows a "Create Training Plan" button if no plan exists.

2. **`'intake'`** — Shows `PlanBuilderForm` in the main area. Sidebar still visible. On submit, switches to `'chat'` view with the structured prompt sent.

3. **`'plan'`** — Split layout:
   - Left: `CoachPlanGrid` (takes ~65% width)
   - Right: Chat panel (~35% width) pinned to the plan's linked conversation
   - Chat panel is collapsible on smaller screens
   - Grid is the primary focus, chat is contextual

**Mobile:**
- `'plan'` view shows the grid full-width with a floating "Chat" button that opens the chat as a bottom sheet/overlay
- `'intake'` is a full-screen form
- `'chat'` is the existing mobile layout

---

## Phase 7: Progress Tracking & Plan Awareness

**Goal:** Claude can compare the plan vs actual activities and give intelligent feedback.

### System prompt enhancements:
- When a plan exists, Claude's system prompt includes a summary: "The athlete has a 12-week half marathon plan starting Jan 5. They are currently in week 6."
- Claude can call `get_training_plan` + `get_activities` to do detailed comparison
- Claude can call `update_training_plan` to adjust future weeks based on feedback

### Suggested prompts (shown in chat when plan exists):
- "How am I doing against my plan this week?"
- "I'm feeling tired — can you ease up next week?"
- "I missed 2 runs this week, should I adjust?"
- "I want to add a tempo run to my plan"

---

## Implementation Order

| Step | Phase | Description | Estimated Scope |
|------|-------|-------------|-----------------|
| 1 | P1 | Rename Reflect → Coach (types, store, nav, pages) | ~8 files, mostly search/replace |
| 2 | P1 | Add CoachPlan types + store state/actions | types.ts, useAppStore.ts |
| 3 | P2 | Create `coach_plans` Supabase table | SQL migration |
| 4 | P2 | Add `/api/coach-plan.ts` endpoint + frontend `db.ts` funcs | 2 new files |
| 5 | P3 | Build `PlanBuilderForm` component | 1 new file (~200 lines) |
| 6 | P4 | Add Claude tools: save/get/update_training_plan | api/reflection.ts |
| 7 | P4 | Handle new SSE events in useReflectionChat | hooks update |
| 8 | P5 | Build `CoachPlanGrid` component | 1 new file (~300-400 lines) |
| 9 | P5 | Add-to-calendar logic (week + day granularity) | grid + store integration |
| 10 | P6 | Refactor CoachPage layout (3 view modes) | page rewrite |
| 11 | P7 | System prompt + progress tracking prompts | api/reflection.ts |
| 12 | P7 | Load plan on app init, sync with Supabase | CalendarPage + store |
