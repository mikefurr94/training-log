# Habits App — Extracted Code

This folder contains the habits-specific UI and utility code, ready to be moved into a standalone project.

## What's here

```
habits-app/
  components/
    EmojiPickerPopover.tsx   — emoji picker for habit creation/editing
    HabitCheckbox.tsx        — single habit check-off cell
    HabitDashboard.tsx       — streaks + stats dashboard view
    HabitDetailPanel.tsx     — slide-out detail/edit panel for a habit
    HabitGridView.tsx        — monthly grid heatmap view
    HabitWeekView.tsx        — primary weekly check-off view
  utils/
    habitUtils.ts            — streak calc, week/grid helpers
  api/
    db.ts                    — habit API calls (load/save completions + definitions)
```

## What still needs to be extracted from the main app

### `src/store/types.ts` — habit type definitions
- `HabitFrequency`, `HabitDefinition`, `HabitCompletions`, `HabitCounts`, `HabitView`
- Habit fields inside `AppState`: `habits`, `habitCounts`, `habitView`, `selectedHabitId`
- Habit actions inside `AppActions`: `toggleHabitCompletion`, `setHabitCounts`, `addHabit`, `removeHabit`, `reorderHabits`, `setHabitView`, `setSelectedHabitId`, `updateHabit`, `moveHabit`

### `src/store/useAppStore.ts` — habit state + actions
- Import of `HabitDefinition`, `HabitCounts`, `HabitView`
- `DEFAULT_HABITS` constant (around line 32)
- The entire `// ── Habits ──` section (around lines 427–490)
- Persisted fields `habits`, `habitCounts`, `habitView` (around lines 536–538)

### `src/hooks/useSupabaseSync.ts` — Supabase sync for habits
- Imports: `loadHabits`, `saveHabitDay`, `loadHabitDefinitions`, `saveHabitDefinitions`, `HabitDefinition`
- State subscriptions: `habitCounts`, `habits`, `setHabitCounts`, `prevHabitsRef`
- Three `useEffect` blocks: initial load, habit definitions sync, habit completions sync

### `src/api/db.ts` — backend API calls (already copied to `api/db.ts`)
- `loadHabits`, `saveHabitDay`, `loadHabitDefinitions`, `saveHabitDefinitions`

## Serverless API routes (in `api/` at project root)
- `api/habits.ts` — GET/POST habit completions per day
- `api/habit-definitions.ts` — GET/POST habit definitions

These will also need to be brought along or recreated.
