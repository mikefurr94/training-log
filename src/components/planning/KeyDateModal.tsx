import { useState } from 'react'
import type { KeyDate, KeyDateType } from '../../store/types'

interface Props {
  initial?: KeyDate
  defaultDate?: string // 'YYYY-MM-DD'
  onSave: (keyDate: KeyDate) => void
  onDelete?: () => void
  onClose: () => void
}

function generateId() {
  return 'kd-' + Math.random().toString(36).slice(2, 10)
}

const TYPE_OPTIONS: { type: KeyDateType; emoji: string; label: string }[] = [
  { type: 'race', emoji: '🏁', label: 'Race' },
  { type: 'event', emoji: '📌', label: 'Event' },
]

const DISTANCE_PRESETS = ['Marathon', 'Half Marathon', '10K', '5K', 'Other']

export default function KeyDateModal({ initial, defaultDate, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  const [type, setType] = useState<KeyDateType>(initial?.type ?? 'race')
  const [distance, setDistance] = useState(initial?.distance ?? '')
  const [customDistance, setCustomDistance] = useState(
    initial?.distance && !DISTANCE_PRESETS.slice(0, -1).includes(initial.distance) ? initial.distance : ''
  )
  const [goalTime, setGoalTime] = useState(initial?.goalTime ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isCustomDistance = distance === 'Other' || (distance && !DISTANCE_PRESETS.slice(0, -1).includes(distance))
  const effectiveDistance = isCustomDistance ? customDistance : distance

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Enter a name'
    if (!date) newErrors.date = 'Select a date'
    if (goalTime && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(goalTime)) {
      newErrors.goalTime = 'Use H:MM:SS or M:SS format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      id: initial?.id ?? generateId(),
      name: name.trim(),
      date,
      type,
      ...(type === 'race' && effectiveDistance ? { distance: effectiveDistance } : {}),
      ...(type === 'race' && goalTime ? { goalTime } : {}),
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: 24, width: 360, zIndex: 201,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16,
          maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            {initial ? 'Edit key date' : 'Add key date'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Type selector */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {TYPE_OPTIONS.map(({ type: t, emoji, label }) => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
                  borderRadius: 'var(--radius-full)', fontSize: 'var(--font-size-sm)',
                  fontWeight: type === t ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  border: `1.5px solid ${type === t ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: type === t ? 'var(--color-accent-light)' : 'transparent',
                  color: type === t ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label style={labelStyle}>Name</label>
          <input
            type="text" value={name}
            onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })) }}
            placeholder="e.g. Brooklyn Half Marathon"
            style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : undefined }}
          />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Date</label>
          <input
            type="date" value={date}
            onChange={(e) => { setDate(e.target.value); if (errors.date) setErrors((p) => ({ ...p, date: '' })) }}
            style={{ ...inputStyle, borderColor: errors.date ? '#ef4444' : undefined }}
          />
          {errors.date && <div style={errorStyle}>{errors.date}</div>}
        </div>

        {/* Race-specific fields */}
        {type === 'race' && (
          <>
            {/* Distance */}
            <div>
              <label style={labelStyle}>Distance</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                {DISTANCE_PRESETS.map((d) => {
                  const isActive = d === 'Other'
                    ? isCustomDistance
                    : distance === d
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        if (d === 'Other') {
                          setDistance('Other')
                        } else {
                          setDistance(d)
                          setCustomDistance('')
                        }
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--font-size-xs)', fontWeight: isActive ? 600 : 500,
                        border: `1.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isActive ? 'var(--color-accent-light)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
              {isCustomDistance && (
                <input
                  type="text"
                  value={customDistance}
                  onChange={(e) => setCustomDistance(e.target.value)}
                  placeholder="e.g. 15K, 50 miler"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}
            </div>

            {/* Goal Time */}
            <div>
              <label style={labelStyle}>Goal Time</label>
              <input
                type="text"
                value={goalTime}
                onChange={(e) => { setGoalTime(e.target.value); if (errors.goalTime) setErrors((p) => ({ ...p, goalTime: '' })) }}
                placeholder="e.g. 1:45:00"
                style={{ ...inputStyle, borderColor: errors.goalTime ? '#ef4444' : undefined }}
              />
              {errors.goalTime
                ? <div style={errorStyle}>{errors.goalTime}</div>
                : <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>Optional — H:MM:SS or M:SS format</div>
              }
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          {initial && onDelete && (
            <button onClick={onDelete} style={{ ...secondaryBtnStyle, color: 'var(--color-status-missed-text)', borderColor: 'var(--color-status-missed-border)', marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleSave} style={primaryBtnStyle}>
            {initial ? 'Save' : 'Add event'}
          </button>
        </div>
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)',
  color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)',
  outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
}

const errorStyle: React.CSSProperties = { fontSize: 11, color: '#ef4444', marginTop: 3 }

const primaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--color-accent)',
  color: 'var(--color-text-inverse)', border: 'none', fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)', cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 'var(--radius-sm)', background: 'transparent',
  color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', cursor: 'pointer',
}
