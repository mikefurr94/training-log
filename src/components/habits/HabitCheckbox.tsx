import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  checked: boolean
  onToggle: () => void
  color?: string
}

const PARTICLE_COUNT = 8
const PARTICLE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function HabitCheckbox({ checked, onToggle, color = 'var(--color-accent)' }: Props) {
  const [showParticles, setShowParticles] = useState(false)

  function handleClick() {
    if (!checked) {
      setShowParticles(true)
      setTimeout(() => setShowParticles(false), 600)
    }
    onToggle()
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {/* Confetti particles */}
      <AnimatePresence>
        {showParticles && (
          <>
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
              const angle = (i / PARTICLE_COUNT) * Math.PI * 2
              const dist = 16 + Math.random() * 8
              const dx = Math.cos(angle) * dist
              const dy = Math.sin(angle) * dist
              return (
                <motion.div
                  key={`p-${i}`}
                  initial={{ scale: 1, x: 0, y: 0, opacity: 1 }}
                  animate={{ scale: 0, x: dx, y: dy, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
          </>
        )}
      </AnimatePresence>

      {/* Circle + checkmark */}
      <AnimatePresence mode="wait">
        {checked ? (
          <motion.div
            key="checked"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.svg
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              width="14" height="14" viewBox="0 0 14 14" fill="none"
            >
              <motion.path
                d="M3 7L6 10L11 4"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25, delay: 0.1 }}
              />
            </motion.svg>
          </motion.div>
        ) : (
          <motion.div
            key="unchecked"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid var(--color-border)',
              background: 'transparent',
              transition: 'border-color 150ms ease',
            }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}
