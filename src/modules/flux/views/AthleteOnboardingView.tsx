/**
 * AthleteOnboardingView — Public onboarding page for new athletes
 *
 * Route: /onboarding/:athleteId (public, no auth required initially)
 *
 * Flow:
 * 1. Load athlete record (created by coach with status 'trial', invitation_status 'pending')
 * 2. Athlete fills in name, email, phone
 * 3. Shows health documentation requirements set by coach
 * 4. Athlete creates AICA account or links existing one
 * 5. Redirects to /meu-treino after completion
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Heart,
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Dumbbell,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import type { Athlete } from '../types/flux';
import { MODALITY_CONFIG } from '../types';

// ============================================
// Types
// ============================================

interface OnboardingFormData {
  name: string;
  email: string;
  phone: string;
}

interface OnboardingErrors {
  name?: string;
  email?: string;
  phone?: string;
}

type OnboardingStep = 'loading' | 'info' | 'health' | 'account' | 'done' | 'error';

// ============================================
// Component
// ============================================

export default function AthleteOnboardingView() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<OnboardingStep>('loading');
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<OnboardingFormData>({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load athlete data
  useEffect(() => {
    if (!athleteId) {
      setStep('error');
      setErrorMessage('Link de cadastro invalido.');
      return;
    }

    const loadAthlete = async () => {
      try {
        // Use public RPC (SECURITY DEFINER) — bypasses RLS safely
        const { data, error } = await supabase
          .rpc('get_athlete_onboarding', { p_athlete_id: athleteId });

        if (error || !data || data.length === 0) {
          setStep('error');
          setErrorMessage('Atleta nao encontrado. Verifique o link com seu treinador.');
          return;
        }

        const athleteData = data[0] as Athlete;
        setAthlete(athleteData);

        // If athlete already completed onboarding
        if (athleteData.invitation_status === 'connected' && athleteData.name !== 'Atleta (pendente)') {
          if (user) {
            navigate('/meu-treino', { replace: true });
            return;
          }
          setStep('account');
          return;
        }

        // Pre-fill from existing data if any
        setFormData({
          name: athleteData.name === 'Atleta (pendente)' ? '' : athleteData.name || '',
          email: athleteData.email || (user?.email ?? ''),
          phone: athleteData.phone === '+0000000000' ? '' : athleteData.phone || '',
        });

        setStep('info');
      } catch (err) {
        console.error('[AthleteOnboarding] Error loading athlete:', err);
        setStep('error');
        setErrorMessage('Erro ao carregar dados. Tente novamente.');
      }
    };

    loadAthlete();
  }, [athleteId, user, navigate]);

  // Validation
  const validate = (): boolean => {
    const newErrors: OnboardingErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Nome e obrigatorio (min. 2 caracteres)';
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email valido e obrigatorio';
    }

    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = 'Telefone invalido (formato: +5511987654321)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save athlete info and move to health step
  const handleSaveInfo = async () => {
    if (!validate() || !athleteId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('complete_athlete_onboarding', {
        p_athlete_id: athleteId,
        p_name: formData.name.trim(),
        p_email: formData.email.trim(),
        p_phone: formData.phone.trim(),
      });

      if (error) throw error;

      setStep('health');
    } catch (err) {
      console.error('[AthleteOnboarding] Error saving info:', err);
      setErrors({ name: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Move to account step
  const handleHealthAcknowledged = () => {
    if (user) {
      // User already logged in — link athlete to account
      handleLinkAccount();
    } else {
      setStep('account');
    }
  };

  // Link athlete to current AICA account
  const handleLinkAccount = async () => {
    if (!athleteId || !user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('complete_athlete_onboarding', {
        p_athlete_id: athleteId,
        p_name: formData.name.trim() || athlete?.name || '',
        p_email: formData.email.trim() || athlete?.email || '',
        p_phone: formData.phone.trim() || athlete?.phone || '',
        p_auth_user_id: user.id,
      });

      if (error) throw error;

      setStep('done');
      setTimeout(() => navigate('/meu-treino', { replace: true }), 2000);
    } catch (err) {
      console.error('[AthleteOnboarding] Error linking account:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to login/signup with redirect back
  const handleCreateAccount = () => {
    // Save athlete ID in sessionStorage so we can resume after auth
    sessionStorage.setItem('flux_onboarding_athlete_id', athleteId || '');
    navigate(`/login?redirect=/onboarding/${athleteId}`);
  };

  // ============================================
  // Render helpers
  // ============================================

  const modalityLabel = athlete?.modality
    ? MODALITY_CONFIG[athlete.modality]?.label || athlete.modality
    : '';
  const modalityIcon = athlete?.modality
    ? MODALITY_CONFIG[athlete.modality]?.icon || ''
    : '';

  const healthDocs = [
    ...(athlete?.requires_cardio_exam ? ['Exame Cardiologico'] : []),
    ...(athlete?.requires_clearance_cert ? ['Atestado de Liberacao Medica'] : []),
    ...(athlete?.allow_parq_onboarding ? ['Questionario PAR-Q+'] : []),
  ];

  // ============================================
  // Loading
  // ============================================

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
        <p className="text-sm text-ceramic-text-secondary">Carregando...</p>
      </div>
    );
  }

  // ============================================
  // Error
  // ============================================

  if (step === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-ceramic-error/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-ceramic-error" />
          </div>
          <h1 className="text-xl font-black text-ceramic-text-primary">Link Invalido</h1>
          <p className="text-sm text-ceramic-text-secondary leading-relaxed">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Main content
  // ============================================

  return (
    <div className="min-h-screen bg-ceramic-base flex flex-col items-center px-4 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center mb-8 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Dumbbell className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-black text-ceramic-text-primary">
          Bem-vindo ao Flux
        </h1>
        <p className="text-sm text-ceramic-text-secondary mt-2">
          Seu treinador configurou seu perfil de treino.
          {modalityLabel && (
            <> Modalidade: <strong>{modalityIcon} {modalityLabel}</strong></>
          )}
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {['info', 'health', 'account'].map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === s
                  ? 'bg-amber-500 text-white'
                  : ['info', 'health', 'account'].indexOf(step) > i
                    ? 'bg-ceramic-success text-white'
                    : 'bg-ceramic-text-secondary/15 text-ceramic-text-secondary'
              }`}
            >
              {['info', 'health', 'account'].indexOf(step) > i ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div className={`w-12 h-0.5 ${
                ['info', 'health', 'account'].indexOf(step) > i
                  ? 'bg-ceramic-success'
                  : 'bg-ceramic-text-secondary/15'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* STEP 1: Personal Info */}
        {step === 'info' && (
          <div className="ceramic-card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="ceramic-inset p-2">
                <User className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">Seus Dados</h2>
                <p className="text-xs text-ceramic-text-secondary">
                  Preencha suas informacoes para o treinador
                </p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  setErrors(prev => ({ ...prev, name: undefined }));
                }}
                className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="Seu nome completo"
                autoFocus
              />
              {errors.name && <p className="text-xs text-ceramic-error mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="seu@email.com"
              />
              {errors.email && <p className="text-xs text-ceramic-error mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider mb-2">
                WhatsApp *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, phone: e.target.value }));
                  setErrors(prev => ({ ...prev, phone: undefined }));
                }}
                className="w-full ceramic-inset px-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                placeholder="+5511987654321"
              />
              {errors.phone && <p className="text-xs text-ceramic-error mt-1">{errors.phone}</p>}
            </div>

            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={isSaving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-ceramic-text-secondary/20 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Health Documentation */}
        {step === 'health' && (
          <div className="ceramic-card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="ceramic-inset p-2">
                <Heart className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">Documentacao de Saude</h2>
                <p className="text-xs text-ceramic-text-secondary">
                  Seu treinador requer os seguintes documentos
                </p>
              </div>
            </div>

            {healthDocs.length > 0 ? (
              <div className="space-y-3">
                {healthDocs.map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center gap-3 p-3 ceramic-inset rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ceramic-text-primary">{doc}</p>
                      <p className="text-xs text-ceramic-text-secondary">Pendente</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-ceramic-warning" />
                  </div>
                ))}

                <div className="flex items-start gap-3 p-3 bg-ceramic-info/10 border border-ceramic-info/20 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-ceramic-info mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-ceramic-text-primary leading-relaxed">
                    Voce podera enviar estes documentos apos criar sua conta.
                    A prescricao de treinos sera liberada apos aprovacao do treinador.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-ceramic-success/10 border border-ceramic-success/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-ceramic-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-ceramic-text-primary">
                  Nenhuma documentacao adicional necessaria. Voce pode comecar a treinar!
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleHealthAcknowledged}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {user ? 'Concluir Cadastro' : 'Criar Minha Conta'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3: Account Creation */}
        {step === 'account' && (
          <div className="ceramic-card p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="ceramic-inset p-2">
                <ShieldCheck className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">Criar Conta AICA</h2>
                <p className="text-xs text-ceramic-text-secondary">
                  Crie sua conta para acessar seus treinos
                </p>
              </div>
            </div>

            <p className="text-sm text-ceramic-text-primary leading-relaxed">
              Para acessar sua prescricao de treinos e enviar documentos de saude,
              voce precisa de uma conta na plataforma AICA.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCreateAccount}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Entrar / Criar Conta
              </button>

              <p className="text-xs text-ceramic-text-secondary text-center">
                Voce sera redirecionado de volta apos fazer login
              </p>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="ceramic-card p-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            >
              <div className="w-20 h-20 rounded-full bg-ceramic-success/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-ceramic-success" />
              </div>
            </motion.div>
            <h2 className="text-xl font-black text-ceramic-text-primary">Tudo pronto!</h2>
            <p className="text-sm text-ceramic-text-secondary">
              Sua conta foi vinculada ao treinador. Redirecionando para seus treinos...
            </p>
            <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin mx-auto" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
