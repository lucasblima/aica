/**
 * Types for external API integrations
 *
 * These APIs are called via Supabase Edge Functions to keep
 * API keys secure on the backend.
 *
 * @module lib/external-api
 */

export type ExternalApiName =
  | 'holidays'
  | 'weather'
  | 'geolocation'
  | 'brasil-cep'
  | 'brasil-cnpj'
  | 'brasil-banks'
  | 'brasil-ddd'
  | 'turnstile-verify'

export interface ExternalApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  cached?: boolean
  fallback?: boolean
}

export interface HolidayData {
  date: string
  name: string
  local_name: string
  year: number
  holiday_type: string
}

export interface WeatherData {
  forecast: {
    hourly: {
      time: string[]
      temperature_2m: number[]
      precipitation: number[]
      weathercode: number[]
      windspeed_10m: number[]
    }
  }
  insight: string
}

export interface GeolocationData {
  timezone: string
  city: string
  latitude: number
  longitude: number
  source: 'ipapi' | 'browser' | 'cep' | 'manual'
}

export interface CepData {
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  location: {
    type: string
    coordinates: { longitude: string; latitude: string }
  }
}

export interface CnpjData {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: string
  descricao_situacao_cadastral: string
}

export interface BankData {
  ispb: string
  name: string
  code: number | null
  fullName: string
}

export interface DddData {
  state: string
  cities: string[]
}

export class ExternalApiError extends Error {
  constructor(
    message: string,
    public api: ExternalApiName,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ExternalApiError'
  }
}
