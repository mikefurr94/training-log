import { getWeatherIcon, type DailyWeather } from '../../api/weather'

interface Props {
  weather: DailyWeather
  compact?: boolean
}

export default function WeatherInfo({ weather, compact = false }: Props) {
  const { icon, label } = getWeatherIcon(weather.weatherCode)

  if (compact) {
    // Compact: just icon + high temp, for month/quarter views
    return (
      <div
        title={`${label} — ${weather.tempHigh}°/${weather.tempLow}° (feels ${weather.feelsLikeHigh}°/${weather.feelsLikeLow}°)`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          fontSize: 9,
          color: 'var(--color-text-tertiary)',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 10 }}>{icon}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{weather.tempHigh}°</span>
      </div>
    )
  }

  // Full: icon + high/low + feels like, for week view
  return (
    <div
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        color: 'var(--color-text-tertiary)',
        lineHeight: 1.2,
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
          {weather.tempHigh}°/{weather.tempLow}°
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.7, fontSize: 9 }}>
          Feels {weather.feelsLikeHigh}°/{weather.feelsLikeLow}°
        </span>
      </div>
    </div>
  )
}
