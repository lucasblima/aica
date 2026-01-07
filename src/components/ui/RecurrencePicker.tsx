/**
 * RecurrencePicker Component
 * UI for selecting recurring task patterns using RRULE format
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  RRULE_PRESETS,
  describeRRuleInPortuguese,
  generateUpcomingOccurrences,
} from '../services/taskRecurrenceService';

interface RecurrencePickerProps {
  /** Current RRULE string (can be empty) */
  value: string | undefined;
  /** Callback when recurrence changes */
  onChange: (rrule: string | undefined) => void;
  /** Optional base date for previewing */
  baseDate?: Date;
  /** Optional custom class */
  className?: string;
}

/**
 * Map of frequency options for custom recurrence
 */
const FREQUENCY_OPTIONS = [
  { label: 'Diariamente', value: 'DAILY' },
  { label: 'Semanalmente', value: 'WEEKLY' },
  { label: 'Mensalmente', value: 'MONTHLY' },
  { label: 'Anualmente', value: 'YEARLY' },
];

const DAYS_OF_WEEK = [
  { label: 'Seg', value: 'MO' },
  { label: 'Ter', value: 'TU' },
  { label: 'Qua', value: 'WE' },
  { label: 'Qui', value: 'TH' },
  { label: 'Sex', value: 'FR' },
  { label: 'Sab', value: 'SA' },
  { label: 'Dom', value: 'SU' },
];

export function RecurrencePicker({
  value,
  onChange,
  baseDate = new Date(),
  className = ''
}: RecurrencePickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [frequency, setFrequency] = useState('DAILY');
  const [interval, setInterval] = useState('1');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  /**
   * Apply a preset pattern
   */
  const handlePreset = (presetKey: keyof typeof RRULE_PRESETS) => {
    const rrule = RRULE_PRESETS[presetKey];
    onChange(rrule);
    setShowCustom(false);
  };

  /**
   * Clear recurrence
   */
  const handleClear = () => {
    onChange(undefined);
    setShowCustom(false);
  };

  /**
   * Build custom RRULE from current settings
   */
  const buildCustomRRule = (): string => {
    let rrule = `FREQ=${frequency};INTERVAL=${interval}`;

    if (frequency === 'WEEKLY' && selectedDays.length > 0) {
      rrule += `;BYDAY=${selectedDays.join(',')}`;
    }

    return rrule;
  };

  /**
   * Apply custom settings
   */
  const handleApplyCustom = () => {
    const customRRule = buildCustomRRule();
    onChange(customRRule);
    setShowCustom(false);
  };

  /**
   * Toggle day selection for weekly recurrence
   */
  const handleToggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  /**
   * Get preview of next occurrences
   */
  const getPreview = (): Date[] => {
    if (!value) return [];
    return generateUpcomingOccurrences(baseDate, value, 3);
  };

  const preview = getPreview();
  const description = value ? describeRRuleInPortuguese(value) : 'Sem recorrência';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Selection Display */}
      <div className="ceramic-inset p-4 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-ceramic-text-secondary">
            Recorrência
          </span>
          {value && (
            <button
              onClick={handleClear}
              className="text-xs font-bold text-ceramic-negative hover:scale-105"
            >
              Limpar
            </button>
          )}
        </div>
        <p className="text-lg font-bold text-ceramic-text-primary">
          {description}
        </p>

        {/* Preview of next occurrences */}
        {preview.length > 0 && (
          <div className="pt-2 border-t border-ceramic-text-secondary/10 space-y-1">
            <p className="text-xs text-ceramic-text-secondary font-bold">Próximas ocorrências:</p>
            {preview.map((date, i) => (
              <div key={i} className="text-xs text-ceramic-text-tertiary">
                • {date.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handlePreset('DAILY')}
          className={`ceramic-inset px-3 py-2 rounded-lg text-sm font-bold transition-all ${
            value === RRULE_PRESETS.DAILY
              ? 'ceramic-concave text-ceramic-accent'
              : 'hover:scale-105'
          }`}
        >
          Diariamente
        </button>
        <button
          onClick={() => handlePreset('WEEKDAYS')}
          className={`ceramic-inset px-3 py-2 rounded-lg text-sm font-bold transition-all ${
            value === RRULE_PRESETS.WEEKDAYS
              ? 'ceramic-concave text-ceramic-accent'
              : 'hover:scale-105'
          }`}
        >
          Dias Úteis
        </button>
        <button
          onClick={() => handlePreset('WEEKLY')}
          className={`ceramic-inset px-3 py-2 rounded-lg text-sm font-bold transition-all ${
            value === RRULE_PRESETS.WEEKLY
              ? 'ceramic-concave text-ceramic-accent'
              : 'hover:scale-105'
          }`}
        >
          Semanalmente
        </button>
        <button
          onClick={() => handlePreset('MONTHLY')}
          className={`ceramic-inset px-3 py-2 rounded-lg text-sm font-bold transition-all ${
            value === RRULE_PRESETS.MONTHLY
              ? 'ceramic-concave text-ceramic-accent'
              : 'hover:scale-105'
          }`}
        >
          Mensalmente
        </button>
      </div>

      {/* Custom Recurrence Toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="w-full flex items-center justify-between ceramic-inset px-3 py-2 rounded-lg text-sm font-bold hover:scale-[1.01] transition-transform"
      >
        <span>Personalizado</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showCustom ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Custom Recurrence Section */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="ceramic-groove p-4 rounded-lg space-y-4"
        >
          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
              Frequência
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            >
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
              A cada X {frequency === 'DAILY' ? 'dias' : frequency === 'WEEKLY' ? 'semanas' : frequency === 'MONTHLY' ? 'meses' : 'anos'}
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>

          {/* Days of Week (only for weekly) */}
          {frequency === 'WEEKLY' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                Dias da Semana
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    onClick={() => handleToggleDay(day.value)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedDays.includes(day.value)
                        ? 'ceramic-concave text-ceramic-accent'
                        : 'ceramic-inset hover:scale-105'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          <button
            onClick={handleApplyCustom}
            className="w-full ceramic-concave px-3 py-2 rounded-lg text-sm font-bold text-ceramic-text-primary hover:scale-[1.01] active:scale-95 transition-transform"
          >
            Aplicar Personalizado
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default RecurrencePicker;
