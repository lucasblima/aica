/**
 * EF_SimulationScreen - 14-day simulation summary
 *
 * Shows a timeline of simulated events with impact indicators.
 */

import React from 'react';
import type { SimulationEvent, StatsDelta } from '../types/eraforge.types';

interface EF_SimulationScreenProps {
  events: SimulationEvent[];
  summary: string;
  statsDelta: StatsDelta;
  onBack: () => void;
}

const IMPACT_COLORS: Record<string, string> = {
  positive: 'bg-ceramic-success',
  neutral: 'bg-ceramic-warning',
  negative: 'bg-ceramic-error',
};

export function EF_SimulationScreen({
  events,
  summary,
  statsDelta,
  onBack,
}: EF_SimulationScreenProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-2xl font-bold text-ceramic-text-primary"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          Simulacao Completa
        </h1>
        <p className="text-ceramic-text-secondary text-sm mt-1">
          Resumo dos ultimos 14 dias
        </p>
      </div>

      {/* Stats Delta */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Conhecimento', value: statsDelta.knowledge ?? 0, emoji: '📚' },
          { label: 'Cooperacao', value: statsDelta.cooperation ?? 0, emoji: '🤝' },
          { label: 'Coragem', value: statsDelta.courage ?? 0, emoji: '⚔️' },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-3 bg-ceramic-card rounded-xl shadow-ceramic-emboss text-center"
          >
            <div className="text-xl">{stat.emoji}</div>
            <div className="text-xs text-ceramic-text-secondary mt-1">{stat.label}</div>
            <div className={`text-lg font-bold mt-1 ${stat.value >= 0 ? 'text-ceramic-success' : 'text-ceramic-error'}`}>
              {stat.value >= 0 ? '+' : ''}{stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
        <p className="text-sm text-ceramic-text-primary">{summary || 'Nenhum resumo disponivel.'}</p>
      </div>

      {/* Event Timeline */}
      <div className="space-y-3">
        <h2
          className="text-lg font-semibold text-ceramic-text-primary"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          Eventos
        </h2>
        {events.length > 0 ? (
          events.map((event, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${IMPACT_COLORS[event.impact] || 'bg-ceramic-border'}`} />
                {idx < events.length - 1 && <div className="w-0.5 h-8 bg-ceramic-border" />}
              </div>
              <div className="flex-1 pb-4">
                <h3 className="text-sm font-medium text-ceramic-text-primary">{event.title}</h3>
                <p className="text-xs text-ceramic-text-secondary mt-1">{event.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 bg-ceramic-inset rounded-xl text-center">
            <p className="text-ceramic-text-secondary text-sm">Nenhum evento registrado.</p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
        style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
      >
        Voltar ao Inicio
      </button>
    </div>
  );
}
