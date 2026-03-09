import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import type { ChartSpec } from '../../store/types'

interface Props {
  spec: ChartSpec
}

export default function InlineChart({ spec }: Props) {
  const { type, title, data, xKey, series, xLabel, yLabel } = spec

  const commonAxisProps = {
    tick: { fontSize: 11, fill: 'var(--color-text-tertiary)' },
    axisLine: { stroke: 'var(--color-border)' },
    tickLine: false,
  }

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: 'var(--color-text-primary)', fontWeight: 600 },
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey={xKey} {...commonAxisProps} label={xLabel ? { value: xLabel, position: 'bottom', fontSize: 11 } : undefined} />
            <YAxis {...commonAxisProps} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
            <Tooltip {...tooltipStyle} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {series.map((s) => (
              <Bar key={s.dataKey} dataKey={s.dataKey} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {series.map((s) => (
              <Line key={s.dataKey} dataKey={s.dataKey} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} type="monotone" />
            ))}
          </LineChart>
        )
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey={xKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip {...tooltipStyle} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {series.map((s) => (
              <Area key={s.dataKey} dataKey={s.dataKey} name={s.label} stroke={s.color} fill={s.color} fillOpacity={0.15} strokeWidth={2} type="monotone" />
            ))}
          </AreaChart>
        )
    }
  }

  return (
    <div style={{
      background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)', padding: '12px 8px 4px',
      marginTop: 4,
    }}>
      {title && (
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)',
          padding: '0 8px 8px', letterSpacing: '-0.2px',
        }}>{title}</div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}
