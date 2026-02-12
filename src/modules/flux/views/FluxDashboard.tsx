/**
 * FluxDashboard - Main coach dashboard view
 *
 * Displays athlete grid with colorimetric status, alert summary, and quick stats.
 * Supports multiple training modalities: swimming, running, cycling, and strength.
 * Entry point for the Flux module with modality filtering.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlux } from '../context/FluxContext';
import {
  MOCK_ATHLETES_WITH_METRICS,
  MOCK_ALERTS,
  getMockAlertsForAthlete,
  getMockFeedbacksForAthlete,
  getMockUnacknowledgedAlerts,
  getMockAthleteCountsByModality,
} from '../mockData';
import { MODALITY_CONFIG, TRAINING_MODALITIES } from '../types';
import type { TrainingModality, AthleteLevel } from '../types';
import { AthleteCard } from '../components/AthleteCard';
import { AlertBadge } from '../components/AlertBadge';
import { WhatsAppMessageModal } from '../components/WhatsAppMessageModal';
import type { AthleteWithMetrics } from '../types';
import { ArrowLeft, AlertCircle, Users, TrendingUp, Plus, Filter, GraduationCap, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// Sort options
type SortOrder = 'none' | 'asc' | 'desc';

// Level category groupings
type LevelCategory = 'all' | 'iniciante' | 'intermediario' | 'avancado';

const LEVEL_CATEGORIES: { id: LevelCategory; label: string; icon: string; levels: AthleteLevel[] }[] = [
  { id: 'all', label: 'Todos', icon: '🎯', levels: [] },
  { id: 'iniciante', label: 'Iniciante', icon: '🌱', levels: ['iniciante_1', 'iniciante_2', 'iniciante_3'] },
  { id: 'intermediario', label: 'Intermediario', icon: '🌿', levels: ['intermediario_1', 'intermediario_2', 'intermediario_3'] },
  { id: 'avancado', label: 'Avancado', icon: '🌳', levels: ['avancado'] },
];

// Modality filter tab component
const ModalityTab: React.FC<{
  modality: TrainingModality | 'all';
  isSelected: boolean;
  count: number;
  onClick: () => void;
}> = ({ modality, isSelected, count, onClick }) => {
  const config = modality === 'all' ? null : MODALITY_CONFIG[modality];
  const label = modality === 'all' ? 'Todos' : config?.label || '';
  const icon = modality === 'all' ? '🎯' : config?.icon || '';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        isSelected
          ? 'ceramic-card bg-ceramic-base shadow-md'
          : 'ceramic-inset hover:bg-white/50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className={`text-xs font-bold uppercase tracking-wider ${
        isSelected ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'
      }`}>
        {label}
      </span>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
        isSelected ? 'bg-ceramic-info/20 text-ceramic-info' : 'bg-ceramic-cool text-ceramic-text-secondary'
      }`}>
        {count}
      </span>
    </button>
  );
};

export default function FluxDashboard() {
  const navigate = useNavigate();
  const { actions } = useFlux();

  // Filter and sort states
  const [selectedModality, setSelectedModality] = useState<TrainingModality | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<LevelCategory>('all');
  const [consistencySort, setAdherenceSort] = useState<SortOrder>('none');

  // WhatsApp modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [selectedAthleteForWhatsApp, setSelectedAthleteForWhatsApp] = useState<AthleteWithMetrics | null>(null);
  const [selectedAthleteAlerts, setSelectedAthleteAlerts] = useState<typeof MOCK_ALERTS[number][]>([]);

  // Mock data
  const allAthletes = MOCK_ATHLETES_WITH_METRICS;
  const unacknowledgedAlerts = getMockUnacknowledgedAlerts();
  const criticalAlerts = unacknowledgedAlerts.filter((a) => a.severity === 'critical');
  const documentAlerts = unacknowledgedAlerts.filter((a) => a.alert_type === 'documents');
  const modalityCounts = getMockAthleteCountsByModality();

  // Calculate level counts
  const levelCounts = useMemo(() => {
    const counts: Record<LevelCategory, number> = {
      all: allAthletes.length,
      iniciante: 0,
      intermediario: 0,
      avancado: 0,
    };

    for (const athlete of allAthletes) {
      if (athlete.level.startsWith('iniciante')) counts.iniciante++;
      else if (athlete.level.startsWith('intermediario')) counts.intermediario++;
      else if (athlete.level === 'avancado') counts.avancado++;
    }

    return counts;
  }, [allAthletes]);

  // Filter and sort athletes
  const filteredAthletes = useMemo(() => {
    let result = [...allAthletes];

    // Filter by modality
    if (selectedModality !== 'all') {
      result = result.filter((a) => a.modality === selectedModality);
    }

    // Filter by level category
    if (selectedLevel !== 'all') {
      const levelCategory = LEVEL_CATEGORIES.find((c) => c.id === selectedLevel);
      if (levelCategory) {
        result = result.filter((a) => levelCategory.levels.includes(a.level));
      }
    }

    // Sort by consistency rate
    if (consistencySort !== 'none') {
      result.sort((a, b) => {
        const aRate = a.consistency_rate || 0;
        const bRate = b.consistency_rate || 0;
        return consistencySort === 'asc' ? aRate - bRate : bRate - aRate;
      });
    }

    return result;
  }, [allAthletes, selectedModality, selectedLevel, consistencySort]);

  // Toggle sort order
  const toggleAdherenceSort = () => {
    setAdherenceSort((current) => {
      if (current === 'none') return 'desc';
      if (current === 'desc') return 'asc';
      return 'none';
    });
  };

  // Aggregate stats (based on filtered athletes)
  const activeAthletes = filteredAthletes.filter((a) => a.status === 'active').length;
  const avgConsistency =
    filteredAthletes.length > 0
      ? filteredAthletes.reduce((sum, a) => sum + (a.consistency_rate || 0), 0) / filteredAthletes.length
      : 0;

  // Handle athlete click
  const handleAthleteClick = (athleteId: string) => {
    actions.viewAthleteDetail(athleteId);
    navigate(`/flux/athlete/${athleteId}`);
  };

  // Handle alert click
  const handleAlertsClick = () => {
    actions.manageAlerts({ unacknowledged_only: true });
    navigate('/flux/alerts');
  };

  // Handle WhatsApp message
  const handleWhatsAppClick = (athlete: AthleteWithMetrics, alerts: typeof MOCK_ALERTS) => {
    setSelectedAthleteForWhatsApp(athlete);
    setSelectedAthleteAlerts(alerts);
    setWhatsAppModalOpen(true);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 ceramic-card flex items-center justify-center">
            <span className="text-3xl">🏋️</span>
          </div>
          <div>
            <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-0.5">
              Gestao de Treinos
            </p>
            <h1 className="text-3xl font-black text-ceramic-text-primary text-etched">
              Flux
            </h1>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Active Athletes */}
          <div className="ceramic-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-2">
                <Users className="w-4 h-4 text-ceramic-info" />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
                Atletas{selectedModality !== 'all' && ` (${MODALITY_CONFIG[selectedModality].label})`}
              </p>
            </div>
            <p className="text-2xl font-bold text-ceramic-text-primary">
              {activeAthletes}
            </p>
          </div>

          {/* Avg Adherence */}
          <div className="ceramic-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="ceramic-inset p-2">
                <TrendingUp className="w-4 h-4 text-ceramic-success" />
              </div>
              <p className="text-[10px] text-ceramic-text-secondary font-medium uppercase tracking-wider">
                Consistência Média
              </p>
            </div>
            <p className="text-2xl font-bold text-ceramic-success">
              {Math.round(avgConsistency)}%
            </p>
          </div>
        </div>

        {/* Critical Alerts Preview */}
        {criticalAlerts.length > 0 && (
          <div
            onClick={handleAlertsClick}
            className="ceramic-card p-4 mb-6 bg-ceramic-error/10 border border-ceramic-error/20 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-ceramic-error" />
              <p className="text-sm font-bold text-ceramic-error">
                {criticalAlerts.length} alerta(s) critico(s) requer(em) atencao
              </p>
            </div>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <AlertBadge key={alert.id} alert={alert} compact />
              ))}
            </div>
            {/* Exames pendentes */}
            {documentAlerts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ceramic-error/20 flex items-center gap-2">
                <span className="text-lg">🩺</span>
                <p className="text-sm font-medium text-ceramic-error">
                  {documentAlerts.length} exame(s) cardiologico(s) e atestado(s) pendente(s)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Filters Section */}
        <div className="space-y-4 mb-4">
          {/* Modality Filter Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-ceramic-text-secondary" />
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Modalidade
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <ModalityTab
                modality="all"
                isSelected={selectedModality === 'all'}
                count={allAthletes.length}
                onClick={() => setSelectedModality('all')}
              />
              {TRAINING_MODALITIES.map((modality) => (
                <ModalityTab
                  key={modality}
                  modality={modality}
                  isSelected={selectedModality === modality}
                  count={modalityCounts[modality]}
                  onClick={() => setSelectedModality(modality)}
                />
              ))}
            </div>
          </div>

          {/* Level Filter Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-ceramic-text-secondary" />
              <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Nivel
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {LEVEL_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedLevel(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    selectedLevel === category.id
                      ? 'ceramic-card bg-ceramic-base shadow-md'
                      : 'ceramic-inset hover:bg-white/50'
                  }`}
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    selectedLevel === category.id ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'
                  }`}>
                    {category.label}
                  </span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    selectedLevel === category.id ? 'bg-ceramic-success/20 text-ceramic-success' : 'bg-ceramic-cool text-ceramic-text-secondary'
                  }`}>
                    {levelCounts[category.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Athletes Grid */}
      <div className="px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            {selectedModality === 'all' && selectedLevel === 'all'
              ? 'Meus Atletas'
              : 'Atletas'}
            {selectedModality !== 'all' && (
              <span className="ml-1">de {MODALITY_CONFIG[selectedModality].label}</span>
            )}
            {selectedLevel !== 'all' && (
              <span className="ml-1">
                {selectedModality !== 'all' ? ' - ' : 'de nivel '}
                {LEVEL_CATEGORIES.find((c) => c.id === selectedLevel)?.label}
              </span>
            )}
            <span className="ml-2 text-sm font-normal text-ceramic-text-secondary">
              ({filteredAthletes.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {/* Sort by Adherence Button */}
            <button
              onClick={toggleAdherenceSort}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                consistencySort !== 'none'
                  ? 'ceramic-card bg-ceramic-base shadow-md'
                  : 'ceramic-inset hover:bg-white/50'
              }`}
              title={
                consistencySort === 'none'
                  ? 'Ordenar por adesao'
                  : consistencySort === 'desc'
                  ? 'Maior adesao primeiro'
                  : 'Menor adesao primeiro'
              }
            >
              {consistencySort === 'none' && <ArrowUpDown className="w-4 h-4 text-ceramic-text-secondary" />}
              {consistencySort === 'desc' && <ArrowDown className="w-4 h-4 text-ceramic-success" />}
              {consistencySort === 'asc' && <ArrowUp className="w-4 h-4 text-ceramic-error" />}
              <span className={`text-xs font-bold uppercase tracking-wider ${
                consistencySort !== 'none' ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'
              }`}>
                Consistência
              </span>
            </button>

            {/* New Athlete Button */}
            <button className="flex items-center gap-2 px-4 py-2 ceramic-card hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 text-ceramic-text-primary" />
              <span className="text-sm font-bold text-ceramic-text-primary">Novo Atleta</span>
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredAthletes.slice(0, 20).map((athlete) => {
            const athleteAlerts = getMockAlertsForAthlete(athlete.id);
            const athleteFeedbacks = getMockFeedbacksForAthlete(athlete.id);

            return (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                recentFeedbacks={athleteFeedbacks}
                activeAlerts={athleteAlerts}
                consistencyRate={athlete.consistency_rate || 0}
                onClick={() => handleAthleteClick(athlete.id)}
                onWhatsAppClick={() => handleWhatsAppClick(athlete, athleteAlerts)}
              />
            );
          })}
        </div>

        {/* Load More (if more than 20 athletes) */}
        {filteredAthletes.length > 20 && (
          <div className="text-center py-4">
            <button className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform">
              Carregar mais ({filteredAthletes.length - 20} restantes)
            </button>
          </div>
        )}

        {/* Empty State (if no athletes) */}
        {filteredAthletes.length === 0 && (
          <div className="ceramic-inset p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto ceramic-card flex items-center justify-center">
              <Users className="w-8 h-8 text-ceramic-text-secondary" />
            </div>
            <div>
              <p className="text-lg font-bold text-ceramic-text-primary mb-2">
                {selectedModality === 'all' && selectedLevel === 'all'
                  ? 'Nenhum atleta cadastrado'
                  : 'Nenhum atleta encontrado'}
              </p>
              <p className="text-sm text-ceramic-text-secondary font-light">
                {selectedModality === 'all' && selectedLevel === 'all'
                  ? 'Gerencie treinos de natacao, corrida, ciclismo ou forca'
                  : 'Ajuste os filtros ou cadastre novos atletas'}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedModality('all');
                setSelectedLevel('all');
                setAdherenceSort('none');
              }}
              className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              {selectedModality === 'all' && selectedLevel === 'all'
                ? 'Adicionar Primeiro Atleta'
                : 'Limpar Filtros'}
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp Message Modal */}
      {selectedAthleteForWhatsApp && (
        <WhatsAppMessageModal
          isOpen={whatsAppModalOpen}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setSelectedAthleteForWhatsApp(null);
            setSelectedAthleteAlerts([]);
          }}
          athlete={selectedAthleteForWhatsApp}
          alerts={selectedAthleteAlerts}
        />
      )}
    </div>
  );
}
