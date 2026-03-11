/**
 * FeedbackForm — form for creating daily or weekly feedback
 *
 * Weekly: shows all workouts grouped by day with completion toggle + mini RPE.
 * Daily: shows today's workouts with RPE + notes.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Loader2 } from 'lucide-react';
import type { FeedbackSlotSummary } from '../../hooks/useAthleteFeedback';

function getRpeBgClass(rpe: number): string {
  if (rpe <= 3) return 'bg-green-500';
  if (rpe <= 6) return 'bg-amber-500';
  if (rpe <= 8) return 'bg-orange-500';
  return 'bg-red-500';
}

function getRpeLabel(rpe: number): string {
  if (rpe <= 3) return 'Leve';
  if (rpe <= 6) return 'Moderado';
  if (rpe <= 8) return 'Intenso';
  return 'Maximo';
}

const DAY_NAMES: Record<number, string> = {
  1: 'Segunda', 2: 'Terca', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sabado', 7: 'Domingo',
};

export interface FeedbackFormProps {
  mode: 'weekly' | 'daily';
  weekNumber: number;
  slots: FeedbackSlotSummary[];
  onSubmitWeekly: (data: {
    overallRpe: number;
    notes: string;
    slotFeedbacks: Array<{ slotId: string; completed: boolean; rpe?: number; miniNote?: string }>;
  }) => Promise<void>;
  onSubmitDaily: (data: { slotId: string; rpe: number; notes: string; duration?: number }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

interface SlotFormState {
  completed: boolean;
  rpe: number;
  miniNote: string;
}

export function FeedbackForm({
  mode, weekNumber, slots, onSubmitWeekly, onSubmitDaily, onClose, isSubmitting,
}: FeedbackFormProps) {
  const [overallRpe, setOverallRpe] = useState(5);
  const [notes, setNotes] = useState('');
  const [slotStates, setSlotStates] = useState<Record<string, SlotFormState>>(() => {
    const initial: Record<string, SlotFormState> = {};
    for (const slot of slots) {
      initial[slot.slotId] = { completed: slot.isCompleted, rpe: slot.rpe ?? 5, miniNote: slot.notes || '' };
    }
    return initial;
  });
  const [dailyRpe, setDailyRpe] = useState(5);
  const [dailyNotes, setDailyNotes] = useState('');

  const updateSlot = useCallback((slotId: string, updates: Partial<SlotFormState>) => {
    setSlotStates((prev) => ({ ...prev, [slotId]: { ...prev[slotId], ...updates } }));
  }, []);

  const handleSubmit = async () => {
    if (mode === 'weekly') {
      await onSubmitWeekly({
        overallRpe,
        notes,
        slotFeedbacks: slots.map((slot) => ({
          slotId: slot.slotId,
          completed: slotStates[slot.slotId]?.completed ?? slot.isCompleted,
          rpe: slotStates[slot.slotId]?.rpe,
          miniNote: slotStates[slot.slotId]?.miniNote || undefined,
        })),
      });
    } else {
      for (const slot of slots) {
        await onSubmitDaily({ slotId: slot.slotId, rpe: dailyRpe, notes: dailyNotes });
      }
    }
  };

  const slotsByDay = new Map<number, FeedbackSlotSummary[]>();
  for (const slot of slots) {
    const existing = slotsByDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    slotsByDay.set(slot.dayOfWeek, existing);
  }

  const rpeTextColor = (v: number) =>
    v <= 3 ? 'text-green-600' : v <= 6 ? 'text-amber-600' : v <= 8 ? 'text-orange-600' : 'text-red-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-ceramic-base rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-bold text-ceramic-text-primary">
            {mode === 'weekly' ? `Feedback Semanal — Semana ${weekNumber}` : 'Feedback do Treino de Hoje'}
          </h3>
          <p className="text-xs text-ceramic-text-secondary mt-0.5">
            {mode === 'weekly' ? 'Avalie a semana inteira de treinos' : 'Registre como foi o treino enquanto esta fresco'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-ceramic-cool transition-colors">
          <X className="w-4 h-4 text-ceramic-text-secondary" />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-5">
        {mode === 'weekly' ? (
          <>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const daySlots = slotsByDay.get(day);
                if (!daySlots?.length) return null;
                return (
                  <div key={day} className="space-y-2">
                    <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">{DAY_NAMES[day]}</p>
                    {daySlots.map((slot) => {
                      const state = slotStates[slot.slotId];
                      return (
                        <div key={slot.slotId} className="flex items-center gap-3 p-3 rounded-xl bg-ceramic-cool/40">
                          <button type="button" onClick={() => updateSlot(slot.slotId, { completed: !state?.completed })} className="flex-shrink-0">
                            <span className={`w-2.5 h-2.5 rounded-full inline-block ${state?.completed ? 'bg-green-500' : 'bg-ceramic-border'}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-ceramic-text-primary truncate">{slot.templateName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-ceramic-text-secondary w-6">RPE</span>
                              <input type="range" min={1} max={10} value={state?.rpe ?? 5} onChange={(e) => updateSlot(slot.slotId, { rpe: Number(e.target.value) })} className="flex-1 h-1 accent-amber-500" />
                              <span className={`text-[10px] font-bold w-4 text-center ${rpeTextColor(state?.rpe ?? 5)}`}>{state?.rpe ?? 5}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-primary">RPE geral da semana</label>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={10} value={overallRpe} onChange={(e) => setOverallRpe(Number(e.target.value))} className="flex-1 h-2 accent-amber-500" />
                <div className="flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black ${getRpeBgClass(overallRpe)}`}>{overallRpe}</span>
                  <span className="text-xs text-ceramic-text-secondary w-20">{getRpeLabel(overallRpe)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-ceramic-text-primary">Observacoes gerais</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como foi a semana de treinos? Dores, disposicao, sono..." rows={3} className="w-full px-3 py-2.5 text-sm border border-ceramic-border/50 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all" />
            </div>
          </>
        ) : (
          <>
            {slots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-ceramic-text-secondary">Nenhum treino agendado para hoje.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div key={slot.slotId} className="flex items-center gap-3 p-3 rounded-xl bg-ceramic-cool/40">
                      <span className={`w-2 h-2 rounded-full ${slot.isCompleted ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <span className="text-sm font-medium text-ceramic-text-primary">{slot.templateName}</span>
                      <span className="text-xs text-ceramic-text-secondary ml-auto">{slot.duration}min</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ceramic-text-primary">Como foi o treino? (RPE)</label>
                  <div className="flex items-center gap-4">
                    <input type="range" min={1} max={10} value={dailyRpe} onChange={(e) => setDailyRpe(Number(e.target.value))} className="flex-1 h-2 accent-amber-500" />
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black ${getRpeBgClass(dailyRpe)}`}>{dailyRpe}</span>
                      <span className="text-xs text-ceramic-text-secondary w-20">{getRpeLabel(dailyRpe)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ceramic-text-primary">Observacoes</label>
                  <textarea value={dailyNotes} onChange={(e) => setDailyNotes(e.target.value)} placeholder="Como se sentiu? Alguma dor ou desconforto?" rows={3} className="w-full px-3 py-2.5 text-sm border border-ceramic-border/50 rounded-xl resize-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none transition-all" />
                </div>
              </>
            )}
          </>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || (mode === 'daily' && slots.length === 0)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>) : (<><Send className="w-4 h-4" />Salvar Feedback</>)}
        </button>
      </div>
    </motion.div>
  );
}
