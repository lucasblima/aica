/**
 * WeatherInsightCard — Displays current weather + Gemini insight.
 *
 * States:
 *   1. Loading — skeleton pulse
 *   2. Connect — no location, prompts user to connect
 *   3. Complete — weather icon + temperature + insight
 *   4. Error — returns null (silently hidden)
 */

import React, { useState } from 'react'
import { Sun, Cloud, CloudRain, MapPin } from 'lucide-react'
import { useWeatherInsight } from '@/hooks/useWeatherInsight'
import { LocationConnectModal } from './LocationConnectModal'
import type { WeatherData } from '@/lib/external-api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Gets the temperature for the current hour from the hourly forecast array.
 */
function getCurrentTemp(forecast: WeatherData['forecast']): number | null {
  const now = new Date()
  const currentHour = now.getHours()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD

  const idx = forecast.hourly.time.findIndex((t) => {
    const d = new Date(t)
    return d.toISOString().slice(0, 10) === todayStr && d.getHours() === currentHour
  })

  return idx >= 0 ? forecast.hourly.temperature_2m[idx] : null
}

/**
 * Gets the WMO weather code for the current hour.
 */
function getCurrentWeatherCode(forecast: WeatherData['forecast']): number | null {
  const now = new Date()
  const currentHour = now.getHours()
  const todayStr = now.toISOString().slice(0, 10)

  const idx = forecast.hourly.time.findIndex((t) => {
    const d = new Date(t)
    return d.toISOString().slice(0, 10) === todayStr && d.getHours() === currentHour
  })

  return idx >= 0 ? forecast.hourly.weathercode[idx] : null
}

/**
 * Maps WMO weather codes to a Lucide icon component.
 */
function getWeatherIcon(code: number | null) {
  if (code === null) return Cloud
  if (code === 0 || code === 1) return Sun
  if (code === 2 || code === 3) return Cloud
  if (code === 61 || code === 63 || code === 65) return CloudRain
  return Cloud
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WeatherInsightCard: React.FC = () => {
  const { weather, insight, hasLocation, isLoading } = useWeatherInsight()
  const [showModal, setShowModal] = useState(false)

  // State 1: Loading
  if (isLoading) {
    return (
      <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ceramic-cool" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-ceramic-cool rounded w-24" />
            <div className="h-3 bg-ceramic-cool rounded w-48" />
          </div>
        </div>
      </div>
    )
  }

  // State 2: No location — prompt to connect
  if (!hasLocation) {
    return (
      <>
        <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-ceramic-text-secondary">
                Ative sua localização para insights de clima
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-sm font-medium text-amber-600 hover:text-amber-700 mt-0.5"
              >
                Conectar →
              </button>
            </div>
          </div>
        </div>

        {showModal && (
          <LocationConnectModal onClose={() => setShowModal(false)} />
        )}
      </>
    )
  }

  // State 4: Has location but no weather data (error) — silently hidden
  if (!weather) {
    return null
  }

  // State 3: Complete — show weather + insight
  const temp = getCurrentTemp(weather.forecast)
  const code = getCurrentWeatherCode(weather.forecast)
  const WeatherIcon = getWeatherIcon(code)

  return (
    <div className="bg-ceramic-base rounded-xl p-4 shadow-ceramic-emboss">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
          <WeatherIcon className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          {temp !== null && (
            <p className="text-sm font-medium text-ceramic-text-primary">
              {Math.round(temp)}°C
            </p>
          )}
          {insight && (
            <p className="text-sm text-ceramic-text-secondary truncate">
              {insight}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
