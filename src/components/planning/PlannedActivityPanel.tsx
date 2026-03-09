import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, parseISO, startOfWeek } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useWeather } from '../../hooks/useWeather'
import { getActivityColor } from '../../utils/activityColors'
import { getWeatherIcon, type DailyWeather } from '../../api/weather'
import type { PlannedActivity, WorkoutType, WeekDayIndex } from '../../store/types'

interface ClothingItem {
  icon: string
  label: string
}

function getClothingRecommendation(feelsLike: number): ClothingItem[] {
  if (feelsLike < 20) return [
    { icon: '🧤', label: 'Mittens' },
    { icon: '🦵', label: 'Long tights' },
    { icon: '🧢', label: 'Winter hat' },
  ]
  if (feelsLike < 30) return [
    { icon: '🧤', label: 'Winter gloves' },
    { icon: '🦵', label: 'Long tights' },
    { icon: '🧢', label: 'Winter hat' },
  ]
  if (feelsLike < 40) return [
    { icon: '🧤', label: 'Light gloves' },
    { icon: '👕', label: 'Long sleeve' },
    { icon: '🩳', label: 'Shorts / tights' },
  ]
  if (feelsLike < 55) return [
    { icon: '👕', label: 'Long sleeve' },
    { icon: '🩳', label: 'Shorts' },
  ]
  return [
    { icon: '👕', label: 'T-shirt' },
    { icon: '🩳', label: 'Shorts' },
  ]
}

const WORKOUT_TYPES: WorkoutType[] = [
  'Upper Body', 'Lower Body', 'Full Body', 'Core', 'Push', 'Pull', 'Legs',
]

type ActivityTypeChoice = PlannedActivity['type']

const RACE_DISTANCE_PRESETS = ['5K', '10 Miler', 'Half Marathon', 'Marathon']

const ACTIVITY_TYPE_OPTIONS: { type: ActivityTypeChoice; emoji: string; label: string }[] = [
  { type: 'Run',            emoji: '\u{1F3C3}', label: 'Run' },
  { type: 'Race',           emoji: '\u{1F3C1}', label: 'Race' },
  { type: 'WeightTraining', emoji: '\u{1F3CB}\uFE0F', label: 'Weights' },
  { type: 'Yoga',           emoji: '\u{1F9D8}', label: 'Yoga' },
  { type: 'Tennis',         emoji: '\u{1F3BE}', label: 'Tennis' },
  { type: 'Rest',           emoji: '\u{1F634}', label: 'Rest' },
]

