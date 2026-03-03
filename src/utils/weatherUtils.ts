import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, type LucideIcon } from 'lucide-react'
import type { WeatherData } from '@/lib/external-api'

export const WMO_CONDITIONS: Record<number, string> = {
  0: 'Céu limpo', 1: 'Predominantemente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina com geada',
  51: 'Garoa leve', 53: 'Garoa moderada', 55: 'Garoa intensa',
  61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva forte',
  71: 'Neve leve', 73: 'Neve moderada', 75: 'Neve forte',
  80: 'Pancadas leves', 81: 'Pancadas moderadas', 82: 'Pancadas fortes',
  95: 'Tempestade', 96: 'Tempestade com granizo leve', 99: 'Tempestade com granizo forte',
}

export function getWeatherIcon(code: number | null): LucideIcon {
  if (code === null) return Cloud
  if (code <= 1) return Sun
  if (code <= 3) return Cloud
  if (code >= 51 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return CloudSnow
  if (code >= 80 && code <= 82) return CloudRain
  if (code >= 95) return CloudLightning
  return Cloud
}

export interface DayForecast {
  minTemp: number
  maxTemp: number
  dominantCode: number
  conditionText: string
  currentTemp?: number
  currentCode?: number
}

export function getDayForecast(
  forecast: WeatherData['forecast'] | undefined | null,
  dayOffset: number
): DayForecast | null {
  if (!forecast?.hourly?.time?.length) return null

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + dayOffset)
  const targetStr = targetDate.toISOString().slice(0, 10)

  const indices: number[] = []
  for (let i = 0; i < forecast.hourly.time.length; i++) {
    if (forecast.hourly.time[i].startsWith(targetStr)) {
      indices.push(i)
    }
  }

  if (indices.length === 0) return null

  const temps = indices.map(i => forecast.hourly.temperature_2m[i])
  const codes = indices.map(i => forecast.hourly.weathercode[i])

  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const dominantCode = getMostFrequent(codes)
  const conditionText = WMO_CONDITIONS[dominantCode] || 'Indefinido'

  const result: DayForecast = { minTemp, maxTemp, dominantCode, conditionText }

  if (dayOffset === 0) {
    const currentHour = new Date().getHours()
    const currentIdx = indices.find(i => {
      const h = new Date(forecast.hourly.time[i]).getHours()
      return h === currentHour
    })
    if (currentIdx !== undefined) {
      result.currentTemp = forecast.hourly.temperature_2m[currentIdx]
      result.currentCode = forecast.hourly.weathercode[currentIdx]
    }
  }

  return result
}

function getMostFrequent(arr: number[]): number {
  const counts = new Map<number, number>()
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1)
  }
  let maxCount = 0
  let maxVal = 0
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxVal = val
    }
  }
  return maxVal
}
