import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { HabitFrequency } from '../../store/types'
import EmojiPickerPopover from './EmojiPickerPopover'

export default function HabitDetailPanel() {
  const selectedHabitId = useAppStore((s) => s.selectedHabitId)
  const habits = useAppStore((s) => s.habits)
  const updateHabit = useAppStore((s) => s.updateHabit)
  const moveHabit = useAppStore((s) => s.moveHabit)
  const setSelectedHabitId = useAppStore((s) => s.setSelectedHabitId)
  const isMobile = useIsMobile()

  const habit = habits.find((h) => h.id === selectedHabitId) ?? null
  const isOpen = habit !== null

  const close = () => setSelectedHabitId(null)

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Determine position within the same visible grouping (archived + frequency)
  // that HabitWeekView uses when rendering.
  const targetFreq = habit?.frequency ?? 'daily'
  const peers = habit
    ? [...habits]
        .filter((h) => !!h.archived === !!habit.archived && (h.frequency ?? 'daily') === targetFreq)
        .sort((a, b) => a.order - b.order)
    : []
  const idx = peers.findIndex((h) => h.id === selectedHabitId)
  const isFirst = idx <= 0
  const isLast = idx >= peers.length - 1

  // Transient feedback state when a move button is clicked
  const [justMoved, setJustMoved] = useState<'up' | 'down' | null>(null)
  const moveTimer = useRef<number | null>(null)
  useEffect(() => () => { if (moveTimer.current) window.clearTimeout(moveTimer.current) }, [])
  const handleMove = (direction: 'up' | 'down') => {
    if (!habit) return
    moveHabit(habit.id, direction)
    setJustMoved(direction)
    if (moveTimer.current) window.clearTimeout(moveTimer.current)
    moveTimer.current = window.setTimeout(() => setJustMoved(null), 500)
  }

  return (
    <AnimatePresence>
      {isOpen && habit && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
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
              top: 0, right: 0, bottom: 0,
              left: isMobile ? 0 : undefined,
              width: isMobile ? '100%' : 380,
              maxWidth: isMobile ? '100%' : '92vw',
              background: 'var(--color-surface)',
              boxShadow: 'var(--shadow-panel)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: isMobile ? '12px 16px' : '16px 20px',
              paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : '16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            }}>
              <EmojiPickerPopover
                emoji={habit.emoji}
                onChange={(emoji) => updateHabit(habit.id, { emoji })}
                size={40}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)', letterSpacing: '-0.3px', margin: 0,
                }}>
                  {habit.name}
                </h2>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {(habit.frequency ?? 'daily') === 'weekly' ? 'Weekly habit' : 'Daily habit'}
                </div>
              </div>
              <button onClick={close} style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-tertiary)', fontSize: 22, flexShrink: 0,
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                cursor: 'pointer',
              }}>
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{
              flex: 1, overflow: 'auto',
              padding: isMobile ? '16px' : '20px',
              display: 'flex', flexDirection: 'column', gap: 24,
            }}>
              {/* Notes */}
              <Section title="Notes">
                <NotesEditor
                  value={habit.notes ?? ''}
                  onChange={(notes) => updateHabit(habit.id, { notes })}
                />
              </Section>

              {/* Frequency */}
              <Section title="Frequency">
                <FrequencyToggle
                  value={habit.frequency ?? 'daily'}
                  onChange={(frequency) => updateHabit(habit.id, { frequency })}
                />
              </Section>

              {/* Color */}
              <Section title="Color">
                <ColorPicker
                  value={habit.color}
                  onChange={(color) => updateHabit(habit.id, { color })}
                />
              </Section>

              {/* Weekly Goal */}
              <Section title="Weekly Goal">
                <GoalSelector
                  value={habit.weeklyGoal}
                  frequency={habit.frequency ?? 'daily'}
                  onChange={(weeklyGoal) => updateHabit(habit.id, { weeklyGoal })}
                />
              </Section>

              {/* Reorder */}
              <Section title="Reorder">
                <div style={{ display: 'flex', gap: 8 }}>
                  <ActionButton
                    onClick={() => handleMove('up')}
                    disabled={isFirst}
                    flash={justMoved === 'up'}
                  >
                    {justMoved === 'up' ? '✓ Moved up' : 'Move up'}
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleMove('down')}
                    disabled={isLast}
                    flash={justMoved === 'down'}
                  >
                    {justMoved === 'down' ? '✓ Moved down' : 'Move down'}
                  </ActionButton>
                </div>
                {peers.length > 1 && (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0.4, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      marginTop: 8,
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    Position {idx + 1} of {peers.length}
                  </motion.div>
                )}
              </Section>

              {/* Archive */}
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <button
                  onClick={() => {
                    updateHabit(habit.id, { archived: !habit.archived })
                    close()
                  }}
                  style={{
                    width: '100%', padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)', fontWeight: 600,
                    cursor: 'pointer',
                    border: habit.archived
                      ? '1px solid var(--color-border)'
                      : '1px solid #fca5a5',
                    background: habit.archived ? 'var(--color-bg)' : '#fef2f2',
                    color: habit.archived ? 'var(--color-text-secondary)' : '#dc2626',
                  }}
                >
                  {habit.archived ? 'Unarchive habit' : 'Archive habit'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function NotesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)

  // Sync if the habit changes externally
  useEffect(() => { setDraft(value) }, [value])

  return (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onChange(draft) }}
      placeholder="Add notes about this habit..."
      rows={3}
      style={{
        width: '100%', resize: 'vertical',
        padding: '10px 12px', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)', background: 'var(--color-bg)',
        fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)',
        fontFamily: 'inherit', lineHeight: 1.5,
      }}
    />
  )
}

