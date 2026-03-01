/**
 * EMAPrompt Component
 * Compact cards for morning/midday/evening micro check-ins.
 * Sprint 3: Journey Validated Psychometric Well-Being
 *
 * Ceramic Design System: bg-ceramic-50, text-ceramic-800, shadow-ceramic-emboss, rounded-xl, amber accent
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, CloudSun, Moon,
  Zap, Focus, Heart,
  Send, Loader2, CheckCircle2,
} from 'lucide-react';
import type { CheckinType, CheckinInput } from '../hooks/useEMACheckin';
import { getCheckinLabel } from '../hooks/useEMACheckin';

interface EMAPromptProps {
  checkinType: CheckinType;
  isCompleted?: boolean;
  onSubmit: (input: CheckinInput) => Promise<void>;
  className?: string;
}

const CHECKIN_ICONS: Record<CheckinType, React.ReactNode> = {
  morning_intention: <Sun className="w-5 h-5" />,
  midday_energy: <CloudSun className="w-5 h-5" />,
  evening_reflection: <Moon className="w-5 h-5" />,
};

const CHECKIN_GRADIENTS: Record<CheckinType, string> = {
  morning_intention: 'from-amber-50 to-orange-50',
  midday_energy: 'from-sky-50 to-amber-50',
  evening_reflection: 'from-indigo-50 to-purple-50',
};

const CHECKIN_ACCENT: Record<CheckinType, string> = {
  morning_intention: 'text-amber-600',
  midday_energy: 'text-sky-600',
  evening_reflection: 'text-indigo-600',
};

interface SliderFieldProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}

function SliderField({ label, icon, value, onChange, min = 1, max = 10, minLabel, maxLabel }: SliderFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-ceramic-text-primary">{label}</span>
        <span className="ml-auto text-sm font-semibold text-amber-600">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-ceramic-border rounded-full appearance-none cursor-pointer accent-amber-500"
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between">
          <span className="text-[10px] text-ceramic-text-secondary">{minLabel}</span>
          <span className="text-[10px] text-ceramic-text-secondary">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

export function EMAPrompt({
  checkinType,
  isCompleted = false,
  onSubmit,
  className = '',
}: EMAPromptProps) {
  const [energy, setEnergy] = useState(5);
  const [focus, setFocus] = useState(5);
  const [valence, setValence] = useState(5);
  const [textInput, setTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const input: CheckinInput = {
        checkin_type: checkinType,
        energy_level: energy,
        focus_level: focus,
        valence,
        arousal: Math.round((energy + focus) / 2),
      };

      if (checkinType === 'morning_intention' && textInput.trim()) {
        input.intention = textInput.trim();
      } else if (checkinType === 'evening_reflection' && textInput.trim()) {
        input.reflection = textInput.trim();
      }

      await onSubmit(input);
      setSubmitted(true);
    } catch {
      // Error handled by parent hook
    } finally {
      setIsSubmitting(false);
    }
  }, [checkinType, energy, focus, valence, textInput, isSubmitting, onSubmit]);

  if (isCompleted || submitted) {
    return (
      <motion.div
        className={`bg-gradient-to-r ${CHECKIN_GRADIENTS[checkinType]} rounded-xl p-4 border border-ceramic-border/50 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <div className={`${CHECKIN_ACCENT[checkinType]}`}>
            {CHECKIN_ICONS[checkinType]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ceramic-text-primary">
              {getCheckinLabel(checkinType)}
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-ceramic-success" />
        </div>
      </motion.div>
    );
  }

  const textLabel = checkinType === 'morning_intention'
    ? 'Qual sua intenção para hoje?'
    : checkinType === 'evening_reflection'
      ? 'Como foi seu dia?'
      : undefined;

  return (
    <motion.div
      className={`bg-gradient-to-r ${CHECKIN_GRADIENTS[checkinType]} rounded-xl p-4 border border-ceramic-border/50 shadow-sm ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded-lg bg-white/60 ${CHECKIN_ACCENT[checkinType]}`}>
          {CHECKIN_ICONS[checkinType]}
        </div>
        <h4 className="text-sm font-semibold text-ceramic-text-primary">
          {getCheckinLabel(checkinType)}
        </h4>
      </div>

      {/* Sliders */}
      <div className="space-y-3 mb-4">
        <SliderField
          label="Energia"
          icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
          value={energy}
          onChange={setEnergy}
          minLabel="Sem energia"
          maxLabel="Muita energia"
        />
        <SliderField
          label="Foco"
          icon={<Focus className="w-3.5 h-3.5 text-sky-500" />}
          value={focus}
          onChange={setFocus}
          minLabel="Disperso"
          maxLabel="Muito focado"
        />
        <SliderField
          label="Humor"
          icon={<Heart className="w-3.5 h-3.5 text-rose-400" />}
          value={valence}
          onChange={setValence}
          min={1}
          max={9}
          minLabel="Desagradável"
          maxLabel="Agradável"
        />
      </div>

      {/* Text input for morning intention / evening reflection */}
      <AnimatePresence>
        {textLabel && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <label className="text-xs font-medium text-ceramic-text-secondary mb-1 block">
              {textLabel}
            </label>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escreva aqui..."
              className="w-full bg-white/60 rounded-lg px-3 py-2 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40 outline-none focus:ring-2 focus:ring-amber-400/30 border border-ceramic-border/30"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Registrar
          </>
        )}
      </button>
    </motion.div>
  );
}

export default EMAPrompt;
