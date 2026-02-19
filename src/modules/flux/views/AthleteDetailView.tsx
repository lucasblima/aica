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
import { useAthleteDocuments } from '../hooks/useAthleteDocuments';
import { supabase } from '@/services/supabaseClient';
import type { Athlete, Alert } from '../types';
import { MODALITY_CONFIG, TRAINING_MODALITIES } from '../types';
import type { ParQStatus, ParQResponse } from '../types/parq';
import type { SlotFeedback } from '../components/AthleteCard';
import { LevelBadge } from '../components/LevelBadge';
import { ProgressionBar } from '../components/ProgressionBar';
import { AlertBadge } from '../components/AlertBadge';
import { ConnectionStatusDot } from '../components/ConnectionStatusDot';
import { ParQCoachView } from '../components/parq/ParQCoachView';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Activity,
  Edit,
  Zap,
  TrendingUp,
  Loader2,
  Scale,
  Ruler,
  Calculator,
  Save,
} from 'lucide-react';
import { ErrorBoundary, ModuleErrorFallback } from '@/components/ui/ErrorBoundary';

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
  const alerts: Alert[] = [];
  const activeBlock = null;

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

  // Load recent feedbacks from workout_slots
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;

    const loadFeedbacks = async () => {
      const { data, error } = await supabase
        .from('workout_slots')
        .select('id, name, athlete_feedback, completed_at, rpe')
        .eq('athlete_id', athleteId)
        .not('athlete_feedback', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (cancelled || error || !data) return;
      setFeedbacks(data as SlotFeedback[]);
    };

    loadFeedbacks();
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

  // Handle back
  const handleBack = () => {
    actions.viewDashboard();
    navigate('/flux');
  };

  // Handle edit canvas
  const handleEditCanvas = () => {
    if (athleteId) {
      if (activeBlock) {
        actions.editCanvas(activeBlock.id, athleteId);
        navigate(`/flux/canvas/${athleteId}/${activeBlock.id}`);
      } else {
        // No active block - create new canvas
        navigate(`/flux/canvas/${athleteId}`);
      }
    }
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
          Atleta nao encontrado
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
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
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
        <div className="ceramic-card p-6 space-y-4">
          {/* Avatar + Name + Level */}
          <div className="flex items-start gap-4">
            <div className="ceramic-inset w-20 h-20 flex-shrink-0 flex items-center justify-center">
              <User className="w-10 h-10 text-ceramic-text-secondary" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-ceramic-text-primary mb-2">
                {athlete.name}
              </h1>
              <LevelBadge level={athlete.level} size="md" />
            </div>

            {/* Edit Button */}
            <button
              onClick={() => console.log('Editar atleta (em desenvolvimento)')}
              className="ceramic-card p-3 hover:scale-105 transition-transform"
            >
              <Edit className="w-5 h-5 text-ceramic-text-primary" />
            </button>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-ceramic-text-secondary/10">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-ceramic-text-secondary" />
              <p className="text-xs text-ceramic-text-secondary truncate">
                {athlete.email || 'Sem email'}
              </p>
              <ConnectionStatusDot status={athlete.invitation_status} size="md" />
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-ceramic-text-secondary" />
              <p className="text-xs text-ceramic-text-secondary truncate">
                {athlete.phone}
              </p>
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

      {/* PAR-Q / Health Section (only when PAR-Q onboarding is enabled) */}
      {athlete.allow_parq_onboarding && (
        <div className="px-6 mb-6">
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
        </div>
      )}

      {/* Athlete Profile Calculator */}
      <div className="px-6 mb-6">
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

              {/* Practice duration */}
              <div>
                <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-1.5">
                  Tempo de Pratica (meses)
                </label>
                <input
                  type="number"
                  step="1"
                  value={profileForm.practice_duration_months}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, practice_duration_months: e.target.value }))}
                  placeholder="Ex: 24"
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

      {/* Canvas Access - Always visible */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            {activeBlock ? 'Progresso Atual' : 'Prescrição de Treinos'}
          </h2>
          <button
            onClick={handleEditCanvas}
            className="flex items-center gap-2 px-4 py-2 bg-ceramic-info hover:bg-ceramic-info/90 text-white rounded-lg shadow-md hover:scale-105 transition-all"
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm font-bold">
              {activeBlock ? 'Editar Canvas' : 'Criar Canvas'}
            </span>
          </button>
        </div>

      {/* Progression Bar */}
      {activeBlock && (
        <div className="mb-4">
          <ProgressionBar
            currentWeek={1}
            totalWeeks={12}
            adherenceRate={0}
            completedWorkouts={8}
            totalWorkouts={12}
          />
        </div>
      )}
      </div>

      {/* Active Block Info */}
      {activeBlock && (
        <div className="px-6 mb-6">
          <div className="ceramic-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="ceramic-inset p-2">
                <Calendar className="w-5 h-5 text-ceramic-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-ceramic-text-secondary font-medium uppercase tracking-wider">
                  Bloco Atual
                </p>
                <p className="text-base font-bold text-ceramic-text-primary">
                  {activeBlock.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary pt-2 border-t border-ceramic-text-secondary/10">
              <div>
                <span className="font-medium">Inicio:</span>{' '}
                {new Date(activeBlock.start_date).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <span className="font-medium">Fim:</span>{' '}
                {new Date(activeBlock.end_date).toLocaleDateString('pt-BR')}
              </div>
            </div>
            {activeBlock.progression_notes && (
              <p className="text-sm text-ceramic-text-secondary font-light pt-2 border-t border-ceramic-text-secondary/10">
                {activeBlock.progression_notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Flow Tools Section */}
      <div className="px-6 mb-6">
        <h2 className="text-lg font-bold text-ceramic-text-primary mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-ceramic-accent" />
          Ferramentas de Prescrição
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/flux/microcycle/new')}
            className="ceramic-card p-4 hover:scale-[1.02] transition-all group text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ceramic-info/10 flex items-center justify-center group-hover:bg-ceramic-info/20 transition-colors flex-shrink-0">
                <Calendar className="w-5 h-5 text-ceramic-info" />
              </div>
              <div>
                <p className="text-sm font-bold text-ceramic-text-primary">Prescrever Microciclo</p>
                <p className="text-xs text-ceramic-text-secondary">Plano de 3 semanas</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate(`/flux/intensity/${athleteId}`)}
            className="ceramic-card p-4 hover:scale-[1.02] transition-all group text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-ceramic-warning/10 flex items-center justify-center group-hover:bg-ceramic-warning/20 transition-colors flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-ceramic-warning" />
              </div>
              <div>
                <p className="text-sm font-bold text-ceramic-text-primary">Zonas de Intensidade</p>
                <p className="text-xs text-ceramic-text-secondary">FTP, Pace, CSS</p>
              </div>
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
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-ceramic-text-primary" />
          <h2 className="text-lg font-bold text-ceramic-text-primary">
            Feedbacks Recentes ({feedbacks.length})
          </h2>
        </div>

        {feedbacks.length > 0 ? (
          <div className="space-y-3">
            {feedbacks.slice(0, 5).map((fb) => (
              <div key={fb.id} className="ceramic-card p-4 space-y-3">
                {/* Header: slot name + date */}
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

                {/* Athlete feedback text */}
                <p className="text-sm text-ceramic-text-primary font-light">
                  {fb.athlete_feedback}
                </p>

                {/* RPE if available */}
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
        ) : (
          <div className="ceramic-inset p-8 text-center">
            <p className="text-sm text-ceramic-text-secondary font-light">
              Nenhum feedback registrado ainda
            </p>
          </div>
        )}
      </div>

      {/* Anamnesis Section */}
      {athlete.anamnesis && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-bold text-ceramic-text-primary mb-3">Anamnese</h2>
          <div className="ceramic-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Sono</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {athlete.anamnesis.sleep_quality || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Estresse</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {athlete.anamnesis.stress_level || 'N/A'}
                </p>
              </div>
            </div>
            {athlete.anamnesis.injuries && athlete.anamnesis.injuries.length > 0 && (
              <div className="pt-3 border-t border-ceramic-text-secondary/10">
                <p className="text-xs text-ceramic-text-secondary mb-2">Lesoes Previas</p>
                <ul className="space-y-1">
                  {athlete.anamnesis.injuries.map((injury, index) => (
                    <li key={index} className="text-sm text-ceramic-text-primary">
                      - {injury}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
