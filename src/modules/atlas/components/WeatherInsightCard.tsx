/**
 * WeatherInsightCard — Displays current weather + Gemini insight.
 *
 * States:
 *   1. Loading — compact skeleton with spinner
 *   2. Connect — no location, prompts user to connect
 *   3. Complete — weather icon + temperature + insight (compact inline)
 *   4. Error — friendly error message
 */

import React, { useState } from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, MapPin, ChevronDown, CloudOff, Loader2 } from 'lucide-react'
import { useWeatherInsight } from '@/hooks/useWeatherInsight'
import { LocationConnectModal } from './LocationConnectModal'
import type { WeatherData } from '@/lib/external-api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentTemp(forecast: WeatherData['forecast']): number | null {
  const now = new Date()
  const currentHour = now.getHours()
  const todayStr = now.toISOString().slice(0, 10)

  const idx = forecast.hourly.time.findIndex((t) => {
    const d = new Date(t)
    return d.toISOString().slice(0, 10) === todayStr && d.getHours() === currentHour
  })

  return idx >= 0 ? forecast.hourly.temperature_2m[idx] : null
}

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

function getWeatherIcon(code: number | null) {
  if (code === null) return Cloud
  if (code === 0 || code === 1) return Sun
  if (code === 2 || code === 3) return Cloud
  if (code >= 51 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return CloudSnow
  if (code >= 95) return CloudLightning
  return Cloud
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WeatherInsightCardProps {
  compact?: boolean
}

/* eslint-disable react-hooks/static-components */
export const WeatherInsightCard: React.FC<WeatherInsightCardProps> = ({ compact = false }) => {
  const { weather, insight, hasLocation, isLoading } = useWeatherInsight()
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState(!compact)

  // State 1: Loading — compact skeleton with spinner
  if (isLoading) {
    return (
      <div className="bg-ceramic-base rounded-xl px-3 py-2.5 shadow-ceramic-emboss">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <div className="h-3 bg-ceramic-cool rounded w-10 animate-pulse" />
            <div className="h-3 bg-ceramic-cool rounded flex-1 max-w-[140px] animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // State 2: No location — compact prompt to connect
  if (!hasLocation) {
    return (
      <>
        <div className="bg-ceramic-base rounded-xl px-3 py-2.5 shadow-ceramic-emboss">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-ceramic-text-secondary flex-1">
              Ative localização para clima
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 shrink-0"
            >
              Conectar
            </button>
          </div>
        </div>

        {showModal && (
          <LocationConnectModal onClose={() => setShowModal(false)} />
        )}
      </>
    )
  }

  // State 4: Has location but no weather data (error) — friendly message
  if (!weather) {
    return (
      <div className="bg-ceramic-base rounded-xl px-3 py-2.5 shadow-ceramic-emboss">
        <div className="flex items-center gap-2">
          <CloudOff className="w-4 h-4 text-ceramic-text-secondary shrink-0" />
          <p className="text-xs text-ceramic-text-secondary flex-1">
            Clima indisponivel no momento
          </p>
        </div>
      </div>
    )
  }

  // State 3: Complete — show weather + insight
  const temp = getCurrentTemp(weather.forecast)
  const code = getCurrentWeatherCode(weather.forecast)
  const WeatherIcon = getWeatherIcon(code)

  // Compact collapsed: single-line summary
  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-ceramic-base rounded-xl px-3 py-2.5 shadow-ceramic-emboss flex items-center gap-2 text-left"
      >
        <WeatherIcon className="w-4 h-4 text-amber-600 shrink-0" />
        {temp !== null && (
          <span className="text-xs font-medium text-ceramic-text-primary">
            {Math.round(temp)}°C
          </span>
        )}
        {insight && (
          <span className="text-xs text-ceramic-text-secondary truncate flex-1">
            — {insight}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-ceramic-text-secondary shrink-0" />
      </button>
    )
  }

  // Full card (default, or compact expanded)
  return (
    <div className="bg-ceramic-base rounded-xl px-3 py-2.5 shadow-ceramic-emboss">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <WeatherIcon className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {temp !== null && (
              <span className="text-xs font-medium text-ceramic-text-primary">
                {Math.round(temp)}°C
              </span>
            )}
            {insight && (
              <span className="text-xs text-ceramic-text-secondary truncate">
                — {insight}
              </span>
            )}
          </div>
        </div>
        {compact && (
          <button onClick={() => setExpanded(false)} className="p-0.5 shrink-0">
            <ChevronDown className="w-3.5 h-3.5 text-ceramic-text-secondary rotate-180" />
          </button>
        )}
      </div>
    </div>
  )
}
