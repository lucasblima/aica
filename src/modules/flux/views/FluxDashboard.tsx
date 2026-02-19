/**
 * FluxDashboard - Main coach dashboard view
 *
 * Displays athlete grid with colorimetric status, alert summary, and quick stats.
 * Supports multiple training modalities: swimming, running, cycling, and strength.
 * Entry point for the Flux module with modality filtering.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlux } from '../context/FluxContext';
import { useAthletes } from '../hooks/useAthletes';
import { useAthleteActivity } from '../hooks/useAthleteActivity';
import { AthleteService, CreateAthleteInput } from '../services/athleteService';
import { supabase } from '@/services/supabaseClient';
import { AthleteProfileService } from '../services/athleteProfileService';
import { MODALITY_CONFIG, TRAINING_MODALITIES } from '../types';
import type { TrainingModality, AthleteLevel, Alert, ModalityLevel } from '../types';
import { AthleteCard } from '../components/AthleteCard';
import type { SlotFeedback } from '../components/AthleteCard';
import { WhatsAppMessageModal } from '../components/WhatsAppMessageModal';
import { AthleteFormDrawer } from '../components/forms';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import type { Athlete } from '../types';
import { useWorkoutTemplates } from '../hooks/useWorkoutTemplates';
import { ArrowLeft, Users, TrendingUp, Plus, Filter, GraduationCap, ArrowUpDown, ArrowUp, ArrowDown, Search, CheckCircle, X } from 'lucide-react';
import { ModuleAgentChat, ModuleAgentFAB, getModuleAgentConfig } from '@/components/features/ModuleAgentChat';
import { useModuleAgent } from '@/hooks/useModuleAgent';
import { ErrorBoundary, ModuleErrorFallback } from '@/components/ui/ErrorBoundary';

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

const fluxAgentConfig = getModuleAgentConfig('flux')!;

export default function FluxDashboard() {
  const navigate = useNavigate();
  const { actions } = useFlux();
  const { isAgentOpen, openAgent, closeAgent } = useModuleAgent();

  // Fetch real athletes with adherence from Supabase
  const { athletes: allAthletes, isLoading, error, refresh } = useAthletes();

  // Realtime activity notifications
  const { notifications, dismissNotification } = useAthleteActivity();

  // Workout templates count for Biblioteca button
  const { templates } = useWorkoutTemplates();

  // Filter and sort states
  const [selectedModality, setSelectedModality] = useState<TrainingModality | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<LevelCategory>('all');
  const [consistencySort, setAdherenceSort] = useState<SortOrder>('none');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // WhatsApp modal state
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [selectedAthleteForWhatsApp, setSelectedAthleteForWhatsApp] = useState<Athlete | null>(null);
  const [selectedAthleteAlerts, setSelectedAthleteAlerts] = useState<any[]>([]);

  // Athlete form modal state
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<Athlete | null>(null);

  // Invite toast state
  const [inviteToast, setInviteToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Athlete feedbacks from workout_slots
  const [feedbacksByAthlete, setFeedbacksByAthlete] = useState<Record<string, SlotFeedback[]>>({});

  useEffect(() => {
    if (allAthletes.length === 0) return;
    let cancelled = false;

    const loadFeedbacks = async () => {
      const athleteIds = allAthletes.map((a) => a.id);
      const { data, error } = await supabase
        .from('workout_slots')
        .select('id, name, athlete_feedback, completed_at, rpe, athlete_id')
        .in('athlete_id', athleteIds)
        .not('athlete_feedback', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(100);

      if (cancelled || error || !data) return;

      const grouped: Record<string, SlotFeedback[]> = {};
      for (const row of data) {
        if (!grouped[row.athlete_id]) grouped[row.athlete_id] = [];
        if (grouped[row.athlete_id].length < 3) {
          grouped[row.athlete_id].push({
            id: row.id,
            name: row.name,
            athlete_feedback: row.athlete_feedback,
            completed_at: row.completed_at,
            rpe: row.rpe,
          });
        }
      }
      setFeedbacksByAthlete(grouped);
    };

    loadFeedbacks();
    return () => { cancelled = true; };
  }, [allAthletes]);

  // Calculate modality counts
  const modalityCounts = useMemo(() => {
    const counts: Record<TrainingModality, number> = {
      swimming: 0,
      running: 0,
      cycling: 0,
      strength: 0,
      walking: 0,
    };

    for (const athlete of allAthletes) {
      counts[athlete.modality]++;
    }

    return counts;
  }, [allAthletes]);

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

    // Filter by search query (name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((a) => a.name.toLowerCase().includes(query));
    }

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

    // Sort by adherence rate
    if (consistencySort !== 'none') {
      result.sort((a, b) => {
        const rateA = a.adherence_rate ?? 0;
        const rateB = b.adherence_rate ?? 0;
        return consistencySort === 'asc' ? rateA - rateB : rateB - rateA;
      });
    }

    return result;
  }, [allAthletes, selectedModality, selectedLevel, consistencySort, searchQuery]);

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
  const avgConsistency = useMemo(() => {
    const activeWithAdherence = filteredAthletes.filter((a) => a.status === 'active');
    if (activeWithAdherence.length === 0) return 0;
    const sum = activeWithAdherence.reduce((acc, a) => acc + (a.adherence_rate ?? 0), 0);
    return sum / activeWithAdherence.length;
  }, [filteredAthletes]);

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
  const handleWhatsAppClick = (athlete: Athlete, alerts: Alert[]) => {
    setSelectedAthleteForWhatsApp(athlete);
    setSelectedAthleteAlerts(alerts);
    setWhatsAppModalOpen(true);
  };

  // Handle send invite email
  const handleSendInvite = async (athlete: Athlete) => {
    if (!athlete.email) return;
    const { data: { user } } = await supabase.auth.getUser();
    const coachName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Seu Coach';
    const { success, error } = await AthleteService.sendInvite({
      athleteId: athlete.id,
      athleteName: athlete.name,
      athleteEmail: athlete.email,
      coachName,
    });
    if (success) {
      setInviteToast({ message: `Convite enviado para ${athlete.email}`, type: 'success' });
    } else {
      setInviteToast({ message: error || 'Erro ao enviar convite', type: 'error' });
    }
    setTimeout(() => setInviteToast(null), 4000);
  };

  // Handle save athlete (create or update)
  const handleSaveAthlete = async (athleteData: Partial<Athlete> & { modalityLevels?: ModalityLevel[] }) => {
    try {
      const modalityLevels = athleteData.modalityLevels || [];

      // Validate: at least one modality must be selected
      if (modalityLevels.length === 0) {
        throw new Error('Selecione pelo menos uma modalidade');
      }

      // Extract just modalities array for syncProfilesForAthlete
      const modalities = modalityLevels.map(ml => ml.modality);

      // First modality = primary modality in athletes table
      const primaryModality = modalities[0];

      // Prepare athlete data (without modalityLevels array)
      const { modalityLevels: _, ...athletePayload } = athleteData;
      const athleteWithModality = {
        ...athletePayload,
        modality: primaryModality,
      };

      let athleteId: string;

      if (editingAthlete) {
        // Update existing athlete
        const { data, error } = await AthleteService.updateAthlete({
          id: editingAthlete.id,
          ...athleteWithModality,
        });

        if (error) {
          throw new Error(error.message || 'Erro ao atualizar atleta');
        }

        if (!data) {
          throw new Error('Atleta atualizado mas sem dados retornados');
        }

        athleteId = data.id;
        console.log('Atleta atualizado com sucesso:', data);
      } else {
        // Create new athlete
        const { data, error } = await AthleteService.createAthlete(athleteWithModality as CreateAthleteInput);

        if (error) {
          throw new Error(error.message || 'Erro ao criar atleta');
        }

        if (!data) {
          throw new Error('Atleta criado mas sem dados retornados');
        }

        athleteId = data.id;
        console.log('Atleta criado com sucesso:', data);
      }

      // Sync athlete profiles for all selected modalities
      // Note: syncProfilesForAthlete expects simple modality array, not modalityLevels
      // Level is managed per profile in athlete_profiles table
      const { error: profileError } = await AthleteProfileService.syncProfilesForAthlete(
        athleteId,
        modalities,
        {
          level: athleteData.level as AthleteLevel,
          anamnesis: athleteData.anamnesis,
          ftp: athleteData.ftp,
          pace_threshold: athleteData.pace_threshold,
          css: athleteData.swim_css,
        }
      );

      if (profileError) {
        console.error('Error syncing athlete profiles:', profileError);
        // Don't throw - athlete was saved successfully, profiles are secondary
      } else {
        console.log(`Synced ${modalities.length} athlete profiles`);
      }

      // Close modal and reset editing state (list auto-updates via real-time subscription)
      setAthleteModalOpen(false);
      setEditingAthlete(null);
    } catch (error) {
      console.error('Error saving athlete:', error);
      throw error; // Let modal handle error display
    }
  };

  // Handle edit athlete
  const handleEditAthlete = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setAthleteModalOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (athlete: Athlete) => {
    setAthleteToDelete(athlete);
    setDeleteModalOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!athleteToDelete) return;

    try {
      // Delete athlete profiles first (cascade safety)
      const { error: profileError } = await AthleteProfileService.deleteProfilesByAthleteId(
        athleteToDelete.id
      );

      if (profileError) {
        console.error('Error deleting athlete profiles:', profileError);
        // Continue anyway - profiles will be cascaded by DB
      }

      // Delete athlete
      const { error } = await AthleteService.deleteAthlete(athleteToDelete.id);

      if (error) {
        throw new Error(error.message || 'Erro ao excluir atleta');
      }

      console.log('Atleta excluído com sucesso:', athleteToDelete.id);

      // Close modal and reset state
      setDeleteModalOpen(false);
      setAthleteToDelete(null);

      // Explicit refresh as fallback (real-time subscription may have timing issues)
      await refresh();
    } catch (error) {
      console.error('Error deleting athlete:', error);
      throw error;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-ceramic-accent/20 border-t-ceramic-accent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-bold text-ceramic-text-primary">Carregando atletas...</p>
          <p className="text-sm text-ceramic-text-secondary">Conectando ao Supabase</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto ceramic-inset rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <p className="text-lg font-bold text-ceramic-error mb-2">Erro ao carregar atletas</p>
            <p className="text-sm text-ceramic-text-secondary">{error.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-ceramic-accent text-white rounded-lg font-medium hover:bg-ceramic-accent/90 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Flux Dashboard" />}>
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

        <div data-tour="flux-header" className="flex items-center gap-4 mb-6">
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

        {/* Quick Access Buttons - Flow Module Tools */}
        <div data-tour="flux-quick-tools" className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => navigate('/flux/templates')}
            className="ceramic-card p-3 hover:scale-[1.02] transition-all group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="ceramic-inset p-2 group-hover:bg-white/50 transition-colors">
                <span className="text-xl">📚</span>
              </div>
              <p className="text-xs font-bold text-ceramic-text-primary text-center">Biblioteca</p>
              {templates.length > 0 && (
                <span className="text-[10px] text-ceramic-text-secondary">
                  {templates.length} template{templates.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => navigate('/flux/crm')}
            className="ceramic-card p-3 hover:scale-[1.02] transition-all group"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="ceramic-inset p-2 group-hover:bg-white/50 transition-colors">
                <span className="text-xl">📋</span>
              </div>
              <p className="text-xs font-bold text-ceramic-text-primary text-center">Canvas</p>
              {allAthletes.length > 0 && (
                <span className="text-[10px] text-ceramic-text-secondary">
                  {allAthletes.length} atleta{allAthletes.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => navigate('/meu-treino')}
            className="ceramic-card p-3 hover:scale-[1.02] transition-all group col-span-2"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="ceramic-inset p-2 group-hover:bg-white/50 transition-colors">
                <span className="text-xl">🏃</span>
              </div>
              <p className="text-xs font-bold text-ceramic-text-primary text-center">Meus Treinos</p>
            </div>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mb-6">
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
        </div>

        {/* Filters Section */}
        <div data-tour="flux-filters" className="space-y-4 mb-4">
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
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar atleta por nome..."
            className="w-full ceramic-inset pl-11 pr-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
            >
              <span className="text-xs font-bold">✕</span>
            </button>
          )}
        </div>

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
            <button
              data-tour="flux-add-athlete"
              onClick={() => setAthleteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 ceramic-card hover:scale-105 transition-transform"
            >
              <Plus className="w-4 h-4 text-ceramic-text-primary" />
              <span className="text-sm font-bold text-ceramic-text-primary">Novo Atleta</span>
            </button>
          </div>
        </div>

        <div data-tour="flux-athletes-grid" className="grid gap-4">
          {filteredAthletes.slice(0, 20).map((athlete) => {
            const athleteAlerts: Alert[] = [];
            const athleteFeedbacks = feedbacksByAthlete[athlete.id] || [];

            return (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                recentFeedbacks={athleteFeedbacks}
                activeAlerts={athleteAlerts}
                adherenceRate={athlete.adherence_rate ?? 0}
                inviteStatus={athlete.invitation_email_status ?? 'none'}
                onClick={() => handleAthleteClick(athlete.id)}
                onWhatsAppClick={() => handleWhatsAppClick(athlete, athleteAlerts)}
                onEdit={() => handleEditAthlete(athlete)}
                onDelete={() => handleDeleteClick(athlete)}
                onSendInvite={() => handleSendInvite(athlete)}
                onCopyLink={() => {}}
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
                // Se não há filtros ativos, abre modal de criar atleta
                if (selectedModality === 'all' && selectedLevel === 'all') {
                  setAthleteModalOpen(true);
                } else {
                  // Se há filtros ativos, limpa os filtros
                  setSelectedModality('all');
                  setSelectedLevel('all');
                  setAdherenceSort('none');
                }
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

      {/* Athlete Form Drawer */}
      <AthleteFormDrawer
        mode={editingAthlete ? 'edit' : 'create'}
        initialData={editingAthlete || undefined}
        isOpen={athleteModalOpen}
        onClose={() => {
          setAthleteModalOpen(false);
          setEditingAthlete(null);
        }}
        onSave={handleSaveAthlete}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setAthleteToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Excluir Atleta"
        message={
          athleteToDelete
            ? `Tem certeza que deseja excluir ${athleteToDelete.name}? Esta ação não pode ser desfeita.`
            : ''
        }
      />

      {/* Invite Toast */}
      {inviteToast && (
        <div className={`fixed top-6 right-6 z-50 ceramic-card p-4 shadow-lg flex items-center gap-3 max-w-sm ${
          inviteToast.type === 'success' ? 'border-l-4 border-ceramic-success' : 'border-l-4 border-ceramic-error'
        }`}>
          {inviteToast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-ceramic-success flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 text-ceramic-error flex-shrink-0" />
          )}
          <p className="text-sm text-ceramic-text-primary">{inviteToast.message}</p>
        </div>
      )}

      {/* Activity Toast Notifications */}
      {notifications.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50 space-y-2 max-w-sm">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="ceramic-card p-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-right"
            >
              <div className="ceramic-inset p-1.5 bg-ceramic-success/10">
                <CheckCircle className="w-4 h-4 text-ceramic-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-ceramic-text-primary truncate">
                  {n.athleteName}
                </p>
                <p className="text-xs text-ceramic-text-secondary truncate">
                  completou {n.workoutName}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="p-1 hover:bg-ceramic-cool rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-ceramic-text-secondary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Module Agent */}
      <ModuleAgentFAB onClick={openAgent} accentBg={fluxAgentConfig.accentBg} label="Agente Flux" />
      <ModuleAgentChat
        isOpen={isAgentOpen}
        onClose={closeAgent}
        module={fluxAgentConfig.module}
        displayName={fluxAgentConfig.displayName}
        accentColor={fluxAgentConfig.accentColor}
        accentBg={fluxAgentConfig.accentBg}
        suggestedPrompts={fluxAgentConfig.suggestedPrompts}
        welcomeMessage={fluxAgentConfig.welcomeMessage}
        placeholder={fluxAgentConfig.placeholder}
      />
    </div>
    </ErrorBoundary>
  );
}
