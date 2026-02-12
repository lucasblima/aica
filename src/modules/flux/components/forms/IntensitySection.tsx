/**
 * IntensitySection Component
 *
 * Accordion section for intensity metrics (modality-dependent):
 * - Swimming: CSS percentage slider (50-120%)
 * - Running: Pace zone select (Z1-Z5) with reference table
 * - Cycling: FTP percentage slider (40-150%)
 * - Strength: RPE slider (1-10)
 * - All: Optional RPE as secondary metric
 * - Visual intensity indicator
 */

import React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import type { TemplateFormState } from './useTemplateForm';
import type { PaceZone } from '../../types/flow';
import { PACE_ZONES, FTP_ZONES, CSS_ZONES, getRPEColor, getRPELabel } from '../../types/zones';

interface IntensitySectionProps {
  formData: TemplateFormState;
  errors: Partial<Record<keyof TemplateFormState, string>>;
  touched: Set<string>;
  onChange: (name: keyof TemplateFormState, value: any) => void;
  onBlur: (name: keyof TemplateFormState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function IntensitySection({
  formData,
  errors,
  touched,
  onChange,
  onBlur,
  isOpen,
  onToggle,
}: IntensitySectionProps) {
  const hasErrors = ['ftp_percentage', 'pace_zone', 'css_percentage', 'rpe'].some(
    (field) => errors[field as keyof TemplateFormState]
  );

  const modality = formData.modality;

  // Determine primary intensity metric
  const getPrimaryMetric = (): string => {
    if (formData.ftp_percentage) return `${formData.ftp_percentage}% FTP`;
    if (formData.pace_zone) return `Zona ${formData.pace_zone}`;
    if (formData.css_percentage) return `${formData.css_percentage}% CSS`;
    if (formData.rpe) return `RPE ${formData.rpe}`;
    return 'Não definido';
  };

  return (
    <div className="ceramic-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-ceramic-text-primary">2. Intensidade</span>
          {!isOpen && (
            <span className="text-xs text-ceramic-text-secondary">{getPrimaryMetric()}</span>
          )}
          {hasErrors && (
            <span className="w-2 h-2 bg-ceramic-error rounded-full" title="Seção com erros" />
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-ceramic-text-secondary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-4 pt-0 space-y-4 border-t border-ceramic-text-secondary/10">
          {/* Swimming: CSS Percentage */}
          {modality === 'swimming' && (
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                CSS (Critical Swim Speed) <span className="text-ceramic-error">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="50"
                  max="120"
                  step="5"
                  value={formData.css_percentage || 70}
                  onChange={(e) => onChange('css_percentage', parseInt(e.target.value))}
                  onBlur={() => onBlur('css_percentage')}
                  className="w-full accent-ceramic-accent"
                />
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-ceramic-accent">
                    {formData.css_percentage || 70}%
                  </span>
                  <div className="text-xs text-ceramic-text-secondary text-right">
                    {Object.entries(CSS_ZONES).map(([key, zone]) => {
                      const value = formData.css_percentage || 70;
                      if (value >= zone.min && value <= zone.max) {
                        return (
                          <div key={key} className="font-medium text-ceramic-accent">
                            {zone.name}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs text-ceramic-text-secondary">
                  {Object.entries(CSS_ZONES).map(([key, zone]) => (
                    <div key={key} className="text-center">
                      <div className="font-medium">{key}</div>
                      <div>
                        {zone.min}-{zone.max}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {touched.has('css_percentage') && errors.css_percentage && (
                <p className="mt-1 text-xs text-ceramic-error">{errors.css_percentage}</p>
              )}
            </div>
          )}

          {/* Running: Pace Zone */}
          {modality === 'running' && (
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                Zona de Ritmo <span className="text-ceramic-error">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {Object.entries(PACE_ZONES).map(([key, zone]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange('pace_zone', key as PaceZone)}
                    onBlur={() => onBlur('pace_zone')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.pace_zone === key
                        ? `${zone.color} shadow-md`
                        : 'ceramic-inset hover:bg-white/50 text-ceramic-text-primary'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Zone Reference Table */}
              {formData.pace_zone && (
                <div className="p-3 bg-white/30 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <Info className="w-4 h-4 text-ceramic-accent mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-ceramic-text-primary">
                        {PACE_ZONES[formData.pace_zone].label}
                      </p>
                      <p className="text-xs text-ceramic-text-secondary mt-0.5">
                        {PACE_ZONES[formData.pace_zone].description}
                      </p>
                      <p className="text-xs text-ceramic-text-secondary mt-1">
                        Equivalente FTP: {PACE_ZONES[formData.pace_zone].ftpRange}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {touched.has('pace_zone') && errors.pace_zone && (
                <p className="mt-1 text-xs text-ceramic-error">{errors.pace_zone}</p>
              )}
            </div>
          )}

          {/* Cycling: FTP Percentage */}
          {modality === 'cycling' && (
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                FTP (Functional Threshold Power) <span className="text-ceramic-error">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="40"
                  max="150"
                  step="5"
                  value={formData.ftp_percentage || 70}
                  onChange={(e) => onChange('ftp_percentage', parseInt(e.target.value))}
                  onBlur={() => onBlur('ftp_percentage')}
                  className="w-full accent-ceramic-accent"
                />
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-ceramic-accent">
                    {formData.ftp_percentage || 70}%
                  </span>
                  <div className="text-xs text-ceramic-text-secondary text-right">
                    {Object.entries(FTP_ZONES).map(([key, zone]) => {
                      const value = formData.ftp_percentage || 70;
                      if (value >= zone.min && value <= zone.max) {
                        return (
                          <div key={key} className="font-medium text-ceramic-accent">
                            {zone.name}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1 text-xs text-ceramic-text-secondary">
                  {Object.entries(FTP_ZONES).map(([key, zone]) => (
                    <div key={key} className="text-center">
                      <div className="font-medium">{key}</div>
                      <div>
                        {zone.min}-{zone.max}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {touched.has('ftp_percentage') && errors.ftp_percentage && (
                <p className="mt-1 text-xs text-ceramic-error">{errors.ftp_percentage}</p>
              )}
            </div>
          )}

          {/* RPE (All Modalities) */}
          <div className="pt-3 border-t border-ceramic-text-secondary/10">
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              RPE (Rate of Perceived Exertion){' '}
              <span className="text-ceramic-text-secondary text-xs">
                {modality === 'strength' ? '(obrigatório)' : '(opcional)'}
              </span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={formData.rpe || 5}
                onChange={(e) => onChange('rpe', parseInt(e.target.value))}
                onBlur={() => onBlur('rpe')}
                className="w-full accent-ceramic-accent"
              />
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-ceramic-accent">
                  RPE {formData.rpe || 5}
                </span>
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${getRPEColor(
                    formData.rpe || 5
                  )}`}
                >
                  {getRPELabel(formData.rpe || 5)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-ceramic-text-secondary">
                <span>1 - Muito Leve</span>
                <span>5 - Moderado</span>
                <span>10 - Máximo</span>
              </div>
            </div>
            {touched.has('rpe') && errors.rpe && (
              <p className="mt-1 text-xs text-ceramic-error">{errors.rpe}</p>
            )}
          </div>

          {/* Visual Intensity Indicator */}
          {(formData.ftp_percentage ||
            formData.css_percentage ||
            formData.pace_zone ||
            formData.rpe) && (
            <div className="p-4 ceramic-inset rounded-lg">
              <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider mb-2">
                Intensidade Geral
              </p>
              <div className="h-3 bg-gradient-to-r from-ceramic-info via-ceramic-warning to-ceramic-error rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-md transition-all"
                  style={{
                    left: `${
                      formData.ftp_percentage ||
                      formData.css_percentage ||
                      (formData.rpe ? formData.rpe * 10 : 50)
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