export default function PlannedActivityPanel() {
  const isOpen = useAppStore((s) => s.isPlannedPanelOpen)
  const activity = useAppStore((s) => s.selectedPlannedActivity)
  const dateStr = useAppStore((s) => s.selectedPlannedDate)
  const closePanel = useAppStore((s) => s.closePlannedPanel)
  const setDayOverride = useAppStore((s) => s.setDayOverride)
  const weekOverrides = useAppStore((s) => s.weekOverrides)
  const isMobile = useIsMobile()
  const weatherByDate = useWeather()

  const weather = dateStr ? weatherByDate[dateStr] : undefined

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && activity && dateStr && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closePanel}
            style={{
              position: isMobile ? 'fixed' : 'absolute',
              inset: 0,
              background: 'rgba(17, 24, 39, 0.2)',
              backdropFilter: 'blur(1px)',
              zIndex: 40,
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: isMobile ? 0 : '100%', y: isMobile ? '100%' : 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            style={{
              position: isMobile ? 'fixed' : 'absolute',
              top: 0, right: isMobile ? 0 : 0, bottom: 0,
              left: isMobile ? 0 : undefined,
              width: isMobile ? '100%' : 420,
              maxWidth: isMobile ? '100%' : '92vw',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-panel)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <PanelContent
              activity={activity}
              dateStr={dateStr}
              weather={weather}
              isMobile={isMobile}
              closePanel={closePanel}
              setDayOverride={setDayOverride}
              weekOverrides={weekOverrides}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Inner content (reset form state when activity changes) ───────────────────

function PanelContent({
  activity,
  dateStr,
  weather,
  isMobile,
  closePanel,
  setDayOverride,
  weekOverrides,
}: {
  activity: PlannedActivity
  dateStr: string
  weather?: DailyWeather
  isMobile: boolean
  closePanel: () => void
  setDayOverride: (weekStart: Date, day: WeekDayIndex, activities: PlannedActivity[]) => void
  weekOverrides: any[]
}) {
  const date = parseISO(dateStr)
  const colors = getActivityColor(activity.type as any)

  const dayIndex = date.getDay() as WeekDayIndex
  const ws = startOfWeek(date, { weekStartsOn: 1 })
  const wsStr = format(ws, 'yyyy-MM-dd')

  // Editable form state, seeded from the activity
  const [type, setType] = useState<ActivityTypeChoice>(activity.type)
  const [targetDistance, setTargetDistance] = useState(
    activity.type === 'Run' ? String(activity.targetDistance) : ''
  )
  const [targetPace, setTargetPace] = useState(
    activity.type === 'Run' ? activity.targetPace : ''
  )
  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    activity.type === 'WeightTraining' ? activity.workoutType : 'Upper Body'
  )
  // Race-specific state
  const [raceName, setRaceName] = useState(activity.type === 'Race' ? (activity.name ?? '') : '')
  const [raceDistance, setRaceDistance] = useState(activity.type === 'Race' ? (activity.distance ?? '') : '')
  const [raceGoalTime, setRaceGoalTime] = useState(activity.type === 'Race' ? (activity.goalTime ?? '') : '')
  const [raceTargetPace, setRaceTargetPace] = useState(activity.type === 'Race' ? (activity.targetPace ?? '') : '')
  const [notes, setNotes] = useState(activity.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const prevTypeRef = useRef<ActivityTypeChoice>(type)

  // Reset form when a different activity is selected
  useEffect(() => {
    setType(activity.type)
    setTargetDistance(activity.type === 'Run' ? String(activity.targetDistance) : '')
    setTargetPace(activity.type === 'Run' ? activity.targetPace : '')
    setWorkoutType(activity.type === 'WeightTraining' ? activity.workoutType : 'Upper Body')
    setRaceName(activity.type === 'Race' ? (activity.name ?? '') : '')
    setRaceDistance(activity.type === 'Race' ? (activity.distance ?? '') : '')
    setRaceGoalTime(activity.type === 'Race' ? (activity.goalTime ?? '') : '')
    setRaceTargetPace(activity.type === 'Race' ? (activity.targetPace ?? '') : '')
    setNotes(activity.notes ?? '')
    setErrors({})
    setSaved(false)
    prevTypeRef.current = activity.type
  }, [activity.id])

  function handleTypeChange(newType: ActivityTypeChoice) {
    if (newType === prevTypeRef.current) return
    prevTypeRef.current = newType
    setType(newType)
    setErrors({})
    if (newType !== 'Run') {
      setTargetDistance('')
      setTargetPace('')
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (type === 'Run') {
      const dist = parseFloat(targetDistance)
      if (!targetDistance || isNaN(dist) || dist <= 0) {
        newErrors.distance = 'Enter a distance greater than 0'
      }
      if (targetPace && !/^\d+:\d{2}$/.test(targetPace)) {
        newErrors.pace = 'Use MM:SS format (e.g. 8:30)'
      }
    }
    if (type === 'Race') {
      if (raceGoalTime && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(raceGoalTime)) {
        newErrors.raceGoalTime = 'Use H:MM:SS or M:SS format'
      }
      if (raceTargetPace && !/^\d+:\d{2}$/.test(raceTargetPace)) {
        newErrors.raceTargetPace = 'Use MM:SS format (e.g. 7:30)'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Build the updated PlannedActivity from form state
  function buildActivity(): PlannedActivity | null {
    if (!validate()) return null
    const id = activity.id
    if (type === 'Run') {
      return { id, type: 'Run', targetDistance: parseFloat(targetDistance), targetPace: targetPace || '0:00', ...(notes ? { notes } : {}) }
    } else if (type === 'Race') {
      return {
        id, type: 'Race',
        ...(raceName ? { name: raceName } : {}),
        ...(raceDistance ? { distance: raceDistance } : {}),
        ...(raceGoalTime ? { goalTime: raceGoalTime } : {}),
        ...(raceTargetPace ? { targetPace: raceTargetPace } : {}),
        ...(notes ? { notes } : {}),
      }
    } else if (type === 'WeightTraining') {
      return { id, type: 'WeightTraining', workoutType, ...(notes ? { notes } : {}) }
    } else if (type === 'Yoga') {
      return { id, type: 'Yoga', ...(notes ? { notes } : {}) }
    } else if (type === 'Tennis') {
      return { id, type: 'Tennis', ...(notes ? { notes } : {}) }
    } else {
      return { id, type: 'Rest', ...(notes ? { notes } : {}) }
    }
  }

  function getCurrentPlannedActivities(): PlannedActivity[] {
    const override = weekOverrides.find((o: any) => o.weekStart === wsStr)
    if (override && override.days[dayIndex] !== undefined) {
      return override.days[dayIndex]!
    }
    return []
  }

  function handleSave() {
    const updated = buildActivity()
    if (!updated) return
    const current = getCurrentPlannedActivities()
    // If activity exists in current list, update it; otherwise add it (new activity from calendar)
    const exists = current.some((a) => a.id === updated.id)
    const newList = exists
      ? current.map((a) => (a.id === updated.id ? updated : a))
      : [...current, updated]
    setDayOverride(ws, dayIndex, newList)
    if (!exists) {
      // New activity — close panel so user can immediately see it on the calendar
      closePanel()
    } else {
      // Editing existing — stay open and show saved confirmation
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  function handleDelete() {
    const current = getCurrentPlannedActivities()
    const newList = current.filter((a) => a.id !== activity.id)
    setDayOverride(ws, dayIndex, newList)
    closePanel()
  }


  return (
    <>
      {/* Panel header */}
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 20px',
        paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : '16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0,
      }}>
        {/* Activity type badge */}
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: colors.light, border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          {colors.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)', letterSpacing: '-0.3px',
            marginBottom: 3,
          }}>
            Planned Workout
          </h2>
          <div style={{
            fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)',
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={closePanel}
          style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-tertiary)', fontSize: 22, flexShrink: 0,
            border: '1px solid var(--color-border)', background: 'var(--color-bg)',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>

      {/* Panel body */}
      <div style={{
        flex: 1, overflow: 'auto',
        padding: isMobile ? '16px' : '20px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {/* Weather section */}
        {weather && (
          <WeatherCard weather={weather} />
        )}

        {/* Clothing recommendation for run days */}
        {activity.type === 'Run' && weather && (() => {
          const feelsLike = weather.feelsLikeAt7am ?? weather.feelsLikeLow
          const items = getClothingRecommendation(feelsLike)
          return (
            <div style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: '14px 16px',
            }}>
              <div style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}>
                What to wear
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {items.map((item) => (
                  <span key={item.label} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full, 999px)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 500,
                  }}>
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Activity type selector */}
        <div>
          <label style={labelStyle}>Activity type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {ACTIVITY_TYPE_OPTIONS.map(({ type: t, emoji, label }) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: type === t ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  border: `1.5px solid ${type === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: type === t ? 'var(--color-accent-light)' : 'transparent',
                  color: type === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Run-specific fields */}
        {type === 'Run' && (
          <>
            <div>
              <label style={labelStyle}>Target distance (miles)</label>
              <input
                type="number" step="0.1" min="0.1"
                value={targetDistance}
                onChange={(e) => {
                  setTargetDistance(e.target.value)
                  if (errors.distance) setErrors((prev) => ({ ...prev, distance: '' }))
                }}
                placeholder="e.g. 5.0"
                style={{ ...inputStyle, borderColor: errors.distance ? '#ef4444' : undefined }}
              />
              {errors.distance && <div style={errorStyle}>{errors.distance}</div>}
            </div>
            <div>
              <label style={labelStyle}>Target pace (MM:SS /mi) — optional</label>
              <input
                type="text" value={targetPace}
                onChange={(e) => {
                  setTargetPace(e.target.value)
                  if (errors.pace) setErrors((prev) => ({ ...prev, pace: '' }))
                }}
                placeholder="e.g. 8:30"
                style={{ ...inputStyle, borderColor: errors.pace ? '#ef4444' : undefined }}
              />
              {errors.pace
                ? <div style={errorStyle}>{errors.pace}</div>
                : <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>Leave blank to skip pace matching</div>
              }
            </div>
          </>
        )}

        {/* Race-specific fields */}
        {type === 'Race' && (
          <>
            <div>
              <label style={labelStyle}>Race name</label>
              <input
                type="text"
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="e.g. Brooklyn Half Marathon"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Distance</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                {RACE_DISTANCE_PRESETS.map((d) => {
                  const isActive = raceDistance === d
                  return (
                    <button
                      key={d}
                      onClick={() => setRaceDistance(d)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)', fontWeight: isActive ? 600 : 500,
                        border: `1.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isActive ? 'var(--color-accent-light)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >{d}</button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Target pace (MM:SS /mi) — optional</label>
              <input
                type="text"
                value={raceTargetPace}
                onChange={(e) => { setRaceTargetPace(e.target.value); if (errors.raceTargetPace) setErrors((p) => ({ ...p, raceTargetPace: '' })) }}
                placeholder="e.g. 7:30"
                style={{ ...inputStyle, borderColor: errors.raceTargetPace ? '#ef4444' : undefined }}
              />
              {errors.raceTargetPace
                ? <div style={errorStyle}>{errors.raceTargetPace}</div>
                : <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>Leave blank to skip</div>
              }
            </div>
            <div>
              <label style={labelStyle}>Goal time — optional</label>
              <input
                type="text"
                value={raceGoalTime}
                onChange={(e) => { setRaceGoalTime(e.target.value); if (errors.raceGoalTime) setErrors((p) => ({ ...p, raceGoalTime: '' })) }}
                placeholder="e.g. 1:45:00"
                style={{ ...inputStyle, borderColor: errors.raceGoalTime ? '#ef4444' : undefined }}
              />
              {errors.raceGoalTime
                ? <div style={errorStyle}>{errors.raceGoalTime}</div>
                : <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>H:MM:SS or M:SS format</div>
              }
            </div>
          </>
        )}

        {/* WeightTraining-specific fields */}
        {type === 'WeightTraining' && (
          <div>
            <label style={labelStyle}>Workout type</label>
            <select
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value as WorkoutType)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {WORKOUT_TYPES.map((wt) => (
                <option key={wt} value={wt}>{wt}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes — larger textarea for the panel */}
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. easy effort, fasted, tempo miles 3-5, warm up with strides..."
            rows={4}
            style={{
              ...inputStyle,
              resize: 'vertical',
              minHeight: 80,
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={handleDelete}
            style={{
              padding: '10px 16px', borderRadius: 'var(--radius-sm)',
              background: 'transparent', color: '#ef4444',
              border: '1px solid #fca5a5', fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)', cursor: 'pointer',
            }}
          >
            Delete
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={closePanel} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleSave} style={{
            ...primaryBtnStyle,
            background: saved ? '#22c55e' : 'var(--color-accent)',
            transition: 'background 0.2s',
          }}>
            {saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Weather card for the panel ───────────────────────────────────────────────

function WeatherCard({ weather }: { weather: DailyWeather }) {
  const { icon, label } = getWeatherIcon(weather.weatherCode)

  return (
    <div style={{
      background: 'var(--color-bg)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      {/* Large weather icon */}
      <div style={{
        fontSize: 36,
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Condition label */}
        <div style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}>
          {label}
        </div>

        {/* Temp grid */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              High / Low
            </div>
            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {weather.tempHigh}° / {weather.tempLow}°
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              Feels like
            </div>
            <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {weather.feelsLikeHigh}° / {weather.feelsLikeLow}°
            </div>
          </div>
          {weather.feelsLikeAt7am != null && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Feels @ 7am
              </div>
              <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                {weather.feelsLikeAt7am}°
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-sm)',
  outline: 'none',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#ef4444',
  marginTop: 3,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--color-accent)',
  color: 'var(--color-text-inverse)',
  border: 'none',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 'var(--radius-sm)',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  cursor: 'pointer',
}
