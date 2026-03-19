import React from 'react'
import type { WeatherData } from '@/lib/external-api'
import { getDayForecast, getWeatherIcon } from '@/utils/weatherUtils'

interface WeatherStripProps {
  variant: 'header' | 'day'
  dayOffset?: number
  forecast?: WeatherData['forecast'] | null
  insight?: string | null
  className?: string
}

/* eslint-disable react-hooks/static-components */
export const WeatherStrip: React.FC<WeatherStripProps> = ({
  variant,
  dayOffset = 0,
  forecast,
  insight,
  className = '',
}) => {
  const dayData = getDayForecast(forecast, dayOffset)
  if (!dayData) return null

  const Icon =
    variant === 'header'
      ? getWeatherIcon(dayData.currentCode ?? dayData.dominantCode)
      : getWeatherIcon(dayData.dominantCode)

  if (variant === 'header') {
    const temp = dayData.currentTemp ?? dayData.maxTemp
    const text = insight || dayData.conditionText
    return (
      <div className={`flex items-center gap-1.5 mt-1 ${className}`}>
        <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="text-xs text-ceramic-text-secondary truncate">
          {Math.round(temp)}&deg; &middot; {text}
        </span>
      </div>
    )
  }

  // variant === 'day'
  return (
    <div className={`flex items-center gap-1.5 mb-3 ${className}`}>
      <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <span className="text-xs text-ceramic-text-secondary">
        {Math.round(dayData.minTemp)}&deg;&ndash;{Math.round(dayData.maxTemp)}&deg; &middot;{' '}
        {dayData.conditionText}
      </span>
    </div>
  )
}
