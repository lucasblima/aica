/**
 * CoachInviteView — Public page for reusable coach invite links ("Link Coringa")
 *
 * Route: /join/:token (public, no auth required)
 *
 * Flow:
 * 1. Load link info via RPC (coach name, health config, usage)
 * 2. Athlete fills name, email, phone
 * 3. Submit creates athlete record atomically via RPC
 * 4. Redirect to /onboarding/:athleteId for account creation
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
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Dumbbell,
  Users,
  Link2,
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

// ============================================
// Types
// ============================================

interface LinkInfo {
  coach_name: string;
  health_config: {
    requires_cardio_exam: boolean;
    requires_clearance_cert: boolean;
    allow_parq_onboarding: boolean;
  };
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  general?: string;
}

type ViewStep = 'loading' | 'form' | 'submitting' | 'success' | 'error';

// ============================================
// Component
// ============================================

export default function CoachInviteView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<ViewStep>('loading');
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [createdAthleteId, setCreatedAthleteId] = useState<string | null>(null);

  // Load link info
  useEffect(() => {
    if (!token) {
      setStep('error');
      setErrorMessage('Link invalido.');
      return;
    }

    const loadLinkInfo = async () => {
      try {
        const { data, error } = await supabase.rpc('get_coach_invite_link', { p_token: token });

        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          setStep('error');
          setErrorMessage('Link nao encontrado. Verifique com seu treinador.');
          return;
        }

        const info = (Array.isArray(data) ? data[0] : data) as LinkInfo;

        // Check if link is still valid
        if (!info.is_active) {
          setStep('error');
          setErrorMessage('Este link foi desativado pelo treinador.');
          return;
        }

        if (info.current_uses >= info.max_uses) {
          setStep('error');
          setErrorMessage('Este link atingiu o limite de usos. Peca um novo link ao seu treinador.');
          return;
        }

        if (info.expires_at && new Date(info.expires_at) < new Date()) {
          setStep('error');
          setErrorMessage('Este link expirou. Peca um novo link ao seu treinador.');
          return;
        }

        setLinkInfo(info);
        setStep('form');
      } catch (err) {
        console.error('[CoachInviteView] Error loading link:', err);
        setStep('error');
        setErrorMessage('Erro ao carregar dados. Tente novamente.');
      }
    };

    loadLinkInfo();
  }, [token]);

  // Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

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

  // Submit form
  const handleSubmit = async () => {
    if (!validate() || !token) return;

    setStep('submitting');
    try {
      const { data, error } = await supabase.rpc('use_coach_invite_link', {
        p_token: token,
        p_name: formData.name.trim(),
        p_email: formData.email.trim(),
        p_phone: formData.phone.trim(),
      });

      if (error) {
        console.error('[CoachInviteView] RPC error:', error);
        setStep('form');
        setErrors({ general: error.message || 'Erro ao criar cadastro. Tente novamente.' });
        return;
      }

      const athleteId = typeof data === 'string' ? data : (data as any)?.athlete_id;
      if (!athleteId) {
        setStep('form');
        setErrors({ general: 'Erro inesperado. Tente novamente.' });
        return;
      }

      setCreatedAthleteId(athleteId);
      setStep('success');

      // Redirect to existing onboarding flow for account creation
      setTimeout(() => {
        navigate(`/onboarding/${athleteId}`, { replace: true });
      }, 2000);
    } catch (err) {
      console.error('[CoachInviteView] Error submitting:', err);
      setStep('form');
      setErrors({ general: 'Erro ao criar cadastro. Tente novamente.' });
    }
  };

  // ============================================
  // Health docs display
  // ============================================

  const healthDocs = linkInfo ? [
    ...(linkInfo.health_config.requires_cardio_exam ? ['Exame Cardiologico'] : []),
    ...(linkInfo.health_config.requires_clearance_cert ? ['Atestado de Liberacao Medica'] : []),
    ...(linkInfo.health_config.allow_parq_onboarding ? ['Questionario PAR-Q+'] : []),
  ] : [];

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
  // Success — redirecting to onboarding
  // ============================================

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ceramic-base px-6">
        <div className="ceramic-card p-8 max-w-md text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
          >
            <div className="w-20 h-20 rounded-full bg-ceramic-success/15 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-ceramic-success" />
            </div>
          </motion.div>
          <h2 className="text-xl font-black text-ceramic-text-primary">Cadastro criado!</h2>
          <p className="text-sm text-ceramic-text-secondary">
            Redirecionando para completar seu perfil...
          </p>
          <Loader2 className="w-5 h-5 text-ceramic-text-secondary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // ============================================
  // Main form (step === 'form' or 'submitting')
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
        {linkInfo?.coach_name && (
          <p className="text-sm text-ceramic-text-secondary mt-2">
            Convite de <strong>{linkInfo.coach_name}</strong>
          </p>
        )}
      </div>

      {/* Link info badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">
            Link Coringa
          </span>
        </div>
        {linkInfo && (
          <span className="text-[10px] text-ceramic-text-secondary">
            {linkInfo.current_uses}/{linkInfo.max_uses} usos
          </span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md space-y-4"
      >
        {/* General error */}
        {errors.general && (
          <div className="flex items-start gap-3 p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-ceramic-error mt-0.5 flex-shrink-0" />
            <p className="text-sm text-ceramic-error">{errors.general}</p>
          </div>
        )}

        {/* Personal info form */}
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
              disabled={step === 'submitting'}
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
              disabled={step === 'submitting'}
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
              disabled={step === 'submitting'}
            />
            {errors.phone && <p className="text-xs text-ceramic-error mt-1">{errors.phone}</p>}
          </div>
        </div>

        {/* Health requirements info */}
        {healthDocs.length > 0 && (
          <div className="ceramic-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="ceramic-inset p-2">
                <Heart className="w-5 h-5 text-ceramic-text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ceramic-text-primary">Requisitos de Saude</h3>
                <p className="text-xs text-ceramic-text-secondary">
                  Documentos exigidos pelo treinador
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {healthDocs.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 p-3 ceramic-inset rounded-lg"
                >
                  <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-medium text-ceramic-text-primary">{doc}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-ceramic-text-secondary leading-relaxed">
              Voce podera enviar estes documentos apos criar sua conta.
            </p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={step === 'submitting'}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-ceramic-text-secondary/20 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {step === 'submitting' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Comecar Cadastro
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Footer info */}
        <p className="text-[10px] text-ceramic-text-secondary text-center leading-relaxed">
          Ao continuar, voce sera redirecionado para completar seu perfil e criar uma conta na plataforma AICA.
        </p>
      </motion.div>
    </div>
  );
}
