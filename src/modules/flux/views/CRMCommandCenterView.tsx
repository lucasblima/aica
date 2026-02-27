/**
 * CRMCommandCenterView - Painel do Treinador (Coach Panel)
 *
 * Tela 5: Central de gestao com filtros visuais (modality/level/group tabs),
 * acoes em massa, sort por adesao, AthleteCard integrado, e Novo Atleta.
 * Substitui os dropdowns por pill tabs iguais ao FluxDashboard.
 *
 * Renamed from "Command Center" to "Painel do Treinador" (#460).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Send,
  Filter,
  X,
  MessageCircle,
  ExternalLink,
  Plus,
  Search,
  GraduationCap,
  Tag,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  DollarSign,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { AthleteService, CreateAthleteInput, getPaymentData } from '../services/athleteService';
import { AthleteProfileService } from '../services/athleteProfileService';
import { AutomationService } from '../services/automationService';
import { useAthletes } from '../hooks/useAthletes';
import { useFluxGamification } from '../hooks/useFluxGamification';
import { AthleteCard } from '../components/AthleteCard';
import { AthleteFormDrawer } from '../components/forms';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import {
  AthleteGroupManager,
  loadGroupData,
  getAthleteGroups,
} from '../components/coach/AthleteGroupManager';
import type {
  Athlete,
  TrainingModality,
  AthleteLevel,
  AthleteGroup,
  AthleteGroupData,
  ModalityLevel,
  Alert,
} from '../types/flux';
import type { WorkoutAutomation } from '../types/flow';
import {
  MODALITY_CONFIG,
  TRAINING_MODALITIES,
  LEVEL_LABELS,
  STATUS_CONFIG,
  getGroupColorClasses,
} from '../types/flux';

// ============================================================================
// Sort / Level types (mirroring FluxDashboard)
// ============================================================================

type SortOrder = 'none' | 'asc' | 'desc';

type LevelCategory = 'all' | 'iniciante' | 'intermediario' | 'avancado';

const LEVEL_CATEGORIES: {
  id: LevelCategory;
  label: string;
  icon: string;
  levels: AthleteLevel[];
}[] = [
  { id: 'all', label: 'Todos', icon: '\uD83C\uDFAF', levels: [] },
  { id: 'iniciante', label: 'Iniciante', icon: '\uD83C\uDF31', levels: ['iniciante'] },
  { id: 'intermediario', label: 'Interm\u00e9dio', icon: '\uD83C\uDF3F', levels: ['intermediario'] },
  { id: 'avancado', label: 'Avan\u00e7ado', icon: '\uD83C\uDF33', levels: ['avancado'] },
];

// ============================================================================
// Modality Tab component (same as FluxDashboard)
// ============================================================================

const ModalityTab: React.FC<{
  modality: TrainingModality | 'all';
  isSelected: boolean;
  count: number;
  onClick: () => void;
}> = ({ modality, isSelected, count, onClick }) => {
  const config = modality === 'all' ? null : MODALITY_CONFIG[modality];
  const label = modality === 'all' ? 'Todos' : config?.label || '';
  const icon = modality === 'all' ? '\uD83C\uDFAF' : config?.icon || '';

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
      <span
        className={`text-xs font-bold uppercase tracking-wider ${
          isSelected ? 'text-ceramic-text-primary' : 'text-ceramic-text-secondary'
        }`}
      >
        {label}
      </span>
      <span
        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
          isSelected
            ? 'bg-ceramic-info/20 text-ceramic-info'
            : 'bg-ceramic-cool text-ceramic-text-secondary'
        }`}
      >
        {count}
      </span>
    </button>
  );
};

// ============================================================================
// Bulk WhatsApp Modal
// ============================================================================

interface BulkWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  athletes: (Athlete & { adherence_rate?: number })[];
}

function BulkWhatsAppModal({ isOpen, onClose, athletes }: BulkWhatsAppModalProps) {
  const [messageTemplate, setMessageTemplate] = useState(
    'Oi {{nome}}, tudo bem? Passando para dar uma atualizacao sobre seus treinos desta semana. Como voce esta se sentindo? Algum feedback ou dificuldade? Estou aqui pra te ajudar!'
  );

  if (!isOpen) return null;

  const athletesWithPhone = athletes.filter((a) => a.phone);
  const athletesWithoutPhone = athletes.filter((a) => !a.phone);

  const buildWhatsAppUrl = (athlete: Athlete) => {
    const phone = athlete.phone.replace(/[+\s-]/g, '');
    const firstName = athlete.name.split(' ')[0];
    const personalizedMessage = messageTemplate.replace(/\{\{nome\}\}/g, firstName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(personalizedMessage)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[85vh] bg-ceramic-base rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ceramic-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ceramic-success/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-ceramic-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ceramic-text-primary">
                Mensagem em Massa
              </h2>
              <p className="text-xs text-ceramic-text-secondary">
                {athletesWithPhone.length} atleta
                {athletesWithPhone.length !== 1 ? 's' : ''} com telefone
                {athletesWithoutPhone.length > 0 && (
                  <span className="text-ceramic-warning">
                    {' '}
                    ({athletesWithoutPhone.length} sem telefone)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg ceramic-inset flex items-center justify-center hover:bg-white/50 transition-colors"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Message Template */}
        <div className="p-4 border-b border-ceramic-border">
          <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
            Modelo de Mensagem
          </label>
          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            className="w-full h-28 p-3 bg-ceramic-base rounded-xl border border-ceramic-border text-sm text-ceramic-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-ceramic-success/50"
            placeholder="Digite o modelo da mensagem..."
          />
          <p className="mt-1 text-xs text-ceramic-text-secondary">
            Use {'{{nome}}'} para inserir o primeiro nome do atleta automaticamente.
          </p>
        </div>

        {/* Athlete List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {athletesWithPhone.map((athlete) => {
            const modalityConfig = MODALITY_CONFIG[athlete.modality];
            return (
              <div
                key={athlete.id}
                className="flex items-center justify-between p-3 ceramic-card rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{modalityConfig?.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-ceramic-text-primary">
                      {athlete.name}
                    </p>
                    <p className="text-xs text-ceramic-text-secondary">{athlete.phone}</p>
                  </div>
                </div>

                <a
                  href={buildWhatsAppUrl(athlete)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-ceramic-success hover:bg-ceramic-success/90 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir WhatsApp
                </a>
              </div>
            );
          })}

          {athletesWithoutPhone.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-ceramic-text-secondary uppercase tracking-wider mb-2">
                Sem telefone cadastrado
              </p>
              {athletesWithoutPhone.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-3 ceramic-inset rounded-lg mb-2 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {MODALITY_CONFIG[athlete.modality]?.icon}
                    </span>
                    <p className="text-sm text-ceramic-text-secondary">{athlete.name}</p>
                  </div>
                  <span className="text-xs text-ceramic-text-secondary">Sem telefone</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ceramic-border flex items-center justify-between">
          <p className="text-xs text-ceramic-text-secondary">
            Cada link abre o WhatsApp individualmente
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main View
// ============================================================================

export default function CRMCommandCenterView() {
  const navigate = useNavigate();

  // Use the real-time hook for athletes (same as FluxDashboard)
  const { athletes: allAthletes, isLoading, error, refresh } = useAthletes();

  // Automations (separate fetch, not real-time)
  const [automations, setAutomations] = useState<WorkoutAutomation[]>([]);

  // Gamification
  const { trackAthleteCreated } = useFluxGamification();

  // Selection state
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Filter states (pill-based, not dropdown)
  const [selectedModality, setSelectedModality] = useState<TrainingModality | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<LevelCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [adherenceSort, setAdherenceSort] = useState<SortOrder>('none');

  // Group filter states
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [coachUserId, setCoachUserId] = useState('');
  const [groupData, setGroupData] = useState<AthleteGroupData>({
    groups: [],
    assignments: {},
  });

  // Athlete form modal state
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<Athlete | null>(null);

  // Batch payment state (#463)
  const [batchPaymentLoading, setBatchPaymentLoading] = useState(false);

  // Load automations
  useEffect(() => {
    AutomationService.getActiveAutomations().then((res) => {
      if (res.data) setAutomations(res.data);
    });
  }, []);

  // Load coach user ID and group data
  useEffect(() => {
    const loadCoachData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCoachUserId(user.id);
        setGroupData(loadGroupData(user.id));
      }
    };
    loadCoachData();
  }, []);

  // ---- Modality counts (using practiced_modalities) ----
  const modalityCounts = useMemo(() => {
    const counts: Record<TrainingModality, number> = {
      swimming: 0,
      running: 0,
      cycling: 0,
      strength: 0,
      walking: 0,
    };

    for (const athlete of allAthletes) {
      const modalities = athlete.practiced_modalities?.length
        ? athlete.practiced_modalities
        : [athlete.modality];
      for (const mod of modalities) {
        if (counts[mod as TrainingModality] !== undefined) {
          counts[mod as TrainingModality]++;
        }
      }
    }

    return counts;
  }, [allAthletes]);

  // ---- Level counts ----
  const levelCounts = useMemo(() => {
    const counts: Record<LevelCategory, number> = {
      all: allAthletes.length,
      iniciante: 0,
      intermediario: 0,
      avancado: 0,
    };

    for (const athlete of allAthletes) {
      if (athlete.level === 'iniciante') counts.iniciante++;
      else if (athlete.level === 'intermediario') counts.intermediario++;
      else if (athlete.level === 'avancado') counts.avancado++;
    }

    return counts;
  }, [allAthletes]);

  // ---- Filtered + sorted athletes ----
  const filteredAthletes = useMemo(() => {
    let result = [...allAthletes];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }

    // Modality (uses practiced_modalities array, fallback to primary)
    if (selectedModality !== 'all') {
      result = result.filter((a) =>
        (a.practiced_modalities?.length ? a.practiced_modalities : [a.modality]).includes(
          selectedModality
        )
      );
    }

    // Level
    if (selectedLevel !== 'all') {
      const levelCategory = LEVEL_CATEGORIES.find((c) => c.id === selectedLevel);
      if (levelCategory) {
        result = result.filter((a) => levelCategory.levels.includes(a.level));
      }
    }

    // Group (OR logic)
    if (selectedGroupIds.length > 0) {
      result = result.filter((a) => {
        const athleteGroupIds = groupData.assignments[a.id] || [];
        return selectedGroupIds.some((gid) => athleteGroupIds.includes(gid));
      });
    }

    // Sort by adherence
    if (adherenceSort !== 'none') {
      result.sort((a, b) => {
        const rateA = a.adherence_rate ?? 0;
        const rateB = b.adherence_rate ?? 0;
        return adherenceSort === 'asc' ? rateA - rateB : rateB - rateA;
      });
    }

    return result;
  }, [
    allAthletes,
    searchQuery,
    selectedModality,
    selectedLevel,
    selectedGroupIds,
    groupData,
    adherenceSort,
  ]);

  // ---- Helpers ----
  const toggleAdherenceSort = () => {
    setAdherenceSort((current) => {
      if (current === 'none') return 'desc';
      if (current === 'desc') return 'asc';
      return 'none';
    });
  };

  const toggleAthlete = (athleteId: string) => {
    const newSelected = new Set(selectedAthletes);
    if (newSelected.has(athleteId)) {
      newSelected.delete(athleteId);
    } else {
      newSelected.add(athleteId);
    }
    setSelectedAthletes(newSelected);
  };

  const selectAll = () => {
    setSelectedAthletes(new Set(filteredAthletes.map((a) => a.id)));
  };

  const clearSelection = () => {
    setSelectedAthletes(new Set());
  };

  const selectedAthletesList = useMemo(
    () => allAthletes.filter((a) => selectedAthletes.has(a.id)),
    [allAthletes, selectedAthletes]
  );

  const avgConsistency = useMemo(() => {
    const active = filteredAthletes.filter((a) => a.status === 'active');
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, a) => acc + (a.adherence_rate ?? 0), 0);
    return Math.round(sum / active.length);
  }, [filteredAthletes]);

  // Payment summary (#463)
  const paymentSummary = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    for (const a of allAthletes) {
      const pd = getPaymentData(a);
      if (pd.payment_status === 'paid') paid++;
      else if (pd.payment_status === 'overdue') overdue++;
      else pending++;
    }
    return { paid, pending, overdue, total: allAthletes.length };
  }, [allAthletes]);

  const hasActiveFilters =
    selectedModality !== 'all' ||
    selectedLevel !== 'all' ||
    selectedGroupIds.length > 0;

  const clearFilters = () => {
    setSelectedModality('all');
    setSelectedLevel('all');
    setSelectedGroupIds([]);
    setAdherenceSort('none');
  };

  // ---- Athlete CRUD handlers (same pattern as FluxDashboard) ----
  const handleSaveAthlete = async (
    athleteData: Partial<Athlete> & { modalityLevels?: ModalityLevel[] }
  ) => {
    try {
      const modalityLevels = athleteData.modalityLevels || [];
      if (modalityLevels.length === 0) {
        throw new Error('Selecione pelo menos uma modalidade');
      }

      const modalities = modalityLevels.map((ml) => ml.modality);
      const primaryModality = modalities[0];
      const { modalityLevels: _, ...athletePayload } = athleteData;
      const athleteWithModality = { ...athletePayload, modality: primaryModality };

      let athleteId: string;

      if (editingAthlete) {
        const { data, error } = await AthleteService.updateAthlete({
          id: editingAthlete.id,
          ...athleteWithModality,
        });
        if (error) throw new Error(error.message || 'Erro ao atualizar atleta');
        if (!data) throw new Error('Atleta atualizado mas sem dados retornados');
        athleteId = data.id;
      } else {
        const { data, error } = await AthleteService.createAthlete(
          athleteWithModality as CreateAthleteInput
        );
        if (error) throw new Error(error.message || 'Erro ao criar atleta');
        if (!data) throw new Error('Atleta criado mas sem dados retornados');
        athleteId = data.id;
        trackAthleteCreated().catch(() => {});
      }

      // Sync athlete profiles
      const { error: profileError } = await AthleteProfileService.syncProfilesForAthlete(
        athleteId,
        modalities,
        {
          level: athleteData.level as AthleteLevel,
          anamnesis: athleteData.anamnesis,
          ftp: athleteData.ftp,
          pace_threshold: athleteData.pace_threshold,
          css: athleteData.swim_css,
          modalityLevels: modalityLevels as Array<{
            modality: TrainingModality;
            level: AthleteLevel;
          }>,
        }
      );

      if (profileError) {
        console.error('Error syncing athlete profiles:', profileError);
      }

      setAthleteModalOpen(false);
      setEditingAthlete(null);
    } catch (err) {
      console.error('Error saving athlete:', err);
      throw err;
    }
  };

  const handleEditAthlete = (athlete: Athlete) => {
    setEditingAthlete(athlete);
    setAthleteModalOpen(true);
  };

  const handleDeleteClick = (athlete: Athlete) => {
    setAthleteToDelete(athlete);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!athleteToDelete) return;
    try {
      const { error: profileError } =
        await AthleteProfileService.deleteProfilesByAthleteId(athleteToDelete.id);
      if (profileError) {
        console.error('Error deleting athlete profiles:', profileError);
      }

      const { error } = await AthleteService.deleteAthlete(athleteToDelete.id);
      if (error) throw new Error(error.message || 'Erro ao excluir atleta');

      setDeleteModalOpen(false);
      setAthleteToDelete(null);
      await refresh();
    } catch (err) {
      console.error('Error deleting athlete:', err);
      throw err;
    }
  };

  const handleSendInvite = async (athlete: Athlete) => {
    if (!athlete.email) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const coachName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      'Seu Coach';
    await AthleteService.sendInvite({
      athleteId: athlete.id,
      athleteName: athlete.name,
      athleteEmail: athlete.email,
      coachName,
    });
  };

  // ---- Batch payment handler (#463) ----
  const handleBatchMarkPaid = async () => {
    if (selectedAthletes.size === 0) return;
    setBatchPaymentLoading(true);
    try {
      const { success, error: batchError } = await AthleteService.batchUpdatePaymentStatus(
        Array.from(selectedAthletes),
        'paid'
      );
      if (batchError) {
        console.error('Batch payment error:', batchError);
      }
      if (success) {
        clearSelection();
        await refresh();
      }
    } catch (err) {
      console.error('Batch payment error:', err);
    } finally {
      setBatchPaymentLoading(false);
    }
  };

  // ---- Loading / Error states ----
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <div className="ceramic-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-ceramic-accent/20 border-t-ceramic-accent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-bold text-ceramic-text-primary">
            Carregando atletas...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 text-center space-y-4 max-w-md">
          <p className="text-lg font-bold text-ceramic-error mb-2">
            Erro ao carregar atletas
          </p>
          <p className="text-sm text-ceramic-text-secondary">{error.message}</p>
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
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      {/* ================================================================ */}
      {/* Header Area */}
      {/* ================================================================ */}
      <div className="pt-8 px-6 pb-6 border-b border-ceramic-text-secondary/10">
        <button
          onClick={() => navigate('/flux')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-ceramic-text-primary mb-2">
              Painel do Treinador
            </h1>
            <p className="text-sm text-ceramic-text-secondary">
              {filteredAthletes.length} atleta
              {filteredAthletes.length !== 1 ? 's' : ''} &bull;{' '}
              {selectedAthletes.size} selecionado
              {selectedAthletes.size !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedAthletes.size > 0 && (
              <>
                {/* Batch mark paid — #463 */}
                <button
                  onClick={handleBatchMarkPaid}
                  disabled={batchPaymentLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-ceramic-info text-white rounded-lg hover:bg-ceramic-info/90 transition-colors disabled:opacity-50"
                >
                  {batchPaymentLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  <span className="font-medium">
                    Marcar Pago ({selectedAthletes.size})
                  </span>
                </button>

                <button
                  onClick={() => setBulkModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-ceramic-success text-white rounded-lg hover:bg-ceramic-success/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span className="font-medium">
                    Enviar Mensagem ({selectedAthletes.size})
                  </span>
                </button>
              </>
            )}

            {/* Novo Atleta Button */}
            <button
              onClick={() => {
                setEditingAthlete(null);
                setAthleteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-ceramic-accent text-white rounded-lg hover:bg-ceramic-accent/90 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Atleta</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">
              Total Atletas
            </p>
            <p className="text-2xl font-bold text-ceramic-text-primary">
              {filteredAthletes.length}
            </p>
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">
              Consistencia Media
            </p>
            <p className="text-2xl font-bold text-ceramic-text-primary">
              {avgConsistency}%
            </p>
          </div>
          {/* Payment summary — #463 */}
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">
              Pagamentos
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-ceramic-success">
                {paymentSummary.paid}
              </span>
              <span className="text-xs text-ceramic-text-secondary">
                / {paymentSummary.total}
              </span>
            </div>
            {(paymentSummary.pending > 0 || paymentSummary.overdue > 0) && (
              <div className="flex items-center gap-2 mt-1">
                {paymentSummary.pending > 0 && (
                  <span className="text-[10px] font-bold text-ceramic-warning">
                    {paymentSummary.pending} pend.
                  </span>
                )}
                {paymentSummary.overdue > 0 && (
                  <span className="text-[10px] font-bold text-ceramic-error">
                    {paymentSummary.overdue} atras.
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="ceramic-card p-4">
            <p className="text-xs text-ceramic-text-secondary uppercase mb-1">
              Selecionados
            </p>
            <p className="text-2xl font-bold text-ceramic-accent">
              {selectedAthletes.size}
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Filters Section — pill tabs (replaces dropdowns) */}
        {/* ============================================================== */}
        <div className="space-y-4">
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
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      selectedLevel === category.id
                        ? 'text-ceramic-text-primary'
                        : 'text-ceramic-text-secondary'
                    }`}
                  >
                    {category.label}
                  </span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      selectedLevel === category.id
                        ? 'bg-ceramic-success/20 text-ceramic-success'
                        : 'bg-ceramic-cool text-ceramic-text-secondary'
                    }`}
                  >
                    {levelCounts[category.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Group Filter Pills */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-ceramic-text-secondary" />
                <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Grupos
                </span>
              </div>
              <button
                onClick={() => setGroupManagerOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-ceramic-cool transition-colors"
                title="Gerenciar grupos"
              >
                <Settings className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Gerenciar
                </span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {groupData.groups.length === 0 ? (
                <button
                  onClick={() => setGroupManagerOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                  <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Criar Grupo
                  </span>
                </button>
              ) : (
                <>
                  {/* "Todos" pill to clear group filter */}
                  <button
                    onClick={() => setSelectedGroupIds([])}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      selectedGroupIds.length === 0
                        ? 'ceramic-card bg-ceramic-base shadow-md'
                        : 'ceramic-inset hover:bg-white/50'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-ceramic-text-primary">
                      Todos
                    </span>
                  </button>

                  {/* Group pills */}
                  {groupData.groups.map((group) => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    const colors = getGroupColorClasses(group.color);
                    const memberCount = (
                      Object.values(groupData.assignments) as string[][]
                    ).filter((ids) => ids.includes(group.id)).length;

                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedGroupIds((prev) =>
                            prev.includes(group.id)
                              ? prev.filter((id) => id !== group.id)
                              : [...prev, group.id]
                          );
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          isSelected
                            ? 'ceramic-card bg-ceramic-base shadow-md ring-1 ring-ceramic-accent/30'
                            : 'ceramic-inset hover:bg-white/50'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${colors.bg} border border-black/10`}
                        />
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            isSelected
                              ? 'text-ceramic-text-primary'
                              : 'text-ceramic-text-secondary'
                          }`}
                        >
                          {group.name}
                        </span>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            isSelected
                              ? `${colors.bg} ${colors.text}`
                              : 'bg-ceramic-cool text-ceramic-text-secondary'
                          }`}
                        >
                          {memberCount}
                        </span>
                      </button>
                    );
                  })}

                  {/* Quick add group */}
                  <button
                    onClick={() => setGroupManagerOpen(true)}
                    className="flex items-center gap-1 px-2 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-all"
                    title="Adicionar grupo"
                  >
                    <Plus className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ceramic-error hover:text-ceramic-error/80 transition-colors"
            >
              <X className="w-3 h-3" />
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Content Area */}
      {/* ================================================================ */}
      <div className="px-6 py-6 space-y-4">
        {/* Search Bar + Select All + Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar atleta por nome..."
              className="w-full ceramic-inset pl-11 pr-10 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort by Adherence */}
          <button
            onClick={toggleAdherenceSort}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap ${
              adherenceSort !== 'none'
                ? 'ceramic-card bg-ceramic-base shadow-md'
                : 'ceramic-inset hover:bg-white/50'
            }`}
            title={
              adherenceSort === 'none'
                ? 'Ordenar por adesao'
                : adherenceSort === 'desc'
                ? 'Maior adesao primeiro'
                : 'Menor adesao primeiro'
            }
          >
            {adherenceSort === 'none' && (
              <ArrowUpDown className="w-4 h-4 text-ceramic-text-secondary" />
            )}
            {adherenceSort === 'desc' && (
              <ArrowDown className="w-4 h-4 text-ceramic-success" />
            )}
            {adherenceSort === 'asc' && (
              <ArrowUp className="w-4 h-4 text-ceramic-error" />
            )}
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                adherenceSort !== 'none'
                  ? 'text-ceramic-text-primary'
                  : 'text-ceramic-text-secondary'
              }`}
            >
              Adesao
            </span>
          </button>

          {/* Select / Deselect All */}
          <button
            onClick={selectedAthletes.size === filteredAthletes.length && filteredAthletes.length > 0 ? clearSelection : selectAll}
            className="px-4 py-2.5 ceramic-card hover:bg-white/50 rounded-lg text-xs font-bold text-ceramic-text-primary uppercase tracking-wider whitespace-nowrap"
          >
            {selectedAthletes.size === filteredAthletes.length && filteredAthletes.length > 0
              ? 'Limpar Selecao'
              : 'Selecionar Todos'}
          </button>
        </div>

        {/* Athlete Grid */}
        {filteredAthletes.length === 0 ? (
          <div className="ceramic-inset p-12 text-center space-y-4 rounded-xl">
            <div className="w-16 h-16 mx-auto ceramic-card flex items-center justify-center">
              <Users className="w-8 h-8 text-ceramic-text-secondary" />
            </div>
            <div>
              <p className="text-lg font-bold text-ceramic-text-primary mb-2">
                {hasActiveFilters || searchQuery
                  ? 'Nenhum atleta encontrado'
                  : 'Nenhum atleta cadastrado'}
              </p>
              <p className="text-sm text-ceramic-text-secondary font-light">
                {hasActiveFilters || searchQuery
                  ? 'Ajuste os filtros ou a busca para encontrar atletas'
                  : 'Comece adicionando seu primeiro atleta'}
              </p>
            </div>
            <button
              onClick={() => {
                if (hasActiveFilters || searchQuery) {
                  clearFilters();
                  setSearchQuery('');
                } else {
                  setEditingAthlete(null);
                  setAthleteModalOpen(true);
                }
              }}
              className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              {hasActiveFilters || searchQuery
                ? 'Limpar Filtros'
                : 'Adicionar Primeiro Atleta'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAthletes.map((athlete) => {
              const isSelected = selectedAthletes.has(athlete.id);
              const athleteGroupTags = getAthleteGroups(groupData, athlete.id);

              return (
                <div
                  key={athlete.id}
                  className={`relative transition-all ${
                    isSelected ? 'ring-2 ring-ceramic-accent rounded-xl' : ''
                  }`}
                >
                  {/* Multi-select checkbox overlay */}
                  <div className="absolute top-3 left-3 z-20">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAthlete(athlete.id)}
                      className="w-5 h-5 rounded cursor-pointer accent-ceramic-accent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Payment status badge — #463, repositioned below status badge (#530) */}
                  {(() => {
                    const pd = getPaymentData(athlete);
                    return (
                      <div className="absolute top-12 right-3 z-20">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pd.payment_status === 'paid'
                              ? 'bg-ceramic-success/15 text-ceramic-success'
                              : pd.payment_status === 'overdue'
                                ? 'bg-ceramic-error/15 text-ceramic-error'
                                : 'bg-ceramic-warning/15 text-ceramic-warning'
                          }`}
                        >
                          <DollarSign className="w-2.5 h-2.5" />
                          {pd.payment_status === 'paid'
                            ? 'Pago'
                            : pd.payment_status === 'overdue'
                              ? 'Atrasado'
                              : 'Pendente'}
                        </span>
                      </div>
                    );
                  })()}

                  <AthleteCard
                    athlete={athlete}
                    activeAlerts={[]}
                    adherenceRate={athlete.adherence_rate ?? 0}
                    inviteStatus={athlete.invitation_email_status ?? 'none'}
                    onClick={() => navigate(`/flux/athlete/${athlete.id}`)}
                    onEdit={() => handleEditAthlete(athlete)}
                    onDelete={() => handleDeleteClick(athlete)}
                    onSendInvite={() => handleSendInvite(athlete)}
                    onCopyLink={() => {}}
                    groupTags={athleteGroupTags}
                  />

                  {/* CRM extra info: all practiced modalities + level */}
                  {athlete.practiced_modalities && athlete.practiced_modalities.length > 1 && (
                    <div className="px-4 py-2 bg-ceramic-cool/50 border-t border-ceramic-border flex items-center gap-1.5 flex-wrap rounded-b-xl -mt-1">
                      <span className="text-[10px] font-bold text-ceramic-text-secondary uppercase tracking-wider mr-1">
                        Modalidades:
                      </span>
                      {athlete.practiced_modalities.map((mod) => {
                        const config = MODALITY_CONFIG[mod as TrainingModality];
                        return config ? (
                          <span
                            key={mod}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-ceramic-base rounded text-[10px] font-medium text-ceramic-text-primary"
                            title={config.label}
                          >
                            {config.icon} {config.label}
                          </span>
                        ) : null;
                      })}
                      <span className="text-[10px] text-ceramic-text-secondary ml-1">
                        &bull; {LEVEL_LABELS[athlete.level]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Modals */}
      {/* ================================================================ */}

      {/* Bulk WhatsApp Modal */}
      <BulkWhatsAppModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        athletes={selectedAthletesList}
      />

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
            ? `Tem certeza que deseja excluir ${athleteToDelete.name}? Esta acao nao pode ser desfeita.`
            : ''
        }
      />

      {/* Athlete Group Manager Modal */}
      <AthleteGroupManager
        isOpen={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        coachUserId={coachUserId}
        athletes={allAthletes}
        groupData={groupData}
        onGroupDataChange={(updated) => setGroupData(updated)}
      />
    </div>
  );
}
