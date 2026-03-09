/**
 * SchedulingSection - Episode scheduling and location configuration
 *
 * Extracted from SetupStage for better modularity.
 * Handles date, time, location, and season/episode number fields.
 *
 * @module studio/components/workspace
 */

import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface SchedulingData {
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  season: string;
}

interface SchedulingSectionProps {
  data: SchedulingData;
  onUpdate: (updates: Partial<SchedulingData>) => void;
}

export default function SchedulingSection({ data, onUpdate }: SchedulingSectionProps) {
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
            Agende quando será gravado o episódio (opcional)
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
              <span>Data da Gravação</span>
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
              <span>Horário</span>
            </label>
            <input
              id="scheduled-time-input"
              type="time"
              value={data.scheduledTime}
              onChange={(e) => onUpdate({ scheduledTime: e.target.value })}
              className="w-full px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-ceramic-base transition-all text-ceramic-text-primary"
            />
            {!data.scheduledTime && (
              <p className="text-xs text-ceramic-tertiary mt-1">Defina o horário</p>
            )}
          </div>
        </div>
      </div>

      {/* Location and Season - Secondary Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="location-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-2 flex items-center space-x-2"
          >
            <MapPin className="w-4 h-4 text-ceramic-tertiary" aria-hidden="true" />
            <span>Local da Gravação</span>
          </label>
          <input
            id="location-input"
            type="text"
            value={data.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            placeholder="Ex: Estúdio A, Remoto (Zoom), Casa do convidado"
            className="w-full px-4 py-2 border border-ceramic-border rounded-lg focus:ring-2 focus:ring-ceramic-accent focus:border-transparent transition-all hover:border-ceramic-accent/50 bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-tertiary"
          />
        </div>
        <div>
          <label
            htmlFor="season-input"
            className="block text-sm font-medium text-ceramic-text-primary mb-2"
          >
            Temporada / Número do Episódio
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
