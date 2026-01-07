/**
 * EmotionalThermometer Component
 * Displays emotional sentiment scores for a contact over time
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface EmotionalThermometerProps {
  contactHash: string;
  contactName: string;
  defaultTimeWindow?: 'week' | 'month' | 'all';
  showTimeWindowSelector?: boolean;
  height?: number;
}

export function EmotionalThermometer({
  contactHash,
  contactName,
  defaultTimeWindow = 'week',
  showTimeWindowSelector = false,
  height = 300,
}: EmotionalThermometerProps) {
  return (
    <div className="ceramic-card p-8 rounded-3xl" style={{ minHeight: height }}>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <TrendingUp className="w-12 h-12 text-ceramic-text-secondary/30" />
        <p className="text-sm text-ceramic-text-secondary font-medium">
          Termômetro Emocional - {contactName}
        </p>
        <p className="text-xs text-ceramic-text-tertiary">
          Análise de sentimento do período: {defaultTimeWindow}
        </p>
        {showTimeWindowSelector && (
          <div className="mt-4 flex gap-2">
            <button className="ceramic-inset px-3 py-1 text-xs rounded font-medium">
              Semana
            </button>
            <button className="ceramic-inset px-3 py-1 text-xs rounded font-medium">
              Mês
            </button>
            <button className="ceramic-inset px-3 py-1 text-xs rounded font-medium">
              Tudo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmotionalThermometer;
