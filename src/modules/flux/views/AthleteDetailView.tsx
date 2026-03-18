/**
 * AthleteDetailView - Single athlete 12-week timeline
 *
 * Displays athlete profile, progression bar, workout history, feedbacks, and alerts.
 * Contextual descent view with back button (no global nav).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFlux } from '../context/FluxContext';
import { AthleteService } from '../services/athleteService';
import { ParQService } from '../services/parqService';
import { MicrocycleService } from '../services/microcycleService';
import { useAthleteDocuments } from '../hooks/useAthleteDocuments';
import { supabase } from '@/services/supabaseClient';
import type { Athlete, Alert } from '../types';
import { MODALITY_CONFIG, TRAINING_MODALITIES } from '../types';
import type { ParQStatus, ParQResponse } from '../types/parq';
import type { SlotFeedback } from '../components/AthleteCard';
import { LevelBadge } from '../components/LevelBadge';
import { AlertBadge } from '../components/AlertBadge';
import { ConnectionStatusDot } from '../components/ConnectionStatusDot';
import { ParQCoachView } from '../components/parq/ParQCoachView';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  FileText,
  Activity,
  Edit,
  Loader2,
  Scale,
  Ruler,
  Calculator,
  Save,
  CheckCircle,
  Lock,
  Unlock,
  DollarSign,
  Upload,
} from 'lucide-react';
import { PaymentRuler } from '../components/athlete/PaymentRuler';
import { FeedbackRadarChart } from '../components/athlete/FeedbackRadarChart';
import { StressFatigueGauges } from '../components/athlete/StressFatigueGauges';
import { getPaymentData } from '../services/athleteService';
import type { AthletePaymentData } from '../services/athleteService';
import type { QuestionnaireData, FeedbackEntryRow } from '../hooks/useAthleteFeedback';

const AVATAR_COLORS = [
  'bg-rose-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-violet-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
import { ErrorBoundary, ModuleErrorFallback } from '@/components/ui/ErrorBoundary';
import {
  ShieldCheck,
  Heart,
  ClipboardCheck,
  HeartPulse,
} from 'lucide-react';

export default function AthleteDetailView() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();
  const { actions } = useFlux();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [parqStatus, setParqStatus] = useState<ParQStatus | null>(null);
  const [latestParQ, setLatestParQ] = useState<ParQResponse | null>(null);
  const [parqLoading, setParqLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<SlotFeedback[]>([]);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntryRow[]>([]);
  const [aggregatedQuestionnaire, setAggregatedQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [activeMicrocycle, setActiveMicrocycle] = useState<{ id: string; status: string; name?: string } | null>(null);
  const [activatingMicrocycle, setActivatingMicrocycle] = useState(false);
  const alerts: Alert[] = [];


  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Athlete profile calculator state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    weight_kg: '',
    height_cm: '',
    birth_date: '',
    practiced_modalities: [] as string[],
    practice_duration_months: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Block/unblock athlete state
  const [blockingAthlete, setBlockingAthlete] = useState(false);

  // PAR-Q section collapse state (#678)
  const [parqExpanded, setParqExpanded] = useState(false);

  // Liberacao and Cardio document expand state (#928)
  const [liberacaoExpanded, setLiberacaoExpanded] = useState(false);
  const [cardioExpanded, setCardioExpanded] = useState(false);

  // Payment / Financial state (#463)
  const [financeOpen, setFinanceOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_due_day: '',
    monthly_fee: '',
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  const docs = useAthleteDocuments({ athleteId: athleteId || '' });

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadAthlete = async () => {
      try {
        const { data, error } = await AthleteService.getAthleteById(athleteId);
        if (!cancelled && data) {
          setAthlete(data);
        }
        if (error) console.error('Error loading athlete:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAthlete();
    return () => { cancelled = true; };
  }, [athleteId]);

  // Populate profile form when athlete loads
  useEffect(() => {
    if (!athlete) return;
    setProfileForm({
      weight_kg: athlete.weight_kg?.toString() || '',
      height_cm: athlete.height_cm?.toString() || '',
      birth_date: athlete.birth_date || '',
      practiced_modalities: athlete.practiced_modalities || [],
      practice_duration_months: athlete.practice_duration_months?.toString() || '',
    });
  }, [athlete]);

  // Populate payment form when athlete loads (#463)
  useEffect(() => {
    if (!athlete) return;
    const pd = getPaymentData(athlete);
    setPaymentForm({
      payment_due_day: pd.payment_due_day?.toString() || '',
      monthly_fee: pd.monthly_fee?.toString() || '',
    });
  }, [athlete]);

  // Load PAR-Q data when athlete has PAR-Q enabled
  useEffect(() => {
    if (!athleteId || !athlete?.allow_parq_onboarding) return;
    let cancelled = false;

    const loadParQ = async () => {
      setParqLoading(true);
      try {
        const [statusResult, responsesResult] = await Promise.all([
          ParQService.getParQStatus(athleteId),
          ParQService.getParQResponsesByAthlete(athleteId),
        ]);
        if (cancelled) return;
        if (statusResult.data) setParqStatus(statusResult.data);
        if (responsesResult.data && responsesResult.data.length > 0) {
          setLatestParQ(responsesResult.data[0]);
        }
      } finally {
        if (!cancelled) setParqLoading(false);
      }
    };
    loadParQ();
    return () => { cancelled = true; };
  }, [athleteId, athlete?.allow_parq_onboarding]);

  // Load recent feedbacks from workout_slots (legacy)
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    const loadFeedbacks = async () => {
      const { data, error } = await supabase
        .from('workout_slots')
        .select('id, name, athlete_feedback, completed_at, rpe, microcycles!inner(athlete_id)')
        .eq('microcycles.athlete_id', athleteId)
        .not('athlete_feedback', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (cancelled || error || !data) return;
      setFeedbacks(data as SlotFeedback[]);
    };

    loadFeedbacks();
    return () => { cancelled = true; };
  }, [athleteId]);

  // Mark feedback as read when coach views athlete detail
  useEffect(() => {
    if (!athleteId) return;
    const markRead = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('mark_feedback_read', {
          p_coach_user_id: user.id,
          p_athlete_id: athleteId,
        });
      }
    };
    markRead();
  }, [athleteId]);

  // Load structured feedback entries + compute aggregated radar (#781)
  useEffect(() => {
    if (!activeMicrocycle?.id) return;
    let cancelled = false;

    const loadFeedbackEntries = async () => {
      const { data, error } = await supabase
        .from('athlete_feedback_entries')
        .select('*')
        .eq('microcycle_id', activeMicrocycle.id)
        .order('created_at', { ascending: false });

      if (cancelled || error || !data) return;
      const rows = data as FeedbackEntryRow[];
      setFeedbackEntries(rows);

      // Compute aggregated questionnaire averages
      const KEYS: (keyof QuestionnaireData)[] = [
        'volume_adequate', 'volume_completed', 'intensity_adequate', 'intensity_completed',
        'fatigue', 'stress', 'nutrition', 'sleep',
      ];
      const withQ = rows.filter((r) => {
        if (!r.questionnaire) return false;
        return KEYS.filter((k) => (r.questionnaire as QuestionnaireData)?.[k] != null).length >= 3;
      });
      if (withQ.length === 0) { setAggregatedQuestionnaire(null); return; }

      const sums: Record<string, { total: number; count: number }> = {};
      for (const row of withQ) {
        for (const key of KEYS) {
          const val = (row.questionnaire as QuestionnaireData)?.[key];
          if (val != null) {
            if (!sums[key]) sums[key] = { total: 0, count: 0 };
            sums[key].total += val;
            sums[key].count += 1;
          }
        }
      }
      const result: QuestionnaireData = {};
      let populated = 0;
      for (const key of KEYS) {
        if (sums[key] && sums[key].count > 0) {
          (result as Record<string, number>)[key] = Math.round((sums[key].total / sums[key].count) * 10) / 10;
          populated++;
        }
      }
      setAggregatedQuestionnaire(populated >= 3 ? result : null);
    };

    loadFeedbackEntries();
    return () => { cancelled = true; };
  }, [activeMicrocycle?.id]);

  // Load active/draft microcycle for "Liberar Treino" button (#381)
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    MicrocycleService.getActiveMicrocycle(athleteId).then(({ data }) => {
      if (!cancelled && data) {
        setActiveMicrocycle({ id: data.id, status: data.status, name: data.name });
      }
    });

    return () => { cancelled = true; };
  }, [athleteId]);


  // Athlete profile calculator: BMI
  const calcBMI = () => {
    const w = parseFloat(profileForm.weight_kg);
    const h = parseFloat(profileForm.height_cm);
    if (!w || !h || h === 0) return null;
    return (w / Math.pow(h / 100, 2)).toFixed(1);
  };

  const calcAge = () => {
    if (!profileForm.birth_date) return null;
    const birth = new Date(profileForm.birth_date);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const getBmiCategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'text-ceramic-warning' };
    if (bmi < 25) return { label: 'Normal', color: 'text-ceramic-success' };
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-ceramic-warning' };
    return { label: 'Obesidade', color: 'text-ceramic-error' };
  };

  const handleProfileSave = async () => {
    if (!athleteId) return;
    setProfileSaving(true);
    try {
      const { error } = await AthleteService.updateAthlete({
        id: athleteId,
        weight_kg: profileForm.weight_kg ? parseFloat(profileForm.weight_kg) : undefined,
        height_cm: profileForm.height_cm ? parseFloat(profileForm.height_cm) : undefined,
        birth_date: profileForm.birth_date || undefined,
        practiced_modalities: profileForm.practiced_modalities,
        practice_duration_months: profileForm.practice_duration_months
          ? parseInt(profileForm.practice_duration_months, 10)
          : undefined,
      });
      if (error) {
        console.error('Error saving profile:', error);
      } else {
        // Reload athlete data
        const { data } = await AthleteService.getAthleteById(athleteId);
        if (data) setAthlete(data);
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleModalityToggle = (mod: string) => {
    setProfileForm(prev => ({
      ...prev,
      practiced_modalities: prev.practiced_modalities.includes(mod)
        ? prev.practiced_modalities.filter(m => m !== mod)
        : [...prev.practiced_modalities, mod],
    }));
  };

  // Handle inline edit toggle
  const handleStartEdit = () => {
    if (!athlete) return;
    setEditForm({ name: athlete.name, email: athlete.email || '', phone: athlete.phone || '' });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!athleteId) return;
    setEditSaving(true);
    try {
      const { data, error } = await AthleteService.updateAthlete({
        id: athleteId,
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim(),
      });
      if (error) {
        console.error('Error saving athlete:', error);
      } else if (data) {
        setAthlete(data);
        setIsEditing(false);
      }
    } finally {
      setEditSaving(false);
    }
  };

  // Handle block/unblock athlete
  const handleToggleBlock = async () => {
    if (!athleteId || !athlete) return;
    setBlockingAthlete(true);
    try {
      const newStatus = athlete.status === 'paused' ? 'active' : 'paused';
      const { data, error } = await AthleteService.updateStatus(athleteId, newStatus);
      if (error) {
        console.error('Error toggling athlete block status:', error);
      } else if (data) {
        setAthlete(data);
      }
    } finally {
      setBlockingAthlete(false);
    }
  };

  // Handle payment save (#463)
  const handlePaymentSave = async () => {
    if (!athleteId || !athlete) return;
    setPaymentSaving(true);
    try {
      const currentPayment = getPaymentData(athlete);
      const paymentData: AthletePaymentData = {
        payment_due_day: paymentForm.payment_due_day
          ? parseInt(paymentForm.payment_due_day, 10)
          : undefined,
        monthly_fee: paymentForm.monthly_fee
          ? parseFloat(paymentForm.monthly_fee)
          : undefined,
        payment_status: currentPayment.payment_status,
        last_payment_date: currentPayment.last_payment_date,
      };
      const { error } = await AthleteService.updatePaymentInfo(athleteId, paymentData);
      if (error) {
        console.error('Error saving payment info:', error);
      } else {
        const { data } = await AthleteService.getAthleteById(athleteId);
        if (data) setAthlete(data);
      }
    } finally {
      setPaymentSaving(false);
    }
  };

  // Handle payment status toggle (#463)
  const handleTogglePaymentStatus = async () => {
    if (!athleteId || !athlete) return;
    setPaymentSaving(true);
    try {
      const currentPayment = getPaymentData(athlete);
      const newStatus: 'paid' | 'pending' =
        currentPayment.payment_status === 'paid' ? 'pending' : 'paid';
      const paymentData: AthletePaymentData = {
        ...currentPayment,
        payment_status: newStatus,
        last_payment_date:
          newStatus === 'paid'
            ? new Date().toISOString().split('T')[0]
            : currentPayment.last_payment_date,
      };
      const { error } = await AthleteService.updatePaymentInfo(athleteId, paymentData);
      if (error) {
        console.error('Error toggling payment status:', error);
      } else {
        const { data } = await AthleteService.getAthleteById(athleteId);
        if (data) setAthlete(data);
      }
    } finally {
      setPaymentSaving(false);
    }
  };

  // Handle back
  const handleBack = () => {
    actions.viewDashboard();
    navigate('/flux');
  };

  // Document upload handler for Liberacao / Cardio sections (#928)
  const handleDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: 'liberacao_atividade' | 'exame_cardiologico',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const titleMap = {
      liberacao_atividade: 'Atestado de Liberacao',
      exame_cardiologico: 'Exame Cardiologico',
    };

    await docs.uploadDocument({
      file,
      document_type: documentType,
      title: titleMap[documentType],
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <Loader2 className="w-8 h-8 text-ceramic-text-secondary animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Carregando atleta...</p>
      </div>
    );
  }

  // Not found
  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-ceramic-base">
        <p className="text-lg font-bold text-ceramic-text-primary mb-4">
          Atleta não encontrado
        </p>
        <button
          onClick={handleBack}
          className="px-6 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Detalhes do Atleta" />}>
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pt-8 px-6 pb-6">
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <div className="w-8 h-8 ceramic-inset flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>


        {/* Athlete Profile Card */}
        <div className="ceramic-card p-6 space-y-4" title="Informações de contato e status do atleta. Clique no icone de edição para alterar nome, email e telefone.">
          {/* Avatar + Name + Level */}
          <div className="flex items-start gap-4">
            <div className="ceramic-inset w-20 h-20 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl">
              {athlete.avatar_url ? (
                <img
                  src={athlete.avatar_url}
                  alt={athlete.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${getAvatarColor(athlete.name)} ${athlete.avatar_url ? 'hidden' : ''}`}>
                <span className="text-white font-bold text-2xl">{getInitials(athlete.name)}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                  className="w-full text-2xl font-black text-ceramic-text-primary bg-transparent border-b-2 border-ceramic-accent focus:outline-none mb-2"
                />
              ) : (
                <h1 className="text-2xl font-black text-ceramic-text-primary mb-2 flex items-center gap-2">
                  {athlete.name === 'Atleta (pendente)' ? 'Convite pendente' : athlete.name}
                  {/* Status Indicators — #389 */}
                  {athlete.financial_status && athlete.financial_status !== 'ok' && (
                    <span
                      className="w-3 h-3 rounded-full bg-ceramic-error animate-pulse flex-shrink-0"
                      title={athlete.financial_status === 'overdue' ? 'Pagamento em atraso' : 'Pagamento pendente'}
                    />
                  )}
                  {athlete.parq_clearance_status &&
                   ['pending', 'blocked', 'expired'].includes(athlete.parq_clearance_status) && (
                    <span
                      className="w-3 h-3 rounded-full bg-ceramic-info animate-pulse flex-shrink-0"
                      title={
                        athlete.parq_clearance_status === 'blocked' ? 'Liberação medica necessaria' :
                        athlete.parq_clearance_status === 'expired' ? 'Documentos expirados' :
                        'Documentos pendentes'
                      }
                    />
                  )}
                </h1>
              )}
              <span title="Nivel de experiência do atleta: iniciante, intermediario ou avancado">
                <LevelBadge level={athlete.level} size="md" />
              </span>
            </div>

            {/* Edit / Save / Cancel Buttons */}
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving || !editForm.name.trim()}
                  className="ceramic-card p-3 hover:scale-105 transition-transform bg-ceramic-success/10 disabled:opacity-50"
                >
                  {editSaving ? <Loader2 className="w-5 h-5 animate-spin text-ceramic-success" /> : <Save className="w-5 h-5 text-ceramic-success" />}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={editSaving}
                  className="ceramic-card p-3 hover:scale-105 transition-transform"
                >
                  <ArrowLeft className="w-5 h-5 text-ceramic-text-secondary" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEdit}
                className="ceramic-card p-3 hover:scale-105 transition-transform"
                title="Editar informações de contato do atleta (nome, email, telefone)"
              >
                <Edit className="w-5 h-5 text-ceramic-text-primary" />
              </button>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-ceramic-text-secondary/10">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-ceramic-text-secondary" />
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full text-xs text-ceramic-text-primary bg-transparent border-b border-ceramic-accent/50 focus:outline-none focus:border-ceramic-accent py-0.5"
                />
              ) : (
                <>
                  <p className="text-xs text-ceramic-text-secondary truncate">
                    {athlete.email || 'Aguardando cadastro do atleta'}
                  </p>
                  <ConnectionStatusDot status={athlete.invitation_status} size="md" />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-ceramic-text-secondary" />
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full text-xs text-ceramic-text-primary bg-transparent border-b border-ceramic-accent/50 focus:outline-none focus:border-ceramic-accent py-0.5"
                />
              ) : (
                <p className="text-xs text-ceramic-text-secondary truncate">
                  {athlete.phone === '+0000000000' ? 'Aguardando cadastro' : athlete.phone}
                </p>
              )}
            </div>
          </div>

          {/* Status + Trial */}
          <div className="flex items-center gap-3 pt-3 border-t border-ceramic-text-secondary/10">
            <div className="flex-1">
              <p className="text-xs text-ceramic-text-secondary mb-1">Status</p>
              <p className="text-sm font-bold text-ceramic-text-primary">
                {athlete.status === 'active' && 'Ativo'}
                {athlete.status === 'trial' && 'Trial'}
                {athlete.status === 'paused' && 'Pausado'}
                {athlete.status === 'churned' && 'Inativo'}
              </p>
            </div>
            {athlete.status === 'trial' && athlete.trial_expires_at && (
              <div className="flex-1">
                <p className="text-xs text-ceramic-text-secondary mb-1">Trial expira</p>
                <p className="text-sm font-bold text-ceramic-warning">
                  {new Date(athlete.trial_expires_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ferramentas de Prescrição — moved up per #767 */}
      <div className="px-6 mb-6" title="Ferramentas para prescrever treinos. Use o Canvas para criar planos de 4 semanas e libere o microciclo para o atleta acessar.">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/flux/canvas/${athleteId}`)}
            className="ceramic-card p-4 hover:scale-[1.02] transition-all group text-left"
            title="Abrir o Canvas de prescrição para criar e visualizar planos de treino de 4 semanas (microciclos)"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ceramic-info/10 flex items-center justify-center group-hover:bg-ceramic-info/20 transition-colors flex-shrink-0">
                <Calendar className="w-5 h-5 text-ceramic-info" />
              </div>
              <div>
                <p className="text-sm font-bold text-ceramic-text-primary">Prescrever e ver Treinos</p>
                <p className="text-xs text-ceramic-text-secondary">Plano de 4 semanas</p>
              </div>
            </div>
          </button>

          {/* Liberar Treino — #381 */}
          {activeMicrocycle?.status === 'draft' && (
            <button
              onClick={async () => {
                setActivatingMicrocycle(true);
                try {
                  const { error } = await MicrocycleService.activateMicrocycle(activeMicrocycle.id);
                  if (!error) {
                    setActiveMicrocycle(prev => prev ? { ...prev, status: 'active' } : null);
                  } else {
                    console.error('[AthleteDetail] Error activating microcycle:', error);
                  }
                } finally {
                  setActivatingMicrocycle(false);
                }
              }}
              disabled={activatingMicrocycle}
              className="ceramic-card p-4 hover:scale-[1.02] transition-all group text-left disabled:opacity-50"
              title="Liberar o microciclo rascunho para que o atleta possa visualizar e registrar seus treinos no portal"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-ceramic-success/10 flex items-center justify-center group-hover:bg-ceramic-success/20 transition-colors flex-shrink-0">
                  {activatingMicrocycle ? (
                    <Loader2 className="w-5 h-5 text-ceramic-success animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-ceramic-success" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-ceramic-text-primary">Liberar Treino</p>
                  <p className="text-xs text-ceramic-text-secondary">Ativar microciclo para o atleta</p>
                </div>
              </div>
            </button>
          )}
          {activeMicrocycle?.status === 'active' && (
            <div className="flex items-center gap-2 px-4 py-3 bg-ceramic-success/10 rounded-xl">
              <CheckCircle className="w-4 h-4 text-ceramic-success" />
              <span className="text-xs font-bold text-ceramic-success">Treino Liberado</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 mb-6">

      {/* Status de Documentos de Saúde (#680) */}
      <div title="Status dos documentos de saúde do atleta: PAR-Q, Atestado de Liberação e Exame Cardiologico.">
        <div className="ceramic-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-ceramic-text-secondary" />
            <h3 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Documentos de Saúde
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* PAR-Q Status — clickable to expand details inline (#912) */}
            <button
              onClick={() => setParqExpanded(!parqExpanded)}
              className={`ceramic-inset p-3 rounded-lg text-center transition-all hover:scale-105 ${
              parqStatus?.clearance_status === 'cleared' ? 'bg-ceramic-success/5' :
              parqStatus?.clearance_status === 'expired' || parqStatus?.clearance_status === 'blocked' ? 'bg-ceramic-error/5' :
              parqStatus?.clearance_status === 'cleared_with_restrictions' ? 'bg-ceramic-warning/5' :
              'bg-ceramic-cool/50'
            }${parqExpanded ? ' ring-2 ring-ceramic-accent/40' : ''}`} title="Clique para ver detalhes do PAR-Q+">
              <ShieldCheck className={`w-5 h-5 mx-auto mb-1 ${
                parqStatus?.clearance_status === 'cleared' ? 'text-ceramic-success' :
                parqStatus?.clearance_status === 'expired' || parqStatus?.clearance_status === 'blocked' ? 'text-ceramic-error' :
                parqStatus?.clearance_status === 'cleared_with_restrictions' ? 'text-ceramic-warning' :
                'text-ceramic-text-secondary/40'
              }`} />
              <p className="text-[10px] font-bold text-ceramic-text-primary">PAR-Q</p>
              <p className={`text-[10px] font-bold ${
                parqStatus?.clearance_status === 'cleared' ? 'text-ceramic-success' :
                parqStatus?.clearance_status === 'expired' ? 'text-ceramic-error' :
                parqStatus?.clearance_status === 'blocked' ? 'text-ceramic-error' :
                parqStatus?.clearance_status === 'cleared_with_restrictions' ? 'text-ceramic-warning' :
                'text-ceramic-text-secondary'
              }`}>
                {parqStatus?.clearance_status === 'cleared' ? 'OK' :
                 parqStatus?.clearance_status === 'expired' ? 'Expirado' :
                 parqStatus?.clearance_status === 'blocked' ? 'Bloqueado' :
                 parqStatus?.clearance_status === 'cleared_with_restrictions' ? 'Restrito' :
                 !athlete.allow_parq_onboarding ? 'N/A' : 'Pendente'}
              </p>
            </button>

            {/* Atestado de Liberacao — clickable to expand upload/review (#928) */}
            {(() => {
              const hasLiberacao = docs.documents.some(d => d.document_type === 'liberacao_atividade');
              const liberacaoDoc = docs.documents.find(d => d.document_type === 'liberacao_atividade');
              const isApproved = liberacaoDoc?.review_status === 'approved';
              const isExpired = liberacaoDoc?.expires_at ? new Date(liberacaoDoc.expires_at) < new Date() : false;
              return (
                <button
                  onClick={() => setLiberacaoExpanded(!liberacaoExpanded)}
                  className={`ceramic-inset p-3 rounded-lg text-center transition-all hover:scale-105 ${
                  isApproved && !isExpired ? 'bg-ceramic-success/5' :
                  isExpired ? 'bg-ceramic-error/5' :
                  hasLiberacao ? 'bg-ceramic-warning/5' :
                  athlete.requires_clearance_cert ? 'bg-ceramic-error/5' : 'bg-ceramic-cool/50'
                }${liberacaoExpanded ? ' ring-2 ring-ceramic-accent/40' : ''}`} title="Clique para gerenciar atestado de liberacao">
                  <ClipboardCheck className={`w-5 h-5 mx-auto mb-1 ${
                    isApproved && !isExpired ? 'text-ceramic-success' :
                    isExpired ? 'text-ceramic-error' :
                    hasLiberacao ? 'text-ceramic-warning' :
                    athlete.requires_clearance_cert ? 'text-ceramic-error' : 'text-ceramic-text-secondary/40'
                  }`} />
                  <p className="text-[10px] font-bold text-ceramic-text-primary">Liberação</p>
                  <p className={`text-[10px] font-bold ${
                    isApproved && !isExpired ? 'text-ceramic-success' :
                    isExpired ? 'text-ceramic-error' :
                    hasLiberacao ? 'text-ceramic-warning' :
                    athlete.requires_clearance_cert ? 'text-ceramic-error' : 'text-ceramic-text-secondary'
                  }`}>
                    {isApproved && !isExpired ? 'OK' :
                     isExpired ? 'Expirado' :
                     hasLiberacao ? 'Pendente' :
                     athlete.requires_clearance_cert ? 'Ausente' : 'N/A'}
                  </p>
                </button>
              );
            })()}

            {/* Exame Cardiologico — clickable to expand upload/review (#928) */}
            {(() => {
              const hasCardio = docs.documents.some(d => d.document_type === 'exame_cardiologico');
              const cardioDoc = docs.documents.find(d => d.document_type === 'exame_cardiologico');
              const isApproved = cardioDoc?.review_status === 'approved';
              const isExpired = cardioDoc?.expires_at ? new Date(cardioDoc.expires_at) < new Date() : false;
              return (
                <button
                  onClick={() => setCardioExpanded(!cardioExpanded)}
                  className={`ceramic-inset p-3 rounded-lg text-center transition-all hover:scale-105 ${
                  isApproved && !isExpired ? 'bg-ceramic-success/5' :
                  isExpired ? 'bg-ceramic-error/5' :
                  hasCardio ? 'bg-ceramic-warning/5' :
                  athlete.requires_cardio_exam ? 'bg-ceramic-error/5' : 'bg-ceramic-cool/50'
                }${cardioExpanded ? ' ring-2 ring-ceramic-accent/40' : ''}`} title="Clique para gerenciar exame cardiologico">
                  <HeartPulse className={`w-5 h-5 mx-auto mb-1 ${
                    isApproved && !isExpired ? 'text-ceramic-success' :
                    isExpired ? 'text-ceramic-error' :
                    hasCardio ? 'text-ceramic-warning' :
                    athlete.requires_cardio_exam ? 'text-ceramic-error' : 'text-ceramic-text-secondary/40'
                  }`} />
                  <p className="text-[10px] font-bold text-ceramic-text-primary">Cardio</p>
                  <p className={`text-[10px] font-bold ${
                    isApproved && !isExpired ? 'text-ceramic-success' :
                    isExpired ? 'text-ceramic-error' :
                    hasCardio ? 'text-ceramic-warning' :
                    athlete.requires_cardio_exam ? 'text-ceramic-error' : 'text-ceramic-text-secondary'
                  }`}>
                    {isApproved && !isExpired ? 'OK' :
                     isExpired ? 'Expirado' :
                     hasCardio ? 'Pendente' :
                     athlete.requires_cardio_exam ? 'Ausente' : 'N/A'}
                  </p>
                </button>
              );
            })()}
          </div>

          {/* Inline PAR-Q detail — expands inside Documentos de Saúde (#912) */}
          {parqExpanded && (
            <div className="mt-4 border-t border-ceramic-border pt-4">
              {athlete.allow_parq_onboarding ? (
                <ParQCoachView
                  athleteName={athlete.name}
                  parqStatus={parqStatus}
                  latestResponse={latestParQ}
                  documents={docs.documents}
                  isLoadingStatus={parqLoading}
                  onReviewDocument={docs.reviewDocument}
                  onViewDocument={async (doc) => docs.getDocumentUrl(doc)}
                  onUploadDocument={(input) => docs.uploadDocument(input)}
                  isUploading={docs.isUploading}
                />
              ) : (
                <p className="text-sm text-ceramic-text-secondary">
                  O onboarding PAR-Q esta desativado para este atleta.
                  Ative nas configurações do atleta para que ele possa preencher o questionario.
                </p>
              )}
            </div>
          )}

          {/* Inline Liberacao detail — expands inside Documentos de Saude (#928) */}
          {liberacaoExpanded && (
            <div className="mt-4 border-t border-ceramic-border pt-4">
              <div className="space-y-3">
                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Atestado de Liberacao
                </p>
                {docs.documents
                  .filter(d => d.document_type === 'liberacao_atividade')
                  .map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 ceramic-inset rounded-lg">
                      <span className="text-sm text-ceramic-text-primary truncate max-w-[60%]">{doc.file_name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          doc.review_status === 'approved' ? 'bg-ceramic-success/10 text-ceramic-success' :
                          doc.review_status === 'rejected' ? 'bg-ceramic-error/10 text-ceramic-error' :
                          'bg-ceramic-warning/10 text-ceramic-warning'
                        }`}>
                          {doc.review_status === 'approved' ? 'Aprovado' :
                           doc.review_status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                        {doc.review_status === 'pending' && (
                          <>
                            <button
                              onClick={() => docs.reviewDocument(doc.id, 'approved')}
                              className="text-xs px-2 py-0.5 rounded bg-ceramic-success/10 text-ceramic-success hover:bg-ceramic-success/20 font-bold transition-colors"
                              title="Aprovar documento"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => docs.reviewDocument(doc.id, 'rejected')}
                              className="text-xs px-2 py-0.5 rounded bg-ceramic-error/10 text-ceramic-error hover:bg-ceramic-error/20 font-bold transition-colors"
                              title="Rejeitar documento"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                {docs.documents.filter(d => d.document_type === 'liberacao_atividade').length === 0 && (
                  <p className="text-xs text-ceramic-text-secondary">Nenhum documento enviado.</p>
                )}
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-ceramic-border rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
                  <Upload className="w-4 h-4 text-ceramic-text-secondary" />
                  <span className="text-sm text-ceramic-text-secondary">
                    {docs.isUploading ? 'Enviando...' : 'Enviar atestado de liberacao'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocUpload(e, 'liberacao_atividade')}
                    disabled={docs.isUploading}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Inline Cardio detail — expands inside Documentos de Saude (#928) */}
          {cardioExpanded && (
            <div className="mt-4 border-t border-ceramic-border pt-4">
              <div className="space-y-3">
                <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                  Exame Cardiologico
                </p>
                {docs.documents
                  .filter(d => d.document_type === 'exame_cardiologico')
                  .map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 ceramic-inset rounded-lg">
                      <span className="text-sm text-ceramic-text-primary truncate max-w-[60%]">{doc.file_name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                          doc.review_status === 'approved' ? 'bg-ceramic-success/10 text-ceramic-success' :
                          doc.review_status === 'rejected' ? 'bg-ceramic-error/10 text-ceramic-error' :
                          'bg-ceramic-warning/10 text-ceramic-warning'
                        }`}>
                          {doc.review_status === 'approved' ? 'Aprovado' :
                           doc.review_status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                        </span>
                        {doc.review_status === 'pending' && (
                          <>
                            <button
                              onClick={() => docs.reviewDocument(doc.id, 'approved')}
                              className="text-xs px-2 py-0.5 rounded bg-ceramic-success/10 text-ceramic-success hover:bg-ceramic-success/20 font-bold transition-colors"
                              title="Aprovar documento"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => docs.reviewDocument(doc.id, 'rejected')}
                              className="text-xs px-2 py-0.5 rounded bg-ceramic-error/10 text-ceramic-error hover:bg-ceramic-error/20 font-bold transition-colors"
                              title="Rejeitar documento"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                {docs.documents.filter(d => d.document_type === 'exame_cardiologico').length === 0 && (
                  <p className="text-xs text-ceramic-text-secondary">Nenhum documento enviado.</p>
                )}
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-ceramic-border rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors">
                  <Upload className="w-4 h-4 text-ceramic-text-secondary" />
                  <span className="text-sm text-ceramic-text-secondary">
                    {docs.isUploading ? 'Enviando...' : 'Enviar exame cardiologico'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleDocUpload(e, 'exame_cardiologico')}
                    disabled={docs.isUploading}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      </div>{/* end Summary Cards */}

      {/* Collapsible Sections — 2-col on desktop */}
      <div className="px-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Athlete Profile Calculator */}
      <div title="Perfil fisico completo: peso, altura, IMC, modalidades praticadas e zonas de treino recomendadas.">
        <div className="ceramic-card overflow-hidden">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="ceramic-inset p-2">
                <Calculator className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-ceramic-text-primary">Perfil Fisico</p>
                <p className="text-xs text-ceramic-text-secondary">
                  Peso, altura, IMC e modalidades
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {calcBMI() && (
                <span className="text-xs font-bold text-ceramic-info bg-ceramic-info/10 px-2 py-0.5 rounded">
                  IMC {calcBMI()}
                </span>
              )}
              <span className={`text-ceramic-text-secondary transition-transform ${profileOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="p-4 pt-0 space-y-4">
              {/* Weight + Height row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                    Peso (kg)
                  </label>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                    <input
                      type="number"
                      step="0.1"
                      value={profileForm.weight_kg}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, weight_kg: e.target.value }))}
                      placeholder="75.0"
                      className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                    Altura (cm)
                  </label>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                    <input
                      type="number"
                      step="1"
                      value={profileForm.height_cm}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, height_cm: e.target.value }))}
                      placeholder="175"
                      className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                    />
                  </div>
                </div>
              </div>

              {/* BMI result */}
              {calcBMI() && (
                <div className="ceramic-inset p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-xs text-ceramic-text-secondary">IMC</span>
                    <span className="text-lg font-black text-ceramic-text-primary ml-2">{calcBMI()}</span>
                  </div>
                  <span className={`text-xs font-bold ${getBmiCategory(parseFloat(calcBMI()!)).color}`}>
                    {getBmiCategory(parseFloat(calcBMI()!)).label}
                  </span>
                </div>
              )}

              {/* Birth date + Age */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={profileForm.birth_date}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                    Idade
                  </label>
                  <div className="ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary">
                    {calcAge() != null ? `${calcAge()} anos` : '--'}
                  </div>
                </div>
              </div>

              {/* Practice duration (displayed as years, stored as months) */}
              <div>
                <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                  Anos de Pratica
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={profileForm.practice_duration_months
                    ? String(Math.round(parseFloat(profileForm.practice_duration_months) / 12 * 2) / 2)
                    : ''}
                  onChange={(e) => {
                    const years = e.target.value;
                    const months = years ? String(Math.round(parseFloat(years) * 12)) : '';
                    setProfileForm(prev => ({ ...prev, practice_duration_months: months }));
                  }}
                  placeholder="Ex: 2"
                  className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                />
              </div>

              {/* Practiced Modalities */}
              <div>
                <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                  Modalidades Praticadas
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_MODALITIES.map((mod) => {
                    const config = MODALITY_CONFIG[mod];
                    const isSelected = profileForm.practiced_modalities.includes(mod);
                    return (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => handleModalityToggle(mod)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-ceramic-success/15 text-ceramic-success border border-ceramic-success/30'
                            : 'ceramic-inset text-ceramic-text-secondary hover:bg-white/50'
                        }`}
                      >
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Training Zone Recommendations */}
              {calcAge() && profileForm.practiced_modalities.length > 0 && (
                <div className="ceramic-inset p-3 rounded-lg space-y-2">
                  <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                    Zonas de Treino Recomendadas
                  </p>
                  {(() => {
                    const age = calcAge()!;
                    const maxHR = 220 - age;
                    return (
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {[
                          { zone: 'Z1', pct: '50-60%', hr: `${Math.round(maxHR * 0.5)}-${Math.round(maxHR * 0.6)}`, color: 'bg-blue-100 text-blue-700' },
                          { zone: 'Z2', pct: '60-70%', hr: `${Math.round(maxHR * 0.6)}-${Math.round(maxHR * 0.7)}`, color: 'bg-green-100 text-green-700' },
                          { zone: 'Z3', pct: '70-80%', hr: `${Math.round(maxHR * 0.7)}-${Math.round(maxHR * 0.8)}`, color: 'bg-yellow-100 text-yellow-700' },
                          { zone: 'Z4', pct: '80-90%', hr: `${Math.round(maxHR * 0.8)}-${Math.round(maxHR * 0.9)}`, color: 'bg-orange-100 text-orange-700' },
                          { zone: 'Z5', pct: '90-100%', hr: `${Math.round(maxHR * 0.9)}-${maxHR}`, color: 'bg-red-100 text-red-700' },
                        ].map(z => (
                          <div key={z.zone} className={`${z.color} rounded-lg p-2`}>
                            <p className="text-[10px] font-black">{z.zone}</p>
                            <p className="text-[9px]">{z.pct}</p>
                            <p className="text-[9px] font-bold">{z.hr} bpm</p>
                          </div>
                        ))
                      }
                      </div>
                    );
                  })()}
                  <p className="text-[10px] text-ceramic-text-secondary">
                    FC Max estimada (220 - idade): {220 - calcAge()!} bpm
                  </p>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-all"
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Perfil Fisico
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Financeiro Section — #463 */}
      <div title="Gerenciamento financeiro: configure mensalidade, dia de vencimento e acompanhe o status de pagamento do atleta.">
        <div className="ceramic-card overflow-hidden">
          <button
            onClick={() => setFinanceOpen(!financeOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="ceramic-inset p-2">
                <DollarSign className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-ceramic-text-primary">Financeiro</p>
                <p className="text-xs text-ceramic-text-secondary">
                  Cobranca, vencimento e status
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Status badge */}
              {(() => {
                const pd = getPaymentData(athlete);
                return (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      pd.payment_status === 'paid'
                        ? 'bg-ceramic-success/10 text-ceramic-success'
                        : pd.payment_status === 'overdue'
                          ? 'bg-ceramic-error/10 text-ceramic-error'
                          : 'bg-ceramic-warning/10 text-ceramic-warning'
                    }`}
                  >
                    {pd.payment_status === 'paid'
                      ? 'Pago'
                      : pd.payment_status === 'overdue'
                        ? 'Atrasado'
                        : 'Pendente'}
                  </span>
                );
              })()}
              <span className={`text-ceramic-text-secondary transition-transform ${financeOpen ? 'rotate-180' : ''}`}>
                &#9662;
              </span>
            </div>
          </button>

          {financeOpen && (
            <div className="p-4 pt-0 space-y-4">
              {/* TODO (#913): Implement billing notifications via web push, email, Telegram, WhatsApp */}
              {/* Schedule: -1d (reminder), 0 (due today), +1d, +3d, +7d (overdue escalation) */}
              {/* Payment Status Card */}
              {(() => {
                const pd = getPaymentData(athlete);
                return (
                  <div className="ceramic-inset p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            pd.payment_status === 'paid'
                              ? 'bg-ceramic-success/10'
                              : pd.payment_status === 'overdue'
                                ? 'bg-ceramic-error/10'
                                : 'bg-ceramic-warning/10'
                          }`}
                        >
                          <DollarSign
                            className={`w-5 h-5 ${
                              pd.payment_status === 'paid'
                                ? 'text-ceramic-success'
                                : pd.payment_status === 'overdue'
                                  ? 'text-ceramic-error'
                                  : 'text-ceramic-warning'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ceramic-text-primary">
                            {pd.payment_status === 'paid'
                              ? 'Pago'
                              : pd.payment_status === 'overdue'
                                ? 'Atrasado'
                                : 'Pendente'}
                          </p>
                          {pd.monthly_fee != null && pd.monthly_fee > 0 && (
                            <p className="text-xs text-ceramic-text-secondary">
                              R$ {pd.monthly_fee.toFixed(2).replace('.', ',')}
                              {pd.payment_due_day ? ` - Dia ${pd.payment_due_day}` : ''}
                            </p>
                          )}
                          {pd.last_payment_date && (
                            <p className="text-[10px] text-ceramic-text-secondary/60">
                              Último pagamento:{' '}
                              {new Date(pd.last_payment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Toggle button */}
                      <button
                        onClick={handleTogglePaymentStatus}
                        disabled={paymentSaving}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                          pd.payment_status === 'paid'
                            ? 'bg-ceramic-warning/10 text-ceramic-warning hover:bg-ceramic-warning/20 border border-ceramic-warning/20'
                            : 'bg-ceramic-success/10 text-ceramic-success hover:bg-ceramic-success/20 border border-ceramic-success/20'
                        }`}
                      >
                        {paymentSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : pd.payment_status === 'paid' ? (
                          'Marcar Pendente'
                        ) : (
                          'Marcar Pago'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Payment Ruler Visualization */}
              {(() => {
                const pd = getPaymentData(athlete);
                if (!pd.payment_due_day) return null;
                return (
                  <PaymentRuler
                    dueDay={pd.payment_due_day}
                    paymentStatus={pd.payment_status}
                  />
                );
              })()}

              {/* Payment Settings */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                    Dia Vencimento (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentForm.payment_due_day}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, payment_due_day: e.target.value }))
                    }
                    placeholder="Ex: 10"
                    className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                    Mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.monthly_fee}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, monthly_fee: e.target.value }))
                    }
                    placeholder="Ex: 250,00"
                    className="w-full ceramic-inset px-3 py-2 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-accent/50"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handlePaymentSave}
                disabled={paymentSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ceramic-accent hover:bg-ceramic-accent/90 disabled:bg-ceramic-text-secondary/20 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-all"
              >
                {paymentSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Financeiro
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      </div>{/* end Collapsible Sections grid */}

      {/* Gerenciamento Section — #464 */}
      <div className="px-6 mb-6" title="Gerencie o acesso do atleta. Bloqueie para pausar acesso aos treinos ou desbloqueie para reativar.">
        <h2 className="text-lg font-bold text-ceramic-text-primary mb-3">
          Gerenciamento
        </h2>
        <div className="ceramic-card p-4">
          <button
            onClick={handleToggleBlock}
            disabled={blockingAthlete}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              athlete.status === 'paused'
                ? 'bg-ceramic-success/10 text-ceramic-success hover:bg-ceramic-success/20 border border-ceramic-success/20'
                : 'bg-ceramic-error/10 text-ceramic-error hover:bg-ceramic-error/20 border border-ceramic-error/20'
            }`}
            title={athlete.status === 'paused' ? 'Reativar o acesso do atleta ao portal e treinos' : 'Pausar o acesso do atleta — ele não podera ver treinos ate ser desbloqueado'}
          >
            {blockingAthlete ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : athlete.status === 'paused' ? (
              <Unlock className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            <div className="text-left">
              <p>{athlete.status === 'paused' ? 'Desbloquear Atleta' : 'Bloquear Atleta'}</p>
              <p className="text-xs font-normal opacity-70">
                {athlete.status === 'paused'
                  ? 'Reativar acesso aos treinos'
                  : 'Pausar acesso aos treinos'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-ceramic-text-primary mb-3">
            Alertas ({alerts.length})
          </h2>
          <div className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
          {alerts.length > 3 && (
            <button
              onClick={() => navigate('/flux/alerts')}
              className="w-full mt-3 px-4 py-2 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform"
            >
              Ver todos os alertas
            </button>
          )}
        </div>
      )}

      {/* Feedbacks Timeline */}
      <div className="px-6 mb-6" title="Histórico de feedbacks do atleta. Mostra comentarios e RPE (percepcao de esforco) apos cada treino completado.">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-ceramic-text-primary" />
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            Feedbacks
          </h2>
        </div>

        {/* Aggregated Radar Chart + Gauges (#781) */}
        {aggregatedQuestionnaire && (
          <div className="ceramic-card p-4 mb-4 space-y-4">
            <FeedbackRadarChart
              questionnaire={aggregatedQuestionnaire}
              size={300}
              title="Visao Geral"
              subtitle="Media dos feedbacks do atleta"
            />
            <StressFatigueGauges
              stress={aggregatedQuestionnaire.stress}
              fatigue={aggregatedQuestionnaire.fatigue}
            />
          </div>
        )}

        {/* Structured feedback entries from athlete_feedback_entries */}
        {feedbackEntries.length > 0 && (
          <div className="space-y-3 mb-4">
            {feedbackEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="ceramic-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-ceramic-text-secondary" />
                    <p className="text-sm font-bold text-ceramic-text-primary">
                      {entry.feedback_type === 'weekly' ? `Feedback Semanal (Sem ${entry.week_number})` : `Feedback de Exercicio`}
                    </p>
                  </div>
                  <p className="text-xs text-ceramic-text-secondary">
                    {new Date(entry.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>

                {/* Questionnaire summary badges */}
                {entry.questionnaire && (
                  <div className="flex flex-wrap gap-2">
                    {entry.questionnaire.fatigue != null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        entry.questionnaire.fatigue >= 4 ? 'bg-red-100 text-red-700' :
                        entry.questionnaire.fatigue >= 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        Cansaco: {entry.questionnaire.fatigue}/5
                      </span>
                    )}
                    {entry.questionnaire.stress != null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        entry.questionnaire.stress >= 4 ? 'bg-red-100 text-red-700' :
                        entry.questionnaire.stress >= 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        Stress: {entry.questionnaire.stress}/5
                      </span>
                    )}
                    {entry.questionnaire.sleep != null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        entry.questionnaire.sleep >= 3 ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        Sono: {entry.questionnaire.sleep}/5
                      </span>
                    )}
                    {entry.questionnaire.nutrition != null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        entry.questionnaire.nutrition >= 3 ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        Nutricao: {entry.questionnaire.nutrition}/5
                      </span>
                    )}
                  </div>
                )}

                {/* Notes / Voice transcript */}
                {(entry.notes || entry.voice_transcript) && (
                  <p className="text-sm text-ceramic-text-primary font-light italic">
                    &ldquo;{entry.notes || entry.voice_transcript}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Legacy feedback from workout_slots (backward compat) */}
        {feedbackEntries.length === 0 && feedbacks.length > 0 && (
          <div className="space-y-3">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="ceramic-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-ceramic-text-secondary" />
                    <p className="text-sm font-bold text-ceramic-text-primary">
                      {fb.name}
                    </p>
                  </div>
                  {fb.completed_at && (
                    <p className="text-xs text-ceramic-text-secondary">
                      {new Date(fb.completed_at).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  )}
                </div>
                <p className="text-sm text-ceramic-text-primary font-light">
                  {fb.athlete_feedback}
                </p>
                {fb.rpe != null && (
                  <div className="flex items-center gap-2 text-xs pt-2 border-t border-ceramic-text-secondary/10">
                    <span className="text-ceramic-text-secondary">RPE:</span>
                    <span className={`font-bold ${
                      fb.rpe >= 8 ? 'text-ceramic-error' :
                      fb.rpe >= 6 ? 'text-ceramic-warning' :
                      'text-ceramic-success'
                    }`}>
                      {fb.rpe}/10
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {feedbackEntries.length === 0 && feedbacks.length === 0 && (
          <div className="ceramic-inset p-8 text-center">
            <p className="text-sm text-ceramic-text-secondary font-light">
              Nenhum feedback registrado ainda
            </p>
          </div>
        )}
      </div>

    </div>
    </ErrorBoundary>
  );
}