function FrequencyToggle({ value, onChange }: { value: HabitFrequency; onChange: (v: HabitFrequency) => void }) {
  const options: { label: string; val: HabitFrequency }[] = [
    { label: 'Daily', val: 'daily' },
    { label: 'Weekly', val: 'weekly' },
  ]
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      {options.map((opt) => (
        <button
          key={opt.val}
          onClick={() => onChange(opt.val)}
          style={{
            flex: 1, padding: '8px 12px',
            fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer',
            border: 'none',
            borderRight: opt.val === 'daily' ? '1px solid var(--color-border)' : 'none',
            background: value === opt.val ? 'var(--color-accent)' : 'var(--color-bg)',
            color: value === opt.val ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function GoalSelector({ value, frequency, onChange }: {
  value?: number
  frequency: HabitFrequency
  onChange: (v: number | undefined) => void
}) {
  if (frequency === 'weekly') {
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        Weekly habits have a goal of once per week automatically.
      </div>
    )
  }

  const options = [
    { label: 'None', val: undefined },
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `${i + 1}×`,
      val: i + 1,
    })),
  ]

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const selected = opt.val === value || (opt.val === undefined && value === undefined)
        return (
          <button
            key={opt.label}
            onClick={() => onChange(opt.val)}
            style={{
              padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: 'pointer',
              border: selected ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
              background: selected ? 'var(--color-accent-light, rgba(99,102,241,0.1))' : 'var(--color-bg)',
              color: selected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const HABIT_COLOR_PALETTE = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#10b981', // emerald
  '#84cc16', // lime
  '#f59e0b', // amber
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
]

function ColorPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {HABIT_COLOR_PALETTE.map((hex) => {
        const selected = value === hex
        return (
          <button
            key={hex}
            onClick={() => onChange(hex)}
            title={hex}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: hex, border: 'none', cursor: 'pointer',
              outline: selected ? `3px solid ${hex}` : '3px solid transparent',
              outlineOffset: 2,
              transition: 'outline 100ms ease, transform 100ms ease',
              transform: selected ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        )
      })}
    </div>
  )
}

function ActionButton({ onClick, disabled, flash, children }: {
  onClick: () => void; disabled?: boolean; flash?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--font-size-sm)', fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
        border: flash ? '1px solid #10b981' : '1px solid var(--color-border)',
        background: flash ? 'rgba(16, 185, 129, 0.12)' : 'var(--color-bg)',
        color: flash ? '#047857' : disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
    >
      {children}
    </button>
  )
}
