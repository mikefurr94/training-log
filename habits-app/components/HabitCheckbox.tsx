import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  count: number
  target: number
  onToggle: () => void
  color?: string
}

const PARTICLE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
const GOLD_COLORS = ['#fbbf24', '#f59e0b', '#fcd34d', '#f97316', '#fb923c', '#fde68a', '#fbbf24', '#fcd34d', '#f59e0b', '#f97316', '#fbbf24', '#fb923c', '#fcd34d', '#f59e0b']

export default function HabitCheckbox({ count, target, onToggle, color = 'var(--color-accent)' }: Props) {
  const [showParticles, setShowParticles] = useState(false)
  const [showGoldBurst, setShowGoldBurst] = useState(false)

  const isDone = count >= target
  const isPartial = count > 0 && !isDone

  function handleClick() {
    const next = count >= target ? 0 : count + 1
    if (next === target) {
      // reaching goal
      setShowGoldBurst(true)
      setTimeout(() => setShowGoldBurst(false), 800)
    } else if (next > 0) {
      // partial progress
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
      {/* Regular confetti — partial progress */}
      <AnimatePresence>
        {showParticles && (
          <>
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2
              const dist = 14 + Math.random() * 6
              return (
                <motion.div
                  key={`p-${i}`}
                  initial={{ scale: 1, x: 0, y: 0, opacity: 1 }}
                  animate={{ scale: 0, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    position: 'absolute', width: 5, height: 5, borderRadius: '50%',
                    background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
          </>
        )}
      </AnimatePresence>

      {/* Gold star burst — goal reached */}
      <AnimatePresence>
        {showGoldBurst && (
          <>
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * Math.PI * 2
              const dist = 22 + Math.random() * 14
              return (
                <motion.div
                  key={`g-${i}`}
                  initial={{ scale: 1.4, x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ scale: 0, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, rotate: 120 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: i % 3 === 0 ? 7 : 5,
                    height: i % 3 === 0 ? 7 : 5,
                    borderRadius: i % 2 === 0 ? '50%' : 2,
                    background: GOLD_COLORS[i % GOLD_COLORS.length],
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
          </>
        )}
      </AnimatePresence>

      {/* Circle */}
      <AnimatePresence mode="wait">
        {isDone ? (
          <motion.div
            key={`done-${target}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={target > 1
              ? { scale: [1.35, 0.88, 1.1, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
            }
            exit={{ scale: 0.5, opacity: 0 }}
            transition={target > 1
              ? { duration: 0.45, times: [0, 0.35, 0.65, 1] }
              : { type: 'spring', stiffness: 500, damping: 20 }
            }
            style={{
              width: 24, height: 24, borderRadius: '50%', background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: target > 1 ? `0 0 0 2.5px ${color}55, 0 0 8px ${color}44` : undefined,
            }}
          >
            {target === 1 ? (
              <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <motion.path
                  d="M3 7L6 10L11 4"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                />
              </motion.svg>
            ) : (
              <span style={{
                color: 'white', fontSize: 8.5, fontWeight: 800,
                letterSpacing: '-0.3px', fontFamily: 'inherit', lineHeight: 1, userSelect: 'none',
              }}>
                ×{target}
              </span>
            )}
          </motion.div>
        ) : isPartial ? (
          <motion.div
            key={`partial-${count}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: color,
              opacity: 0.45,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{
              color: 'white', fontSize: 9, fontWeight: 800,
              letterSpacing: '-0.3px', fontFamily: 'inherit', lineHeight: 1, userSelect: 'none',
            }}>
              {count}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="unchecked"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid var(--color-border)',
              background: 'transparent',
            }}
          />
        )}
      </AnimatePresence>
    </button>
  )
}
