/**
 * SchedulingSection - Episode scheduling and location configuration
 *
 * Extracted from SetupStage for better modularity.
 * Handles date, time, location, and season/episode number fields.
 * Includes Agenda integration: sync recording to calendar.
 *
 * @module studio/components/workspace
 */

import React, { useState, useCallback } from 'react';
import { Calendar, Clock, MapPin, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { syncRecordingToCalendar } from '@/modules/studio/services/crossModuleService';

interface SchedulingData {
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  season: string;
}

interface SchedulingSectionProps {
  data: SchedulingData;
  onUpdate: (updates: Partial<SchedulingData>) => void;
  /** Episode title for calendar event naming */
  episodeTitle?: string;
  /** Guest name for calendar event naming */
  guestName?: string;
}

export default function SchedulingSection({ data, onUpdate, episodeTitle, guestName }: SchedulingSectionProps) {
  const [syncToCalendar, setSyncToCalendar] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const canSync = !!(data.scheduledDate && data.scheduledTime);

  const handleSyncToCalendar = useCallback(async () => {
    if (!canSync) return;

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncError('Usuario nao autenticado');
        return;
      }

      const result = await syncRecordingToCalendar(
        {
          title: episodeTitle || 'Episodio',
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          guestName: guestName,
          location: data.location,
        },
        user.id
      );

      if (result) {
        setSyncSuccess(true);
      } else {
        setSyncError('Agenda nao disponivel. O evento sera sincronizado com Google Calendar automaticamente.');
      }
    } catch {
      setSyncError('Erro ao sincronizar com a agenda');
    } finally {
      setIsSyncing(false);
    }
  }, [canSync, data.scheduledDate, data.scheduledTime, data.location, episodeTitle, guestName]);

  return (
    <section
      className="bg-ceramic-surface rounded-lg shadow-sm p-4 sm:p-6 space-y-6"
      aria-labelledby="scheduling-heading"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2
            id="scheduling-heading"
            className="text-lg font-semibold text-ceramic-text-primary flex items-center space-x-2"
          >
            <Calendar className="w-5 h-5 text-ceramic-text-primary" aria-hidden="true" />
            <span>Agendamento</span>
          </h2>
          <p className="text-sm text-ceramic-secondary mt-1">
            Agende quando sera gravado o episodio (opcional)
          </p>
        </div>
      </div>

      {/* Date and Time - Highlighted */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="scheduled-date-input"
              className="block text-sm font-semibold text-ceramic-text-primary mb-2 flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span>Data da Gravacao</span>
            </label>
            <input
              id="scheduled-date-input"
              type="date"
              value={data.scheduledDate}
              onChange={(e) => onUpdate({ scheduledDate: e.target.value })}
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-ceramic-base transition-all text-ceramic-text-primary"
            />
            {!data.scheduledDate && (
              <p className="text-xs text-ceramic-tertiary mt-1">Selecione a data</p>
            )}
          </div>
          <div>
            <label
              htmlFor="scheduled-time-input"
              className="block text-sm font-semibold text-ceramic-text-primary mb-2 flex items-center space-x-2"
            >
              <Clock className="w-4 h-4 text-orange-600" aria-hidden="true" />
              <span>Horario</span>
            </label>
            <input
              id="scheduled-time-input"
              type="time"
              value={data.scheduledTime}
              onChange={(e) => onUpdate({ scheduledTime: e.target.value })}
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-ceramic-base transition-all text-ceramic-text-primary"
            />
            {!data.scheduledTime && (
              <p className="text-xs text-ceramic-tertiary mt-1">Defina o horario</p>
            )}
          </div>
        </div>
      </div>

      {/* Sync to Calendar checkbox */}
      {canSync && (
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToCalendar}
              onChange={(e) => {
                setSyncToCalendar(e.target.checked);
                setSyncSuccess(false);
                setSyncError(null);
              }}
              className="w-4 h-4 rounded border-ceramic-border text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-ceramic-text-primary">
              Sincronizar com Agenda
            </span>
          </label>

          {syncToCalendar && !syncSuccess && (
            <button
              type="button"
              onClick={handleSyncToCalendar}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Calendar className="w-4 h-4" aria-hidden="true" />
              )}
              {isSyncing ? 'Sincronizando...' : 'Criar Evento na Agenda'}
            </button>
          )}

          {syncSuccess && (
            <div className="flex items-center gap-2 text-sm text-ceramic-success" role="status">
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Evento criado na Agenda</span>
            </div>
          )}

          {syncError && (
            <p className="text-xs text-ceramic-warning">{syncError}</p>
          )}
        </div>
      )}

      {/* Location and Season - Secondary Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="location-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-2 flex items-center space-x-2"
          >
            <MapPin className="w-4 h-4 text-ceramic-tertiary" aria-hidden="true" />
            <span>Local da Gravacao</span>
          </label>
          <input
            id="location-input"
            type="text"
            value={data.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="Ex: Estudio A, Remoto (Zoom), Casa do convidado"
            className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent transition-all hover:border-ceramic-accent/50 bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
          />
        </div>
        <div>
          <label
            htmlFor="season-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Temporada / Numero do Episodio
          </label>
          <input
            id="season-input"
            type="text"
            value={data.season}
            onChange={(e) => onUpdate({ season: e.target.value })}
            placeholder="Ex: T1 E05, Temporada 1"
            className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent transition-all hover:border-ceramic-accent/50 bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
          />
        </div>
      </div>

      {/* Visual Summary when scheduled */}
      {(data.scheduledDate || data.scheduledTime || data.location) && (
        <div
          className="p-3 bg-ceramic-surface-hover rounded-lg border border-ceramic-border"
          role="status"
          aria-label="Resumo do agendamento"
        >
          <p className="text-xs font-medium text-ceramic-tertiary mb-1">RESUMO</p>
          <div className="flex flex-wrap gap-2">
            {data.scheduledDate && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-text-primary">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                <span>{new Date(data.scheduledDate + 'T00:00').toLocaleDateString('pt-BR')}</span>
              </span>
            )}
            {data.scheduledTime && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-text-primary">
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>{data.scheduledTime}</span>
              </span>
            )}
            {data.location && (
              <span className="inline-flex items-center space-x-1 px-2 py-1 bg-ceramic-base border border-ceramic-border rounded text-xs text-ceramic-text-primary">
                <MapPin className="w-3 h-3" aria-hidden="true" />
                <span>{data.location}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
