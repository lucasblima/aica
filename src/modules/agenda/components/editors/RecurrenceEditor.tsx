/**
 * RecurrenceEditor Component
 * Ceramic-styled RRULE editor with presets and custom mode.
 * Uses useRecurrence hook for state management and taskRecurrenceService for RRULE generation.
 */

import React, { useEffect } from 'react';
import { Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecurrence, type RecurrencePattern } from '../../hooks/useRecurrence';

export interface RecurrenceEditorProps {
  /** Current RRULE string, or null for no recurrence. */
  value: string | null;
  /** Called when the RRULE changes. Passes null when recurrence is cleared. */
  onChange: (rrule: string | null) => void;
}

type PresetKey = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'custom';

const PRESET_BUTTONS: { key: PresetKey; label: string }[] = [
  { key: 'none', label: 'Nenhum' },
  { key: 'daily', label: 'Diário' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'weekdays', label: 'Dias úteis' },
  { key: 'custom', label: 'Personalizado' },
];

const FREQUENCY_OPTIONS: { label: string; value: RecurrencePattern['frequency'] }[] = [
  { label: 'Diário', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: 'Mensal', value: 'monthly' },
  { label: 'Anual', value: 'yearly' },
];

/** Day labels for weekly day checkboxes (starting Monday for Brazilian convention). */
const WEEK_DAYS: { label: string; num: number }[] = [
  { label: 'S', num: 1 }, // Segunda
  { label: 'T', num: 2 }, // Terça
  { label: 'Q', num: 3 }, // Quarta
  { label: 'Q', num: 4 }, // Quinta
  { label: 'S', num: 5 }, // Sexta
  { label: 'S', num: 6 }, // Sábado
  { label: 'D', num: 0 }, // Domingo
];

function getFrequencyUnitLabel(frequency: RecurrencePattern['frequency']): string {
  switch (frequency) {
    case 'daily': return 'dia(s)';
    case 'weekly': return 'semana(s)';
    case 'monthly': return 'mês(es)';
    case 'yearly': return 'ano(s)';
    default: return '';
  }
}

/**
 * Determine which preset button is active based on the current rruleString.
 */
function getActivePreset(rruleString: string | null, isCustom: boolean): PresetKey {
  if (!rruleString) return 'none';
  if (isCustom) return 'custom';

  // Check against known presets by description
  const upper = rruleString.toUpperCase();
  if (upper === 'FREQ=DAILY;INTERVAL=1') return 'daily';
  if (upper === 'FREQ=WEEKLY;INTERVAL=1') return 'weekly';
  if (upper === 'FREQ=MONTHLY;INTERVAL=1') return 'monthly';
  if (upper === 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR') return 'weekdays';

  return 'custom';
}

export const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({ value, onChange }) => {
  const {
    pattern,
    rruleString,
    description,
    setPreset,
    setPattern,
    updateField,
    isCustom,
  } = useRecurrence(value);

  const [showCustom, setShowCustom] = React.useState(false);

  // Sync hook output to parent onChange whenever rruleString changes
  useEffect(() => {
    // Only notify parent if the value actually changed
    if (rruleString !== value) {
      onChange(rruleString);
    }
  }, [rruleString]); // eslint-disable-line react-hooks/exhaustive-deps

  const activePreset = getActivePreset(rruleString, isCustom);

  const handlePresetClick = (key: PresetKey) => {
    if (key === 'custom') {
      setShowCustom(true);
      // If no pattern yet, initialize with daily default for custom editing
      if (!pattern) {
        setPreset('daily');
      }
      return;
    }
    setShowCustom(false);
    setPreset(key as 'daily' | 'weekly' | 'monthly' | 'weekdays' | 'none');
  };

  const handleDayToggle = (dayNum: number) => {
    const currentDays = pattern?.daysOfWeek ?? [];
    const newDays = currentDays.includes(dayNum)
      ? currentDays.filter(d => d !== dayNum)
      : [...currentDays, dayNum].sort();
    updateField('daysOfWeek', newDays.length > 0 ? newDays : undefined);
  };

  return (
    <div className="space-y-3">
      {/* Preset buttons row */}
      <div className="flex flex-wrap gap-2">
        {PRESET_BUTTONS.map(({ key, label }) => {
          const isActive = activePreset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetClick(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Custom mode panel */}
      <AnimatePresence>
        {showCustom && pattern && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 rounded-xl bg-ceramic-cool border border-ceramic-border">
              {/* Frequency select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Frequência
                </label>
                <select
                  value={pattern.frequency}
                  onChange={(e) => updateField('frequency', e.target.value as RecurrencePattern['frequency'])}
                  className="w-full px-3 py-2 rounded-lg ceramic-inset text-ceramic-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {FREQUENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Interval input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Intervalo
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ceramic-text-secondary">A cada</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={pattern.interval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        updateField('interval', val);
                      }
                    }}
                    className="w-16 px-2 py-2 rounded-lg ceramic-inset text-ceramic-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <span className="text-sm text-ceramic-text-secondary">
                    {getFrequencyUnitLabel(pattern.frequency)}
                  </span>
                </div>
              </div>

              {/* Day checkboxes (weekly only) */}
              {pattern.frequency === 'weekly' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Dias da Semana
                  </label>
                  <div className="flex gap-1.5">
                    {WEEK_DAYS.map(({ label, num }) => {
                      const isSelected = pattern.daysOfWeek?.includes(num) ?? false;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleDayToggle(num)}
                          className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-border'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End condition */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Término
                </label>
                <div className="space-y-2">
                  {/* End type radio-like buttons */}
                  <div className="flex gap-2">
                    {([
                      { key: 'never', label: 'Nunca' },
                      { key: 'count', label: 'Após N vezes' },
                      { key: 'date', label: 'Em data' },
                    ] as const).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('endType', key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          pattern.endType === key
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-border'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Count input */}
                  {pattern.endType === 'count' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ceramic-text-secondary">Após</span>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={pattern.endCount ?? 10}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            updateField('endCount', val);
                          }
                        }}
                        className="w-16 px-2 py-2 rounded-lg ceramic-inset text-ceramic-text-primary text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                      <span className="text-sm text-ceramic-text-secondary">ocorrências</span>
                    </div>
                  )}

                  {/* Date input */}
                  {pattern.endType === 'date' && (
                    <input
                      type="date"
                      value={pattern.endDate ?? ''}
                      onChange={(e) => updateField('endDate', e.target.value || undefined)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 rounded-lg ceramic-inset text-ceramic-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview text */}
      {rruleString && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ceramic-cool">
          <Repeat className="w-3.5 h-3.5 text-ceramic-text-secondary flex-shrink-0" />
          <span className="text-sm text-ceramic-text-secondary">
            {description}
          </span>
        </div>
      )}
    </div>
  );
};

export default RecurrenceEditor;
