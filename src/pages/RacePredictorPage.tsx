import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { parseISO, format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { useRacePredictorData } from '../hooks/useRacePredictorData'
import { useIsMobile } from '../hooks/useIsMobile'
import { metersToMiles, formatDuration, formatPace } from '../utils/formatters'
import { loadRaceGoals, saveRaceGoals } from '../api/db'
import {
  RACE_DISTANCES, generatePredictions, generateWeeklyTrend,
  parseGoalTime, formatGoalTime,
} from '../utils/racePredictor'
import type { PredictionResult, WeeklyTrendPoint } from '../utils/racePredictor'

const CONFIDENCE_COLORS = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#ef4444',
}

const CHART_COLOR = '#6366f1'
const GOAL_COLOR = '#f59e0b'

export default function RacePredictorPage() {
  const activitiesByDate = useRacePredictorData()
  const athlete = useAppStore((s) => s.athlete)
  const isMobile = useIsMobile()

  const [selectedTab, setSelectedTab] = useState(0)
  const [goals, setGoals] = useState<Record<string, string>>({})
  const [goalInput, setGoalInput] = useState('')
  const [goalsLoaded, setGoalsLoaded] = useState(false)

  // Load goals from Supabase
  useEffect(() => {
    if (!athlete?.id) return
    loadRaceGoals(athlete.id)
      .then((g) => {
        setGoals(g)
        setGoalsLoaded(true)
      })
      .catch(() => setGoalsLoaded(true))
  }, [athlete?.id])

  // Sync goalInput when tab changes or goals load
  useEffect(() => {
    const dist = RACE_DISTANCES[selectedTab]
    setGoalInput(goals[dist.name] ?? '')
  }, [selectedTab, goalsLoaded])

  const result = useMemo<PredictionResult | null>(
    () => generatePredictions(activitiesByDate),
    [activitiesByDate],
  )

  const trendData = useMemo<WeeklyTrendPoint[]>(
    () => generateWeeklyTrend(activitiesByDate, selectedTab),
    [activitiesByDate, selectedTab],
  )

  const currentPrediction = result?.predictions[selectedTab] ?? null
  const currentDistance = RACE_DISTANCES[selectedTab]
  const goalTimeStr = goals[currentDistance.name]
  const goalSeconds = goalTimeStr ? parseGoalTime(goalTimeStr) : null

  const handleSaveGoal = useCallback(() => {
    const parsed = parseGoalTime(goalInput)
    if (!parsed || !athlete?.id) return
    const formatted = formatGoalTime(parsed)
    const updated = { ...goals, [currentDistance.name]: formatted }
    setGoals(updated)
    setGoalInput(formatted)
    saveRaceGoals(athlete.id, updated).catch(() => {})
  }, [goalInput, athlete?.id, goals, currentDistance.name])

  const handleClearGoal = useCallback(() => {
    if (!athlete?.id) return
    const updated = { ...goals }
    delete updated[currentDistance.name]
    setGoals(updated)
    setGoalInput('')
    saveRaceGoals(athlete.id, updated).catch(() => {})
  }, [athlete?.id, goals, currentDistance.name])

  // Filter out null points for the chart
  const chartData = trendData.filter((d) => d.predictedTime !== null)

  // Y-axis domain: find min/max of predicted times + goal
  const times = chartData.map((d) => d.predictedTime as number)
  if (goalSeconds) times.push(goalSeconds)
  const minTime = times.length > 0 ? Math.min(...times) : 0
  const maxTime = times.length > 0 ? Math.max(...times) : 0
  const yPadding = Math.max((maxTime - minTime) * 0.15, 30)
  const yMin = Math.max(0, Math.floor((minTime - yPadding) / 60) * 60)
  const yMax = Math.ceil((maxTime + yPadding) / 60) * 60

  const chartInterval = isMobile ? 3 : 1

  return (
    <div style={{
      padding: isMobile ? '16px 12px 24px' : '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 16 : 24,
      maxWidth: 1100,
      margin: '0 auto',
      width: '100%',
    }}>

      {/* ── Distance Tabs ── */}
      <div style={{
        display: 'flex',
        gap: isMobile ? 4 : 8,
        flexWrap: 'wrap',
      }}>
        {RACE_DISTANCES.map((dist, i) => {
          const isActive = i === selectedTab
          return (
            <button
              key={dist.name}
              onClick={() => setSelectedTab(i)}
              style={{
                padding: isMobile ? '8px 14px' : '10px 20px',
                borderRadius: 'var(--radius-lg)',
                border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                background: isActive ? 'var(--color-accent-light)' : 'var(--color-surface)',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-base)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {isMobile ? dist.shortName : dist.name}
            </button>
          )
        })}
      </div>

      {/* ── Current Prediction ── */}
      {currentPrediction ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: isMobile ? '16px' : '20px 24px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: isMobile ? 12 : 32,
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? 10 : 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}>Current Prediction</div>
            <div style={{
              fontSize: isMobile ? 32 : 40,
              fontWeight: 800,
              color: CHART_COLOR,
              letterSpacing: '-2px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>{formatDuration(currentPrediction.predictedTime)}</div>
          </div>

          <div style={{ display: 'flex', gap: isMobile ? 20 : 32, alignItems: 'center' }}>
            <div>
              <div style={{
                fontSize: isMobile ? 10 : 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}>Pace</div>
              <div style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatPace(currentDistance.meters / currentPrediction.predictedTime)}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: isMobile ? 10 : 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}>Confidence</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: CONFIDENCE_COLORS[currentPrediction.confidence],
                  display: 'inline-block',
                }} />
                <span style={{
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: 600,
                  color: CONFIDENCE_COLORS[currentPrediction.confidence],
                  textTransform: 'capitalize',
                }}>
                  {currentPrediction.confidence}
                </span>
              </div>
            </div>
          </div>

          {goalSeconds && (
            <div style={{ marginLeft: isMobile ? 0 : 'auto' }}>
              <div style={{
                fontSize: isMobile ? 10 : 11,
                fontWeight: 600,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 2,
              }}>vs Goal</div>
              {(() => {
                const diff = currentPrediction.predictedTime - goalSeconds
                const ahead = diff < 0
                return (
                  <div style={{
                    fontSize: isMobile ? 16 : 20,
                    fontWeight: 700,
                    color: ahead ? '#22c55e' : '#ef4444',
                  }}>
                    {ahead ? '-' : '+'}{formatDuration(Math.abs(diff))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: isMobile ? '32px 16px' : '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: isMobile ? 'var(--font-size-base)' : 'var(--font-size-md)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 8,
          }}>Not enough data yet</div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            maxWidth: 400,
            margin: '0 auto',
          }}>
            Log at least 2 qualifying runs (1+ mile, 10+ min) in the last 6 months to see predictions. Keep running and check back!
          </div>
        </div>
      )}

      {/* ── Trend Chart ── */}
      {chartData.length > 1 && (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: isMobile ? '12px 8px 4px' : '16px 16px 8px',
        }}>
          <div style={{
            marginBottom: isMobile ? 8 : 12,
            paddingLeft: isMobile ? 4 : 0,
          }}>
            <span style={{
              fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-base)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}>{currentDistance.name} Prediction Trend</span>
            <span style={{
              fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              marginLeft: 8,
            }}>6-month rolling</span>
          </div>

          <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
            <LineChart data={chartData} margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? -16 : -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                interval={chartInterval}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: isMobile ? 9 : 11, fill: 'var(--color-text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatDuration}
                reversed
              />
              <Tooltip content={<PredictionTooltip distanceName={currentDistance.name} />} />
              <Line
                type="monotone"
                dataKey="predictedTime"
                stroke={CHART_COLOR}
                strokeWidth={2.5}
                dot={{ r: 3, fill: CHART_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART_COLOR, strokeWidth: 2, stroke: '#fff' }}
                name="Predicted Time"
              />
              {goalSeconds && (
                <ReferenceLine
                  y={goalSeconds}
                  stroke={GOAL_COLOR}
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: `Goal: ${formatGoalTime(goalSeconds)}`,
                    position: 'right',
                    fill: GOAL_COLOR,
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 600,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Goal Input ── */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: isMobile ? '14px 16px' : '16px 20px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 10 : 16,
      }}>
        <div style={{
          fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-base)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
        }}>
          {currentDistance.name} Goal
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          flex: 1,
          alignItems: 'center',
        }}>
          <input
            type="text"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
            placeholder={currentDistance.meters >= 21000 ? 'H:MM:SS' : 'MM:SS'}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontVariantNumeric: 'tabular-nums',
              width: isMobile ? '100%' : 120,
              outline: 'none',
            }}
          />
          <button
            onClick={handleSaveGoal}
            disabled={!goalInput.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: goalInput.trim() ? 'var(--color-accent)' : 'var(--color-border)',
              color: goalInput.trim() ? '#fff' : 'var(--color-text-tertiary)',
              fontWeight: 600,
              fontSize: 'var(--font-size-sm)',
              cursor: goalInput.trim() ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            Set Goal
          </button>
          {goalSeconds && (
            <button
              onClick={handleClearGoal}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-tertiary)',
                fontWeight: 500,
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Training Metrics ── */}
      {result && (
        <section>
          <div style={{ marginBottom: isMobile ? 8 : 12 }}>
            <h2 style={{
              fontSize: isMobile ? 'var(--font-size-base)' : 'var(--font-size-md)',
              fontWeight: 700, color: 'var(--color-text-primary)',
              letterSpacing: '-0.3px', display: 'inline',
            }}>Training Summary</h2>
            <span style={{
              fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)', marginLeft: 8, fontWeight: 400,
            }}>Last 6 months</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: isMobile ? 8 : 12,
          }}>
            <MetricCard
              label="Avg Weekly Miles"
              value={`${result.metrics.weeklyMileageAvg}`}
              unit="mi/wk"
              isMobile={isMobile}
            />
            <MetricCard
              label="Total Runs"
              value={`${result.metrics.totalRuns}`}
              unit="runs"
              isMobile={isMobile}
            />
            <MetricCard
              label="Longest Run"
              value={`${result.metrics.longestRunMiles}`}
              unit="mi"
              isMobile={isMobile}
            />
            <MetricCard
              label="VDOT"
              value={`${result.referenceVdot}`}
              unit="fitness"
              isMobile={isMobile}
            />
          </div>
        </section>
      )}

      {/* ── Key Efforts ── */}
      {result && result.bestEfforts.length > 0 && (
        <section>
          <div style={{ marginBottom: isMobile ? 8 : 12 }}>
            <h2 style={{
              fontSize: isMobile ? 'var(--font-size-base)' : 'var(--font-size-md)',
              fontWeight: 700, color: 'var(--color-text-primary)',
              letterSpacing: '-0.3px',
            }}>Key Efforts</h2>
          </div>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            {result.bestEfforts.map((effort, i) => {
              const a = effort.activity
              const date = parseISO(a.start_date_local)
              const miles = metersToMiles(a.distance)
              const speed = a.distance / a.moving_time

              return (
                <div
                  key={a.id}
                  onClick={() => useAppStore.getState().selectActivity(a.id)}
                  style={{
                    padding: isMobile ? '10px 14px' : '12px 18px',
                    borderBottom: i < result.bestEfforts.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{
                      fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-base)',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}>
                      {a.name}
                    </div>
                    <div style={{
                      fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
                      color: 'var(--color-text-tertiary)',
                    }}>
                      {format(date, 'MMM d, yyyy')}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: isMobile ? 12 : 24,
                    alignItems: 'center',
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-base)',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>{miles.toFixed(2)} mi</div>
                      <div style={{
                        fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
                        color: 'var(--color-text-tertiary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>{formatDuration(a.moving_time)} &middot; {formatPace(speed)}</div>
                    </div>
                    <div style={{
                      background: CHART_COLOR,
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px 8px',
                      fontSize: isMobile ? 10 : 12,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}>
                      {effort.vdot.toFixed(1)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, isMobile }: {
  label: string; value: string; unit: string; isMobile: boolean
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border)',
      padding: isMobile ? '12px 12px' : '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 4 : 6,
    }}>
      <div style={{
        fontSize: isMobile ? 10 : 11,
        fontWeight: 600,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontSize: isMobile ? 22 : 28,
          fontWeight: 800,
          color: CHART_COLOR,
          letterSpacing: '-1.5px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</span>
        <span style={{
          fontSize: isMobile ? 10 : 12,
          color: 'var(--color-text-tertiary)',
          fontWeight: 500,
        }}>{unit}</span>
      </div>
    </div>
  )
}

function PredictionTooltip({ active, payload, label, distanceName }: any) {
  if (!active || !payload?.length) return null
  const time = payload[0]?.value
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>Week of {label}</div>
      <div style={{ color: CHART_COLOR, fontWeight: 700 }}>
        {distanceName}: {formatDuration(time)}
      </div>
    </div>
  )
}
