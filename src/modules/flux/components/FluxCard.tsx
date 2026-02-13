/**
 * FluxCard - Mini dashboard for Home page
 *
 * Displays athlete counts by modality, alerts summary, and quick navigation.
 * Acts as an entry point to the Flux training management module.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users } from 'lucide-react';
import { useAthletes } from '../hooks/useAthletes';
import { MODALITY_CONFIG } from '../types';
import type { TrainingModality } from '../types';

// Modality icons as components for better rendering
const ModalityIcon: React.FC<{ modality: TrainingModality; className?: string }> = ({ modality, className }) => {
  const icons: Record<TrainingModality, string> = {
    swimming: '🏊',
    running: '🏃',
    cycling: '🚴',
    strength: '🏋️',
    walking: '🚶',
  };
  return <span className={className}>{icons[modality]}</span>;
};

export function FluxCard() {
  const navigate = useNavigate();

  // Get real data from Supabase
  const { athletes, isLoading } = useAthletes();

  // Calculate athlete counts by modality
  const athleteCounts = useMemo(() => {
    const counts: Record<TrainingModality, number> = {
      swimming: 0,
      running: 0,
      cycling: 0,
      strength: 0,
      walking: 0,
    };

    for (const athlete of athletes) {
      if (athlete.modality in counts) {
        counts[athlete.modality]++;
      }
    }

    return counts;
  }, [athletes]);

  const totalAthletes = athletes.length;

  // Handle navigation
  const handleClick = () => {
    navigate('/flux');
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="ceramic-card relative overflow-hidden p-5 min-h-[180px] flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #F0EFE9 0%, #E6F2F5 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-ceramic-accent/20 border-t-ceramic-accent rounded-full animate-spin" />
          <span className="text-xs text-ceramic-text-secondary">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="ceramic-card relative overflow-hidden p-5 min-h-[180px] flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
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
            <Users className="w-5 h-5 text-ceramic-info" />
          </div>
          <div>
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Flux</span>
            <p className="text-lg font-bold text-ceramic-text-primary">
              {totalAthletes} {totalAthletes === 1 ? 'Atleta' : 'Atletas'}
            </p>
          </div>
        </div>

        {/* Modality Grid */}
        <div className="grid grid-cols-5 gap-2 mb-4">
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
