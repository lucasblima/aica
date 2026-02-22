/**
 * AthleteFeedbackView — main feedback view with timeline + creation
 *
 * Inspired by Journey Momentos: athletes register reflections about their
 * training in weekly or daily mode. Past entries are shown as a timeline.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, MessageSquare } from 'lucide-react';
import type { MyAthleteProfile } from '../../types';
import { useAthleteFeedback } from '../../hooks/useAthleteFeedback';
import { FeedbackEntryCard } from './FeedbackEntryCard';
import { FeedbackForm } from './FeedbackForm';

export interface AthleteFeedbackViewProps {
  profile: MyAthleteProfile;
  onRefetch: () => Promise<void>;
  highlightSlotId?: string | null;
}

export function AthleteFeedbackView({ profile, onRefetch, highlightSlotId }: AthleteFeedbackViewProps) {
  const {
    feedbackEntries, todaySlots, currentWeek, getSlotsForWeek,
    submitDailyFeedback, submitWeeklyFeedback, isSubmitting, error,
  } = useAthleteFeedback(profile);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'weekly' | 'daily'>('daily');

  const handleOpenForm = useCallback((mode: 'weekly' | 'daily') => {
    setFormMode(mode);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => { setShowForm(false); }, []);

  const handleSubmitWeekly = useCallback(
    async (data: Parameters<typeof submitWeeklyFeedback>[0]) => {
      await submitWeeklyFeedback({ ...data, weekNumber: currentWeek });
      await onRefetch();
      setShowForm(false);
    },
    [submitWeeklyFeedback, currentWeek, onRefetch]
  );

  const handleSubmitDaily = useCallback(
    async (data: Parameters<typeof submitDailyFeedback>[0]) => {
      await submitDailyFeedback(data);
      await onRefetch();
      setShowForm(false);
    },
    [submitDailyFeedback, onRefetch]
  );

  const formSlots = formMode === 'weekly' ? getSlotsForWeek(currentWeek) : todaySlots;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ceramic-text-secondary" />
          <h3 className="text-sm font-bold text-ceramic-text-primary">Meu Feedback</h3>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleOpenForm('daily')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-ceramic-text-primary bg-white rounded-xl shadow-sm hover:shadow transition-shadow">
              <Clock className="w-3.5 h-3.5" />Hoje
            </button>
            <button type="button" onClick={() => handleOpenForm('weekly')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
              <Calendar className="w-3.5 h-3.5" />Semanal
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <FeedbackForm
            mode={formMode}
            weekNumber={currentWeek}
            slots={formSlots}
            onSubmitWeekly={handleSubmitWeekly}
            onSubmitDaily={handleSubmitDaily}
            onClose={handleCloseForm}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>

      {feedbackEntries.length > 0 ? (
        <div className="space-y-3">
          {feedbackEntries.map((entry, i) => (
            <FeedbackEntryCard key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      ) : (
        !showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-ceramic-cool/50 rounded-2xl p-8 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-ceramic-text-secondary/40 mx-auto" />
            <p className="text-sm font-medium text-ceramic-text-primary">Nenhum feedback registrado</p>
            <p className="text-xs text-ceramic-text-secondary leading-relaxed">Registre como estao seus treinos para ajudar seu coach a ajustar o plano.</p>
            <button type="button" onClick={() => handleOpenForm('daily')} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" />Registrar Feedback
            </button>
          </motion.div>
        )
      )}
    </div>
  );
}
