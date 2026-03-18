/**
 * FluxCard - Mini dashboard for Home page
 *
 * Displays athlete counts by modality, alerts summary, and quick navigation.
 * Acts as an entry point to the Flux training management module.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, Calendar, TrendingUp } from 'lucide-react';
import { useAthletes } from '../hooks/useAthletes';
import { supabase } from '@/services/supabaseClient';
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
    triathlon: '🏅',
  };
  return <span className={className}>{icons[modality]}</span>;
};

interface FluxCardProps {
  /** Compact mode for Home dashboard — shows icon + title + total athletes + inline modalities */
  compact?: boolean;
}

export function FluxCard({ compact = false }: FluxCardProps) {
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
      triathlon: 0,
    };

    for (const athlete of athletes) {
      if (athlete.modality in counts) {
        counts[athlete.modality]++;
      }
    }

    return counts;
  }, [athletes]);

  const totalAthletes = athletes.length;

  // Aggregate stats: workouts this week + active microcycle progress
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [activeMicrocycleWeek, setActiveMicrocycleWeek] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (athletes.length === 0) return;
    let cancelled = false;

    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Workout slots completed this week
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('workout_slots')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', monday.toISOString());

      if (!cancelled) setWeeklyWorkouts(count ?? 0);

      // Active microcycle progress (most recent active one)
      const { data: mcData } = await supabase
        .from('microcycles')
        .select('start_date, end_date')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled && mcData) {
        const start = new Date(mcData.start_date);
        const end = new Date(mcData.end_date);
        const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
        const elapsed = Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const currentWeek = Math.max(1, Math.min(elapsed, totalWeeks));
        setActiveMicrocycleWeek({ current: currentWeek, total: totalWeeks });
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [athletes]);

  // Handle navigation
  const handleClick = () => {
    navigate('/flux');
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={`ceramic-card relative overflow-hidden flex items-center justify-center ${compact ? 'p-3 min-h-[100px]' : 'p-5 min-h-[180px]'}`}
        style={{
          background: 'linear-gradient(135deg, #F0EFE9 0%, #E6F2F5 100%)',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-ceramic-accent/20 border-t-ceramic-accent rounded-full animate-spin" />
          {!compact && <span className="text-xs text-ceramic-text-secondary">Carregando...</span>}
        </div>
      </div>
    );
  }

  // ── Compact mode: icon + title + total athletes + inline modality emojis ──
  if (compact) {
    const modalityEmojis: Record<TrainingModality, string> = {
      swimming: '\u{1F3CA}',
      running: '\u{1F3C3}',
      cycling: '\u{1F6B4}',
      strength: '\u{1F3CB}\u{FE0F}',
      walking: '\u{1F6B6}',
      triathlon: '\u{1F3C5}',
    };

    return (
      <div
        onClick={handleClick}
        className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
        style={{
          background: 'linear-gradient(135deg, #F0EFE9 0%, #E6F2F5 100%)',
        }}
      >
        {/* Background decoration — smaller */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5">
          <span className="text-[80px]">{'\u{1F3CB}\u{FE0F}'}</span>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-1.5">
                <Users className="w-4 h-4 text-ceramic-info" />
              </div>
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Flux</span>
            </div>
            <div className="ceramic-inset px-2 py-0.5 rounded-full">
              <span className="text-[10px] font-bold text-ceramic-info">
                {totalAthletes}
              </span>
            </div>
          </div>

          {/* Inline modality counts */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-ceramic-text-secondary">
            {(Object.keys(athleteCounts) as TrainingModality[]).map((modality) => {
              const count = athleteCounts[modality];
              if (count === 0) return null;
              return (
                <span key={modality} className="whitespace-nowrap">
                  {modalityEmojis[modality]}{count}
                </span>
              );
            })}
            {totalAthletes === 0 && <span>Nenhum atleta</span>}
          </div>

          {/* Quick stats row */}
          {totalAthletes > 0 && (
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ceramic-text-secondary">
              {weeklyWorkouts > 0 && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" />
                  {weeklyWorkouts} treino{weeklyWorkouts !== 1 ? 's' : ''} na semana
                </span>
              )}
              {activeMicrocycleWeek && (
                <span className="flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  Sem {activeMicrocycleWeek.current}/{activeMicrocycleWeek.total}
                </span>
              )}
            </div>
          )}
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

        {/* Weekly Stats */}
        {totalAthletes > 0 && (weeklyWorkouts > 0 || activeMicrocycleWeek) && (
          <div className="flex items-center gap-4 mb-3 text-xs text-ceramic-text-secondary">
            {weeklyWorkouts > 0 && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-ceramic-info" />
                <span>{weeklyWorkouts} treino{weeklyWorkouts !== 1 ? 's' : ''} esta semana</span>
              </div>
            )}
            {activeMicrocycleWeek && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-ceramic-success" />
                <span>Semana {activeMicrocycleWeek.current}/{activeMicrocycleWeek.total}</span>
              </div>
            )}
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
