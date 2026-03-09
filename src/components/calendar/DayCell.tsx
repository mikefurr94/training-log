import { useState } from 'react'
import { format, isToday, isSameMonth, startOfDay } from 'date-fns'
import ActivityBadge from './ActivityBadge'
import PlannedBadge from './PlannedBadge'
import WeatherInfo from './WeatherInfo'
import { mapStravaType } from '../../utils/activityColors'
import { useAppStore } from '../../store/useAppStore'
import type { StravaActivity, PlannedActivity, KeyDate } from '../../store/types'
import type { ActivityType } from '../../utils/activityColors'
import type { DailyWeather } from '../../api/weather'

interface Props {
  date: Date
  activities: StravaActivity[]
  plannedActivities?: PlannedActivity[]
  keyDates?: KeyDate[]
  weather?: DailyWeather
  monthRef?: Date // to detect out-of-month days
  compact?: boolean // for quarter/6month views
  isYearView?: boolean
  size?: number // cell size in px for year view (default 14)
}

export default function DayCell({
  date,
  activities,
  plannedActivities,
  keyDates,
  weather,
  monthRef,
  compact = false,
  isYearView = false,
  size = 14,
}: Props) {
  const enabledTypes = useAppStore((s) => s.enabledTypes)
  const selectActivity = useAppStore((s) => s.selectActivity)
  const openPlannedPanel = useAppStore((s) => s.openPlannedPanel)
  const showPlan = useAppStore((s) => s.showPlan)
  const movePlannedActivity = useAppStore((s) => s.movePlannedActivity)
  const addNewPlannedActivity = useAppStore((s) => s.addNewPlannedActivity)
  const openKeyDateModal = useAppStore((s) => s.openKeyDateModal)

  const [isDragOver, setIsDragOver] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const today = isToday(date)
  const outsideMonth = monthRef ? !isSameMonth(date, monthRef) : false
  const dateKey = format(date, 'yyyy-MM-dd')
  const isFutureOrToday = startOfDay(date) >= startOfDay(new Date())

  // Filter actual activities to enabled types
  const filtered = activities.filter((a) =>
    enabledTypes.includes(mapStravaType(a.sport_type || a.type) as ActivityType)
  )

  // Race detection from raw planned list — Race is always shown regardless of enabledTypes filter
  const plannedRace = showPlan
    ? (plannedActivities ?? []).find(p => p.type === 'Race')
    : undefined

  // Filter non-Race planned activities to enabled types (skip Rest in calendar)
  const filteredPlanned = (plannedActivities ?? []).filter(
    (p) => p.type !== 'Rest' && p.type !== 'Race' && enabledTypes.includes(p.type as ActivityType)
  )

  const dayKeyDates = keyDates ?? []

  const MAX_BADGES = compact ? 2 : 3
  const visible = filtered.slice(0, MAX_BADGES)
  const overflow = filtered.length - MAX_BADGES

  const hasPlanned = !!plannedRace || filteredPlanned.length > 0

  // Race day detection — from planned Race activity or key date
  const hasKeyDateRace = showPlan && !compact && dayKeyDates.some(kd => kd.type === 'race')
  const isRaceDay = !!plannedRace || hasKeyDateRace

  // nonRacePlanned is just the already-filtered list (Race already excluded above)
  const nonRacePlanned = filteredPlanned
  const plannedSlotsFinal = Math.max(0, MAX_BADGES - Math.min(filtered.length, MAX_BADGES))
  const nonRacePlannedVisible = compact ? [] : nonRacePlanned.slice(0, plannedSlotsFinal)
  const nonRacePlannedOverflow = compact ? 0 : Math.max(0, nonRacePlanned.length - plannedSlotsFinal)

  // Whether this cell is eligible to show the "+" add button
  const addButtonEligible = showPlan && isFutureOrToday && !compact && !outsideMonth

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (showPlan) setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the cell itself (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data.activityId && data.fromDate && data.fromDate !== dateKey) {
        movePlannedActivity(data.fromDate, dateKey, data.activityId)
      }
    } catch {
      // ignore malformed drag data
    }
  }

  if (isYearView) {
    // Compact square for year heatmap — no planned data shown
    const count = filtered.length
    const intensity = count === 0 ? 0 : Math.min(count, 4)
    const bgMap: Record<number, string> = {
      0: 'var(--color-border-light)',
      1: 'var(--color-run-light)',
      2: '#c7d2fe',
      3: '#818cf8',
      4: 'var(--color-accent)',
    }
    return (
      <div
        title={`${format(date, 'MMM d')}${count > 0 ? `: ${count} activity${count > 1 ? 'ies' : 'y'}` : ''}`}
        onClick={() => visible[0] && selectActivity(visible[0].id)}
        style={{
          width: size,
          height: size,
          borderRadius: size <= 10 ? 2 : 3,
          background: bgMap[intensity],
          cursor: count > 0 ? 'pointer' : 'default',
          transition: 'transform var(--transition-fast)',
        }}
        onMouseEnter={(e) => count > 0 && (e.currentTarget.style.transform = 'scale(1.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      />
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: compact ? '4px 5px' : '6px 8px',
        background: today
          ? 'var(--color-today-bg)'
          : outsideMonth
          ? 'var(--color-outside-month)'
          : 'var(--color-surface)',
        borderRadius: 'var(--radius-sm)',
        opacity: outsideMonth ? 0.45 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minHeight: compact ? 50 : 90,
        transition: 'background var(--transition-fast), box-shadow var(--transition-fast)',
        overflow: 'hidden',
        outline: isDragOver ? '2px dashed var(--color-accent)' : 'none',
        outlineOffset: -2,
        position: 'relative',
        boxShadow: isRaceDay
          ? `0 0 0 2px var(--color-race-gradient-start) inset`
          : 'none',
      }}
    >
      {/* Date number + weather + add button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: compact ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
          fontWeight: today ? 'var(--font-weight-bold)' : 'var(--font-weight-medium)',
          color: today
            ? (isRaceDay ? 'var(--color-race-text)' : 'var(--color-accent)')
            : outsideMonth
            ? 'var(--color-text-tertiary)'
            : isRaceDay
            ? 'var(--color-race-text)'
            : 'var(--color-text-secondary)',
          lineHeight: 1,
          letterSpacing: '-0.1px',
          position: 'relative',
          zIndex: 1,
        }}>
          {today && !compact ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: isRaceDay ? 'var(--color-race-gradient-start)' : 'var(--color-accent)',
              color: '#fff',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)',
            }}>
              {format(date, 'd')}
            </span>
          ) : (
            format(date, 'd')
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
          {weather && hasPlanned && (
            <WeatherInfo weather={weather} compact={compact} />
          )}
          {addButtonEligible && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                addNewPlannedActivity(dateKey)
              }}
              title="Add planned workout"
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: isRaceDay ? 'var(--color-race-gradient-start)' : 'var(--color-accent)',
                color: '#fff',
                border: 'none', cursor: isHovered ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, lineHeight: 1, fontWeight: 700,
                opacity: isHovered ? 0.85 : 0,
                transition: 'opacity var(--transition-fast)',
                pointerEvents: isHovered ? 'auto' : 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85' }}
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Race day banner — full card (month view) or compact pill (quarter view) */}
      {plannedRace && !compact && (
        <button
          onClick={(e) => { e.stopPropagation(); openPlannedPanel(plannedRace, dateKey) }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ activityId: plannedRace.id, fromDate: dateKey }))
            e.dataTransfer.effectAllowed = 'move'
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '5px 7px',
            borderRadius: 7,
            background: 'var(--color-race-gradient-start)',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Race name (or "Race Day" fallback) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            lineHeight: 1,
          }}>
            <span style={{ fontSize: 11, flexShrink: 0 }}>🏁</span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {plannedRace.type === 'Race' && plannedRace.name ? plannedRace.name : 'Race Day'}
            </span>
          </div>
          {/* Distance + goal time chips */}
          {plannedRace.type === 'Race' && (plannedRace.distance || plannedRace.goalTime || plannedRace.targetPace) && (
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {plannedRace.distance && (
                <span style={{
                  padding: '1px 5px',
                  borderRadius: 99,
                  background: 'rgba(0,0,0,0.15)',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}>
                  {plannedRace.distance}
                </span>
              )}
              {(plannedRace.goalTime || plannedRace.targetPace) && (
                <span style={{
                  padding: '1px 5px',
                  borderRadius: 99,
                  background: 'rgba(0,0,0,0.15)',
                  color: '#fff',
                  fontSize: 8,
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}>
                  {plannedRace.goalTime ?? `${plannedRace.targetPace}/mi`}
                </span>
              )}
            </div>
          )}
        </button>
      )}
      {/* Compact race pill (quarter / 6-month views) */}
      {plannedRace && compact && (
        <button
          onClick={(e) => { e.stopPropagation(); openPlannedPanel(plannedRace, dateKey) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            padding: '2px 5px', borderRadius: 99,
            background: 'var(--color-race-gradient-start)',
            border: 'none', cursor: 'pointer',
            fontSize: 8, fontWeight: 700, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%', flexShrink: 0,
          }}
        >
          🏁 {plannedRace.type === 'Race' && plannedRace.name ? plannedRace.name : 'Race'}
        </button>
      )}

      {/* Key date race banner (only shown when no planned Race activity, non-compact only) */}
      {!plannedRace && hasKeyDateRace && !compact && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          background: 'var(--color-race-gradient-start)',
          borderRadius: 5,
          padding: '3px 7px',
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}>
          🏁 Race Day
        </div>
      )}

      {/* Key date event badges (non-race key dates shown normally) */}
      {!compact && dayKeyDates.length > 0 && dayKeyDates.filter(kd => kd.type !== 'race').map((kd) => (
        <button
          key={kd.id}
          onClick={(e) => { e.stopPropagation(); openKeyDateModal(kd) }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 'var(--radius-full)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            background: 'var(--color-accent-light)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent-border)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%', flexShrink: 0,
            position: 'relative', zIndex: 1,
          }}
        >
          <span style={{ fontSize: 9, flexShrink: 0 }}>📌</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kd.name}
            {kd.distance && ` · ${kd.distance}`}
            {kd.goalTime && ` · ${kd.goalTime}`}
          </span>
        </button>
      ))}

      {/* Race key date badges (shown when no planned Race to avoid duplication) */}
      {!compact && !plannedRace && dayKeyDates.filter(kd => kd.type === 'race').map((kd) => (
        <button
          key={kd.id}
          onClick={(e) => { e.stopPropagation(); openKeyDateModal(kd) }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 'var(--radius-full)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            background: 'var(--color-race-pill-bg)',
            color: 'var(--color-race-pill-text)',
            border: '1px solid var(--color-race-glow)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: '100%', flexShrink: 0,
            position: 'relative', zIndex: 1,
          }}
        >
          <span style={{ fontSize: 9, flexShrink: 0 }}>🏁</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kd.name}
            {kd.distance && ` · ${kd.distance}`}
            {kd.goalTime && ` · ${kd.goalTime}`}
          </span>
        </button>
      ))}

      {/* Activity badges (actual + non-race planned) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, position: 'relative', zIndex: 1 }}>
        {/* Actual activity badges */}
        {visible.map((activity) => (
          <ActivityBadge key={activity.id} activity={activity} compact={compact} />
        ))}
        {overflow > 0 && (
          <button
            onClick={() => filtered[MAX_BADGES] && selectActivity(filtered[MAX_BADGES].id)}
            style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '1px 4px',
              fontWeight: 500,
            }}
          >
            +{overflow} more
          </button>
        )}

        {/* Planned activity badges (dashed style) — excludes Race when race card is shown */}
        {nonRacePlannedVisible.map((planned) => (
          <PlannedBadge
            key={planned.id}
            activity={planned}
            compact={compact}
            onClick={(e) => { e.stopPropagation(); openPlannedPanel(planned, dateKey) }}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({ activityId: planned.id, fromDate: dateKey }))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {}}
          />
        ))}
        {nonRacePlannedOverflow > 0 && (
          <div style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            padding: '1px 4px',
            fontWeight: 500,
            fontStyle: 'italic',
          }}>
            +{nonRacePlannedOverflow} planned
          </div>
        )}
      </div>
    </div>
  )
}
