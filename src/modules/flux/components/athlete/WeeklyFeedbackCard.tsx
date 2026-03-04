/**
 * WeeklyFeedbackCard — per-DAY feedback for each training day
 *
 * Shows one feedback entry per day of the selected week.
 * Each day has: emoji rating (1-5) + optional notes text field.
 * Stores to `athlete_feedback_entries` with feedback_type = 'daily'.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('WeeklyFeedbackCard');

const DAY_NAMES = ['', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

const RATING_OPTIONS = [
  { value: 1, emoji: '\u{1F62B}', label: 'Pessimo' },
  { value: 2, emoji: '\u{1F615}', label: 'Ruim' },
  { value: 3, emoji: '\u{1F610}', label: 'Ok' },
  { value: 4, emoji: '\u{1F60A}', label: 'Bom' },
  { value: 5, emoji: '\u{1F525}', label: 'Excelente' },
];

// ─── Per-day feedback entry ─────────────────────────────────────

interface DayFeedbackEntry {
  dayOfWeek: number;
  rating: number | null;
  notes: string;
  isSubmitted: boolean;
  existingNotes: string | null;
  existingRating: number | null;
}

interface DayCardProps {
  entry: DayFeedbackEntry;
  dayDate: Date | null;
  isFuture: boolean;
  isExpanded: boolean;
  isSubmitting: boolean;
  onToggleExpand: () => void;
  onSetRating: (rating: number) => void;
  onSetNotes: (notes: string) => void;
  onSubmit: () => void;
}

function DayFeedbackCard({
  entry,
  dayDate,
  isFuture,
  isExpanded,
  isSubmitting,
  onToggleExpand,
  onSetRating,
  onSetNotes,
  onSubmit,
}: DayCardProps) {
  const dayLabel = DAY_NAMES[entry.dayOfWeek];
  const dateStr = dayDate
    ? `${dayDate.getDate().toString().padStart(2, '0')}/${(dayDate.getMonth() + 1).toString().padStart(2, '0')}`
    : '';

  // Future day — locked
  if (isFuture) {
    return (
      <div className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 opacity-40">
        <Lock className="w-4 h-4 text-ceramic-text-secondary/50 flex-shrink-0" />
        <span className="text-xs font-bold text-ceramic-text-secondary">{dayLabel}</span>
        {dateStr && <span className="text-[10px] text-ceramic-text-secondary/60">{dateStr}</span>}
        <span className="text-[10px] text-ceramic-text-secondary/50 ml-auto">Ainda nao disponivel</span>
      </div>
    );
  }

  // Already submitted
  if (entry.isSubmitted) {
    const ratingOption = RATING_OPTIONS.find(r => r.value === entry.existingRating);
    return (
      <div className="bg-white rounded-xl shadow-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          <span className="text-xs font-bold text-ceramic-text-primary">{dayLabel}</span>
          {dateStr && <span className="text-[10px] text-ceramic-text-secondary">{dateStr}</span>}
          {ratingOption && (
            <span className="ml-auto text-sm" title={ratingOption.label}>{ratingOption.emoji}</span>
          )}
        </div>
        {entry.existingNotes && (
          <p className="text-[10px] text-ceramic-text-secondary italic mt-1 line-clamp-2 pl-6">
            &ldquo;{entry.existingNotes}&rdquo;
          </p>
        )}
      </div>
    );
  }

  // Active / expandable
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-ceramic-cool/20 transition-colors"
      >
        <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-xs font-bold text-ceramic-text-primary">{dayLabel}</span>
        {dateStr && <span className="text-[10px] text-ceramic-text-secondary">{dateStr}</span>}
        {entry.rating != null && (
          <span className="text-sm ml-1">{RATING_OPTIONS.find(r => r.value === entry.rating)?.emoji}</span>
        )}
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-ceramic-text-secondary" />
          )}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-ceramic-border/20 pt-3">
              {/* Rating */}
              <div>
                <p className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Como foi o treino?
                </p>
                <div className="flex items-center gap-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onSetRating(opt.value)}
                      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all ${
                        entry.rating === opt.value
                          ? 'border-amber-400 bg-amber-50 shadow-sm scale-105'
                          : 'border-ceramic-border/30 bg-ceramic-cool/20 hover:border-ceramic-border/60'
                      }`}
                    >
                      <span className="text-lg">{opt.emoji}</span>
                      <span className={`text-[9px] font-medium ${
                        entry.rating === opt.value ? 'text-amber-700' : 'text-ceramic-text-secondary'
                      }`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <textarea
                value={entry.notes}
                onChange={(e) => onSetNotes(e.target.value)}
                placeholder="Observacoes do dia (opcional)..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-ceramic-border/40 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all placeholder:text-ceramic-text-secondary/50"
              />

              {/* Submit */}
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting || entry.rating == null}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hook: useDailyFeedback ─────────────────────────────────────

export interface UseDailyFeedbackOptions {
  athleteId: string;
  microcycleId: string;
  weekNumber: number;
  userId: string;
  currentWeek?: number;
  microcycleStartDate?: string;
  workoutDays?: number[];
}

export function useDailyFeedback({
  athleteId,
  microcycleId,
  weekNumber,
  userId,
  currentWeek,
  microcycleStartDate,
  workoutDays,
}: UseDailyFeedbackOptions) {
  const isFutureWeek = currentWeek != null && weekNumber > currentWeek;

  const daysToShow = useMemo(() => {
    if (workoutDays?.length) return [...workoutDays].sort((a, b) => a - b);
    return [1, 2, 3, 4, 5, 6, 7];
  }, [workoutDays]);

  const [dayEntries, setDayEntries] = useState<Record<number, DayFeedbackEntry>>({});
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [submittingDay, setSubmittingDay] = useState<number | null>(null);

  useEffect(() => {
    const entries: Record<number, DayFeedbackEntry> = {};
    for (const day of daysToShow) {
      entries[day] = { dayOfWeek: day, rating: null, notes: '', isSubmitted: false, existingNotes: null, existingRating: null };
    }
    setDayEntries(entries);
  }, [daysToShow]);

  useEffect(() => {
    if (!microcycleId || !weekNumber) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from('athlete_feedback_entries')
        .select('id, day_of_week, notes, voice_transcript, questionnaire')
        .eq('microcycle_id', microcycleId)
        .eq('week_number', weekNumber)
        .eq('feedback_type', 'daily');
      if (cancelled || !data) return;
      setDayEntries((prev) => {
        const updated = { ...prev };
        for (const row of data) {
          const day = row.day_of_week as number;
          if (updated[day]) {
            const questionnaire = row.questionnaire as Record<string, number> | null;
            updated[day] = { ...updated[day], isSubmitted: true, existingNotes: row.notes || row.voice_transcript || null, existingRating: questionnaire?.daily_rating ?? null };
          }
        }
        return updated;
      });
    };
    check();
    return () => { cancelled = true; };
  }, [microcycleId, weekNumber]);

  const getDateForDay = useCallback((dayOfWeek: number): Date | null => {
    if (!microcycleStartDate) return null;
    const start = new Date(microcycleStartDate);
    const weekOffset = (weekNumber - 1) * 7;
    const dayOffset = dayOfWeek - 1;
    const date = new Date(start);
    date.setDate(start.getDate() + weekOffset + dayOffset);
    return date;
  }, [microcycleStartDate, weekNumber]);

  const isDayFuture = useCallback((dayOfWeek: number): boolean => {
    const date = getDateForDay(dayOfWeek);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }, [getDateForDay]);

  const handleSetRating = useCallback((day: number, rating: number) => {
    setDayEntries((prev) => ({ ...prev, [day]: { ...prev[day], rating } }));
  }, []);

  const handleSetNotes = useCallback((day: number, notes: string) => {
    setDayEntries((prev) => ({ ...prev, [day]: { ...prev[day], notes } }));
  }, []);

  const handleSubmitDay = useCallback(async (day: number) => {
    const entry = dayEntries[day];
    if (!entry || entry.rating == null) return;
    setSubmittingDay(day);
    try {
      const { error: insertError } = await supabase
        .from('athlete_feedback_entries')
        .insert({
          user_id: userId, athlete_id: athleteId, microcycle_id: microcycleId,
          feedback_type: 'daily', week_number: weekNumber, day_of_week: day,
          questionnaire: { daily_rating: entry.rating }, notes: entry.notes.trim() || null,
        });
      if (insertError) throw insertError;
      setDayEntries((prev) => ({
        ...prev,
        [day]: { ...prev[day], isSubmitted: true, existingRating: entry.rating, existingNotes: entry.notes.trim() || null },
      }));
      setExpandedDay(null);
    } catch (err) {
      log.error('Failed to submit daily feedback:', err);
    } finally {
      setSubmittingDay(null);
    }
  }, [dayEntries, userId, athleteId, microcycleId, weekNumber]);

  const markDaySubmitted = useCallback((day: number) => {
    setDayEntries((prev) => ({
      ...prev,
      [day]: { ...prev[day], isSubmitted: true },
    }));
  }, []);

  return {
    dayEntries, expandedDay, submittingDay, isFutureWeek, daysToShow,
    getDateForDay, isDayFuture, handleSetRating, handleSetNotes, handleSubmitDay,
    setExpandedDay, markDaySubmitted,
  };
}

// ─── Re-export DayFeedbackCard for inline use ───────────────────

export { DayFeedbackCard };
export type { DayFeedbackEntry, DayCardProps };

// ─── Main Component (kept for backwards compatibility) ──────────

export interface WeeklyFeedbackCardProps {
  athleteId: string;
  microcycleId: string;
  weekNumber: number;
  userId: string;
  currentWeek?: number;
  microcycleStartDate?: string;
  workoutDays?: number[];
}

export function WeeklyFeedbackCard(props: WeeklyFeedbackCardProps) {
  const {
    dayEntries, expandedDay, submittingDay, isFutureWeek, daysToShow,
    getDateForDay, isDayFuture, handleSetRating, handleSetNotes, handleSubmitDay,
    setExpandedDay,
  } = useDailyFeedback(props);

  const submittedCount = Object.values(dayEntries).filter(e => e.isSubmitted).length;
  const totalDays = daysToShow.length;

  if (isFutureWeek) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3 opacity-50">
        <Lock className="w-5 h-5 text-ceramic-text-secondary/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-ceramic-text-secondary">
            Feedback Diario — Semana {props.weekNumber}
          </h3>
          <p className="text-xs text-ceramic-text-secondary/60 mt-0.5">
            Disponivel quando a semana comecar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" />
          Feedback Diario — Semana {props.weekNumber}
        </h3>
        {submittedCount > 0 && (
          <span className="text-[10px] text-ceramic-text-secondary">
            {submittedCount}/{totalDays} dias
          </span>
        )}
      </div>
      {daysToShow.map((day) => {
        const entry = dayEntries[day];
        if (!entry) return null;
        return (
          <DayFeedbackCard key={day} entry={entry} dayDate={getDateForDay(day)}
            isFuture={isDayFuture(day)} isExpanded={expandedDay === day}
            isSubmitting={submittingDay === day}
            onToggleExpand={() => setExpandedDay(expandedDay === day ? null : day)}
            onSetRating={(rating) => handleSetRating(day, rating)}
            onSetNotes={(notes) => handleSetNotes(day, notes)}
            onSubmit={() => handleSubmitDay(day)} />
        );
      })}
    </div>
  );
}
