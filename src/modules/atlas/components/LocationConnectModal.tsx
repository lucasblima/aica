/**
 * LocationConnectModal — Allows the user to set their location via 3 methods:
 *   1. Detectar — Browser Geolocation API
 *   2. CEP — Brazilian postal code lookup
 *   3. Cidade — Select from 12 Brazilian capitals
 *
 * On success, saves location to profiles and invalidates the cache.
 */

import React, { useState } from 'react'
import { X, Navigation, MapPin, Building2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { detectLocationFromBrowser, saveManualLocation } from '@/services/geolocationService'
import { lookupCEP } from '@/services/brasilApiService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'detect' | 'cep' | 'city'

interface LocationConnectModalProps {
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Brazilian capitals
// ---------------------------------------------------------------------------

const CAPITALS = [
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, tz: 'America/Sao_Paulo' },
  { name: 'Brasília', lat: -15.7975, lng: -47.8919, tz: 'America/Sao_Paulo' },
  { name: 'Belo Horizonte', lat: -19.9167, lng: -43.9345, tz: 'America/Sao_Paulo' },
  { name: 'Salvador', lat: -12.9714, lng: -38.5124, tz: 'America/Bahia' },
  { name: 'Curitiba', lat: -25.4297, lng: -49.2711, tz: 'America/Sao_Paulo' },
  { name: 'Recife', lat: -8.0476, lng: -34.877, tz: 'America/Recife' },
  { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177, tz: 'America/Sao_Paulo' },
  { name: 'Fortaleza', lat: -3.7172, lng: -38.5433, tz: 'America/Fortaleza' },
  { name: 'Manaus', lat: -3.119, lng: -60.0217, tz: 'America/Manaus' },
  { name: 'Belém', lat: -1.4558, lng: -48.5024, tz: 'America/Belem' },
  { name: 'Goiânia', lat: -16.6869, lng: -49.2648, tz: 'America/Sao_Paulo' },
] as const

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'detect', label: 'Detectar', icon: Navigation },
  { id: 'cep', label: 'CEP', icon: MapPin },
  { id: 'city', label: 'Cidade', icon: Building2 },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LocationConnectModal: React.FC<LocationConnectModalProps> = ({ onClose }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<Tab>('detect')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cepInput, setCepInput] = useState('')

  // Strip non-digits for CEP
  const cleanCep = cepInput.replace(/\D/g, '')

  /** Save location, invalidate cache, and close modal */
  async function saveAndClose(data: {
    city: string
    latitude: number
    longitude: number
    timezone?: string
  }) {
    if (!user) return

    const ok = await saveManualLocation(user.id, data)
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: ['user-location'] })
      onClose()
    } else {
      setError('Erro ao salvar localização. Tente novamente.')
    }
  }

  // -----------------------------------------------------------------------
  // Tab 1: Detect via Browser Geolocation
  // -----------------------------------------------------------------------
  async function handleDetect() {
    setLoading(true)
    setError(null)

    try {
      const coords = await detectLocationFromBrowser()

      if (!coords) {
        setError('Permissão negada ou localização indisponível.')
        return
      }

      await saveAndClose({
        city: '',
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    } catch {
      setError('Erro ao detectar localização.')
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Tab 2: CEP lookup
  // -----------------------------------------------------------------------
  async function handleCep() {
    setLoading(true)
    setError(null)

    try {
      const data = await lookupCEP(cleanCep)

      if (!data) {
        setError('CEP não encontrado.')
        return
      }

      const lat = data.location?.coordinates?.latitude
      const lng = data.location?.coordinates?.longitude

      if (!lat || !lng) {
        setError('CEP encontrado mas sem coordenadas. Tente selecionar a cidade.')
        return
      }

      await saveAndClose({
        city: data.city,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    } catch {
      setError('Erro ao buscar CEP.')
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Tab 3: City selection
  // -----------------------------------------------------------------------
  async function handleCity(city: (typeof CAPITALS)[number]) {
    setLoading(true)
    setError(null)

    try {
      await saveAndClose({
        city: city.name,
        latitude: city.lat,
        longitude: city.lng,
        timezone: city.tz,
      })
    } catch {
      setError('Erro ao salvar localização.')
    } finally {
      setLoading(false)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-ceramic-base rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-ceramic-text-primary">
            Localização
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="mx-5 mb-4 flex gap-1 bg-ceramic-cool rounded-lg p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-ceramic-base shadow-sm text-ceramic-text-primary'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-5 pb-5 min-h-[200px]">
          {/* --- Detect tab --- */}
          {tab === 'detect' && (
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Navigation className="w-7 h-7 text-amber-600" />
              </div>
              <p className="text-sm text-ceramic-text-secondary max-w-xs">
                Seu navegador vai pedir permissão para acessar a localização.
              </p>
              <button
                onClick={handleDetect}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
              >
                {loading ? 'Detectando...' : 'Detectar automaticamente'}
              </button>
            </div>
          )}

          {/* --- CEP tab --- */}
          {tab === 'cep' && (
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-amber-600" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Digite seu CEP"
                maxLength={9}
                value={cepInput}
                onChange={(e) => setCepInput(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 rounded-lg border border-ceramic-border bg-ceramic-base text-ceramic-text-primary text-center text-lg tracking-wider placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={handleCep}
                disabled={loading || cleanCep.length !== 8}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
              >
                {loading ? 'Buscando...' : 'Buscar CEP'}
              </button>
            </div>
          )}

          {/* --- City tab --- */}
          {tab === 'city' && (
            <div className="max-h-64 overflow-y-auto -mx-1 px-1 space-y-1">
              {CAPITALS.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleCity(city)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-ceramic-cool disabled:opacity-50 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                  <span className="text-sm text-ceramic-text-primary">{city.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="mt-3 text-sm text-ceramic-error text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
