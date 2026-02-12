/**
 * ScheduleWhatsAppModal - Modal para agendar envio de plano semanal via WhatsApp
 *
 * Allows coach to schedule when weekly workout plans are sent via WhatsApp
 */

import React, { useState } from 'react';
import { X, Calendar, Clock, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AutomationService } from '../services/automationService';
import type { Microcycle } from '../types/flow';

interface ScheduleWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  microcycle: Microcycle;
  athleteId: string;
  athleteName: string;
  weekNumber: 1 | 2 | 3;
  onSuccess?: () => void;
}

export function ScheduleWhatsAppModal({
  isOpen,
  onClose,
  microcycle,
  athleteId,
  athleteName,
  weekNumber,
  onSuccess,
}: ScheduleWhatsAppModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to next Monday at 6 AM
    const date = new Date();
    const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(6, 0, 0, 0);
    return date.toISOString().split('T')[0];
  });

  const [selectedTime, setSelectedTime] = useState('06:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSchedule = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const scheduledFor = new Date(`${selectedDate}T${selectedTime}:00`);

      const { data, error: scheduleError } = await AutomationService.scheduleWeeklyPlan({
        microcycleId: microcycle.id,
        athleteId,
        weekNumber,
        scheduledFor,
      });

      if (scheduleError) throw scheduleError;

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md ceramic-card p-6 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-ceramic-text-primary">
                Agendar WhatsApp
              </h2>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                Plano Semanal - Semana {weekNumber}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-ceramic-text-secondary" />
            </button>
          </div>

          {/* Athlete Info */}
          <div className="mb-6 p-4 ceramic-inset rounded-lg">
            <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider mb-1">
              Atleta
            </p>
            <p className="text-base font-bold text-ceramic-text-primary">{athleteName}</p>
            <p className="text-xs text-ceramic-text-secondary mt-2">
              {microcycle.name} - Semana {weekNumber}
            </p>
          </div>

          {/* Date Picker */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              <Calendar className="inline w-4 h-4 mr-2" />
              Data de Envio
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 ceramic-inset rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>

          {/* Time Picker */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
              <Clock className="inline w-4 h-4 mr-2" />
              Horário
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-3 ceramic-inset rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
              <p className="text-sm text-ceramic-error">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 ceramic-inset hover:bg-white/50 rounded-lg font-medium text-ceramic-text-primary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSchedule}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-ceramic-accent hover:bg-ceramic-accent/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Agendar
                </>
              )}
            </button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-ceramic-text-secondary mt-4 text-center">
            A mensagem será enviada automaticamente via WhatsApp no horário agendado
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
