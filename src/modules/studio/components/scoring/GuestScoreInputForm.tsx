/**
 * GuestScoreInputForm Component
 * Task 8 — Wire module-specific items (Batch 4)
 *
 * Input form for scoring podcast guest candidates.
 * Uses sliders for 4 dimensions (expertise, reach, relevance, diversity)
 * and calls useGuestScoring hook to compute + persist results.
 * Ceramic Design System compliant.
 */

import React, { useState, useCallback } from 'react';
import { Star, Users, Target, Shuffle, Loader2 } from 'lucide-react';
import { useGuestScoring } from '../../hooks/useGuestScoring';
import { GuestScoreCard } from './GuestScoreCard';
import type { GuestProfile, GuestScoreResult } from '../../services/guestScoring';

interface GuestScoreInputFormProps {
  /** Optional episode ID to associate the score with */
  episodeId?: string;
  /** Callback when a guest is successfully scored */
  onScored?: (guestName: string, result: GuestScoreResult) => void;
  className?: string;
}

const SLIDER_CONFIG = [
  { key: 'expertise' as const, label: 'Expertise', icon: Star, color: 'bg-amber-500' },
  { key: 'reach' as const, label: 'Alcance', icon: Users, color: 'bg-ceramic-info' },
  { key: 'relevance' as const, label: 'Relevancia', icon: Target, color: 'bg-ceramic-success' },
  { key: 'diversity' as const, label: 'Diversidade', icon: Shuffle, color: 'bg-purple-500' },
] as const;

export const GuestScoreInputForm: React.FC<GuestScoreInputFormProps> = ({
  episodeId,
  onScored,
  className = '',
}) => {
  const { scoreGuest, loading: hookLoading } = useGuestScoring();

  const [name, setName] = useState('');
  const [sliders, setSliders] = useState({
    expertise: 50,
    reach: 50,
    relevance: 50,
    diversity: 50,
  });
  const [isScoring, setIsScoring] = useState(false);
  const [lastResult, setLastResult] = useState<{ guestName: string; result: GuestScoreResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSliderChange = useCallback((key: keyof typeof sliders, value: number) => {
    setSliders(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsScoring(true);
    setError(null);
    setLastResult(null);

    try {
      const profile: GuestProfile = {
        name: trimmedName,
        expertise: sliders.expertise / 100,
        reach: sliders.reach / 100,
        relevance: sliders.relevance / 100,
        diversity: sliders.diversity / 100,
      };

      const result = await scoreGuest(profile, episodeId ?? null);
      setLastResult({ guestName: trimmedName, result });
      onScored?.(trimmedName, result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avaliar convidado');
    } finally {
      setIsScoring(false);
    }
  }, [name, sliders, episodeId, scoreGuest, onScored]);

  const isSubmitting = isScoring || hookLoading;

  return (
    <div className={`space-y-4 ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="bg-ceramic-50 rounded-xl p-5 shadow-ceramic-emboss space-y-4"
        data-testid="guest-score-input-form"
      >
        {/* Guest Name */}
        <div>
          <label
            htmlFor="guest-name"
            className="block text-sm font-medium text-ceramic-text-primary mb-1.5"
          >
            Nome do Convidado
          </label>
          <input
            id="guest-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition-colors"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          {SLIDER_CONFIG.map(({ key, label, icon: Icon, color }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-ceramic-text-secondary" aria-hidden="true" />
                  <span className="text-xs font-medium text-ceramic-text-secondary">{label}</span>
                </div>
                <span className="text-xs font-semibold text-ceramic-text-primary tabular-nums">
                  {sliders[key]}
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={sliders[key]}
                  onChange={e => handleSliderChange(key, Number(e.target.value))}
                  disabled={isSubmitting}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-ceramic-cool
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-amber-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`${label}: ${sliders[key]}%`}
                />
                {/* Track fill overlay */}
                <div
                  className={`absolute top-0 left-0 h-2 rounded-full pointer-events-none ${color} opacity-60`}
                  style={{ width: `${sliders[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-2 rounded-lg bg-ceramic-error/10 border border-ceramic-error/20">
            <p className="text-xs text-ceramic-error">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Avaliando...
            </>
          ) : (
            'Avaliar Convidado'
          )}
        </button>
      </form>

      {/* Result Card */}
      {lastResult && (
        <GuestScoreCard
          guestName={lastResult.guestName}
          result={lastResult.result}
        />
      )}
    </div>
  );
};

export default GuestScoreInputForm;
