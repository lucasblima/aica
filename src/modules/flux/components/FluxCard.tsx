/**
 * FluxCard - Mini dashboard for Home page
 *
 * Displays athlete counts by modality, alerts summary, and quick navigation.
 * Acts as an entry point to the Flux training management module.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import {
  getMockAthleteCountsByModality,
  getMockAlertsSummary,
  getMockUnacknowledgedAlerts,
  MOCK_ATHLETES,
} from '../mockData';
import { MODALITY_CONFIG, SEVERITY_COLORS } from '../types';
import type { TrainingModality, AlertSeverity } from '../types';

// Modality icons as components for better rendering
const ModalityIcon: React.FC<{ modality: TrainingModality; className?: string }> = ({ modality, className }) => {
  const icons: Record<TrainingModality, string> = {
    swimming: '🏊',
    running: '🏃',
    cycling: '🚴',
    strength: '🏋️',
  };
  return <span className={className}>{icons[modality]}</span>;
};

export function FluxCard() {
  const navigate = useNavigate();

  // Get data from mock
  const athleteCounts = getMockAthleteCountsByModality();
  const alertsSummary = getMockAlertsSummary();
  const unacknowledgedAlerts = getMockUnacknowledgedAlerts();
  const totalAthletes = MOCK_ATHLETES.length;

  // Handle navigation
  const handleClick = () => {
    navigate('/flux');
  };

  const handleAlertsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/flux/alerts');
  };

  return (
    <div
      onClick={handleClick}
      className="ceramic-card relative overflow-hidden p-5 flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
      style={{
        background: 'linear-gradient(135deg, #F0EFE9 0%, #E6F2F5 100%)',
      }}
    >
      {/* Background decoration */}
      <div className="absolute -right-6 -bottom-6 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform duration-500">
        <span className="text-[120px]">🏋️</span>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="ceramic-inset p-2">
            <Users className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Flux</span>
            <p className="text-lg font-bold text-ceramic-text-primary">{totalAthletes} Atletas</p>
          </div>
        </div>

        {/* Modality Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {(Object.keys(MODALITY_CONFIG) as TrainingModality[]).map((modality) => {
            const config = MODALITY_CONFIG[modality];
            const count = athleteCounts[modality];

            return (
              <div
                key={modality}
                className="ceramic-inset p-2 flex flex-col items-center justify-center text-center"
              >
                <ModalityIcon modality={modality} className="text-xl mb-1" />
                <span className="text-lg font-bold text-ceramic-text-primary">{count}</span>
                <span className="text-[10px] text-ceramic-text-secondary uppercase tracking-wide">
                  {config.label.slice(0, 6)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Alerts Summary (if any) */}
        {unacknowledgedAlerts.length > 0 && (
          <div
            onClick={handleAlertsClick}
            className="flex items-center gap-3 p-3 bg-white/50 rounded-lg mb-3 hover:bg-white/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-1">
              {alertsSummary.critical > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500" title={`${alertsSummary.critical} criticos`} />
              )}
              {alertsSummary.high > 0 && (
                <span className="w-2 h-2 rounded-full bg-orange-500" title={`${alertsSummary.high} altos`} />
              )}
              {alertsSummary.medium > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" title={`${alertsSummary.medium} medios`} />
              )}
            </div>
            <p className="text-xs text-ceramic-text-secondary flex-1">
              <span className="font-bold text-ceramic-text-primary">{unacknowledgedAlerts.length}</span> alertas pendentes
            </p>
            <ChevronRight className="w-4 h-4 text-ceramic-text-secondary" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary font-medium group-hover:translate-x-1 transition-transform mt-auto">
          <span>Gerenciar Treinos</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

export default FluxCard;
