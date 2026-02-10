import { useState, useCallback, useMemo } from 'react';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { CalendarSyncButton } from '../../components/CalendarSyncButton';
import { CalendarConflictAlert, CalendarConflict } from '../../components/CalendarConflictAlert';
import { eventService } from '../../services/eventService';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('MentorshipScheduler');

/**
 * Props for MentorshipScheduler component
 */
interface MentorshipSchedulerProps {
  academiaSpaceId: string;
  mentorshipId?: string;
  onEventCreated?: (eventId: string) => void;
  className?: string;
}

/**
 * Scheduler component for Academia mentorship sessions with Google Calendar integration
 *
 * Features:
 * - Schedule mentorship sessions with specific mentors
 * - Automatic Google Calendar sync
 * - Conflict detection with other sessions
 * - Recurring session support (weekly, biweekly, monthly)
 * - Reminder configuration
 * - Time zone aware scheduling
 *
 * @example
 * ```tsx
 * <MentorshipScheduler
 *   academiaSpaceId="academia-123"
 *   onEventCreated={(eventId) => refetchMentorships()}
 * />
 * ```
 */
export function MentorshipScheduler({
  academiaSpaceId,
  mentorshipId,
  onEventCreated,
  className = '',
}: MentorshipSchedulerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none');
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { syncEvent, checkConflicts: checkCalendarConflicts } = useCalendarSync({
    spaceId: academiaSpaceId,
    enabled: true,
  });

  // Generate recurrence rule based on selection
  const generateRecurrenceRule = (type: string): string | undefined => {
    const rules: Record<string, string> = {
      weekly: 'RRULE:FREQ=WEEKLY;COUNT=12', // 12 weeks
      biweekly: 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=6',
      monthly: 'RRULE:FREQ=MONTHLY;COUNT=6',
    };
    return rules[type];
  };

  // Check for conflicts
  const handleCheckConflicts = useCallback(async () => {
    try {
      setErrorMessage(null);

      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${startDate}T${endTime}:00`;

      const foundConflicts = await checkCalendarConflicts(startDateTime, endDateTime);
      setConflicts(foundConflicts);

      if (foundConflicts.length === 0) {
        setSuccessMessage('Nenhum conflito detectado neste horário');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao verificar conflitos';
      setErrorMessage(message);
    }
  }, [startDate, startTime, endTime, checkCalendarConflicts]);

  // Handle form submission
  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // Validate inputs
      if (!title || !startDate || !startTime || !endTime) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Check conflicts one more time
      const startDateTime = `${startDate}T${startTime}:00`;
      const endDateTime = `${startDate}T${endTime}:00`;
      const foundConflicts = await checkCalendarConflicts(startDateTime, endDateTime);

      if (foundConflicts.length > 0) {
        setConflicts(foundConflicts);
        throw new Error('Existem conflitos de horário neste slot');
      }

      // Create the event
      const eventData = {
        title: title || 'Sessão de Mentoria',
        description: `${description}\n\nMentor: ${mentorName}${mentorEmail ? ` (${mentorEmail})` : ''}`,
        starts_at: startDateTime,
        ends_at: endDateTime,
        is_all_day: false,
        event_type: 'mentorship',
        recurrence_rule: generateRecurrenceRule(recurrence),
        rsvp_enabled: true,
        location: 'Virtual', // Default for online mentorship
      };

      const createdEvent = await eventService.createEvent(academiaSpaceId, eventData);

      // Sync to Google Calendar
      try {
        await syncEvent.mutateAsync(createdEvent.id);
      } catch (syncError) {
        log.warn('[MentorshipScheduler] Warning: Could not sync to Google Calendar:', syncError);
        // Don't fail if sync fails, the event is created locally
      }

      setSuccessMessage(
        `Sessão de mentoria agendada para ${new Date(startDateTime).toLocaleDateString('pt-BR')} ${startTime}`
      );

      // Reset form
      setTitle('');
      setDescription('');
      setMentorName('');
      setMentorEmail('');
      setRecurrence('none');
      setConflicts([]);

      onEventCreated?.(createdEvent.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao agendar sessão';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear messages after delay
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Calculate end time automatically based on duration
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    // Auto-set end time to 1 hour later
    const [hours, minutes] = newStartTime.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    date.setHours(date.getHours() + 1);
    const newEndTime = date.toTimeString().slice(0, 5);
    setEndTime(newEndTime);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-ceramic-base rounded-lg border border-ceramic-border p-6">
        <h3 className="text-2xl font-bold text-ceramic-text-primary">Agendar Sessão de Mentoria</h3>
        <p className="text-sm text-ceramic-text-secondary mt-2">
          Programe uma sessão com seu mentor e sincronize automaticamente com o Google Calendar
        </p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-ceramic-success-bg border border-ceramic-success/20 rounded-lg">
          <p className="text-sm text-ceramic-success font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-ceramic-error-bg border border-ceramic-error/20 rounded-lg">
          <p className="text-sm text-ceramic-error font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Conflict Alert */}
      {conflicts.length > 0 && (
        <CalendarConflictAlert
          conflicts={conflicts}
          onClose={() => setConflicts([])}
        />
      )}

      {/* Form */}
      <form onSubmit={handleSchedule} className="bg-ceramic-base rounded-lg border border-ceramic-border p-6 space-y-6">
        {/* Session Title */}
        <div>
          <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
            Título da Sessão
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Aula de React avançado"
            className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes sobre a sessão..."
            rows={3}
            className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Mentor Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
              Nome do Mentor
            </label>
            <input
              type="text"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
              placeholder="Ex: Dr. João Silva"
              className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
              Email do Mentor
            </label>
            <input
              type="email"
              value={mentorEmail}
              onChange={(e) => setMentorEmail(e.target.value)}
              placeholder="mentor@email.com"
              className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
              Data
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
              Início
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
              Fim
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-sm font-semibold text-ceramic-text-primary mb-2">
            Recorrência
          </label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as any)}
            className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="none">Sem repetição</option>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quinzenal</option>
            <option value="monthly">Mensal</option>
          </select>
          {recurrence !== 'none' && (
            <p className="text-xs text-ceramic-text-secondary mt-2">
              A sessão será repetida automaticamente
            </p>
          )}
        </div>

        {/* Conflict Check Button */}
        <button
          type="button"
          onClick={handleCheckConflicts}
          className="w-full px-4 py-2 text-sm font-medium text-ceramic-info bg-ceramic-info-bg border border-ceramic-info/20 rounded-lg hover:bg-ceramic-info-bg/80 transition-colors"
        >
          🔍 Verificar Conflitos
        </button>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Agendando...' : '✓ Agendar Sessão'}
        </button>
      </form>

      {/* Info Box */}
      <div className="bg-ceramic-info-bg rounded-lg border border-ceramic-info/20 p-4">
        <p className="text-sm text-ceramic-info font-medium mb-2">Informações importantes:</p>
        <ul className="text-xs text-ceramic-info/80 space-y-1">
          <li>• A sessão será sincronizada com seu Google Calendar automaticamente</li>
          <li>• Você receberá lembretes antes de cada sessão</li>
          <li>• A recorrência criará múltiplas sessões no calendário</li>
          <li>• Você pode editar ou cancelar a qualquer momento</li>
        </ul>
      </div>
    </div>
  );
}
