/**
 * WhatsAppPairingStep Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Second step of the onboarding flow:
 * - Phone number input with country code
 * - Pairing code display with countdown
 * - Connection status polling
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { PairingCodeDisplay } from './PairingCodeDisplay';
import { supabase } from '@/services/supabaseClient';
import { useWhatsAppSessionSubscription } from '@/hooks/useWhatsAppSessionSubscription';
import { createNamespacedLogger } from '@/lib/logger';
import type { CreateInstanceResponse } from '@/types/whatsappSession';

const log = createNamespacedLogger('WhatsAppPairingStep');

interface WhatsAppPairingStepProps {
  /** Callback when pairing is successful */
  onSuccess: () => void;
  /** Callback to go back */
  onBack: () => void;
  /** Optional className */
  className?: string;
}

type PairingState = 'input' | 'creating' | 'pairing' | 'connected';

export function WhatsAppPairingStep({
  onSuccess,
  onBack,
  className = '',
}: WhatsAppPairingStepProps) {
  const [state, setState] = useState<PairingState>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Subscribe to session changes for automatic connection detection
  const { session, isConnected, status: sessionStatus, isLoading: isLoadingSession } = useWhatsAppSessionSubscription();

  // Check for existing session on mount
  useEffect(() => {
    if (isLoadingSession) return;

    // If there's an existing session in connecting/pairing state, skip to pairing
    if (session && (session.status === 'connecting' || session.status === 'pairing')) {
      log.debug(' Found existing session in connecting state:', session.instance_name);
      setInstanceName(session.instance_name);
      // Extract phone from session if available
      if (session.phone_number) {
        const phone = session.phone_number.replace(/^55/, '');
        setPhoneNumber(phone);
        // Format for display
        if (phone.length >= 10) {
          setFormattedPhone(`(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`);
        }
      }
      setState('pairing');
    }
    setIsCheckingSession(false);
  }, [session, isLoadingSession]);

  // Auto-detect when WhatsApp is connected via webhook
  useEffect(() => {
    if (isConnected && (state === 'pairing' || state === 'creating')) {
      log.debug(' Connection detected via realtime subscription!');
      setState('connected');
      // Delay before advancing to next step
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  }, [isConnected, state, onSuccess]);

  // Format phone number as user types
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhoneNumber(value);

    // Format for display: (XX) XXXXX-XXXX
    if (value.length <= 2) {
      setFormattedPhone(value);
    } else if (value.length <= 7) {
      setFormattedPhone(`(${value.slice(0, 2)}) ${value.slice(2)}`);
    } else {
      setFormattedPhone(
        `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`
      );
    }
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (phoneNumber.length < 10) return;

      try {
        setError(null);
        setIsCreatingInstance(true);
        setState('creating');

        log.debug(' Creating user instance...');

        // CRITICAL: Create instance BEFORE generating pairing code
        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (!authSession?.access_token) {
          throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
        }

        // Call create-user-instance Edge Function
        const response = await supabase.functions.invoke('create-user-instance', {
          body: {},
          headers: {
            Authorization: `Bearer ${authSession.access_token}`,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Falha ao criar instância WhatsApp');
        }

        const result = response.data as CreateInstanceResponse;

        if (!result.success || !result.session) {
          throw new Error(result.error || 'Falha ao criar instância WhatsApp');
        }

        log.debug(' Instance created:', result.session.instance_name);
        setInstanceName(result.session.instance_name);
        setIsCreatingInstance(false);
        setState('pairing');

        // Now proceed to pairing code display
        // PairingCodeDisplay will handle code generation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        setIsCreatingInstance(false);
        setState('input');
        log.error(' Error creating instance:', errorMessage);
      }
    },
    [phoneNumber]
  );

  // Handle pairing success
  const handlePairingSuccess = useCallback(() => {
    setState('connected');
    // Small delay before moving to next step
    setTimeout(() => {
      onSuccess();
    }, 1500);
  }, [onSuccess]);

  // Handle code generated
  const handleCodeGenerated = useCallback((code: string) => {
    log.debug('Pairing code generated:', code);
    // Could poll for connection status here
  }, []);

  // Show loading while checking for existing session
  if (isCheckingSession || isLoadingSession) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-4" />
        <p className="text-ceramic-600">Verificando conexão existente...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-ceramic-500 hover:text-ceramic-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <h2 className="text-2xl font-bold text-ceramic-900">
          Conectar WhatsApp
        </h2>
        <p className="text-ceramic-600 mt-1">
          {error
            ? 'Erro ao conectar - Tente novamente'
            : state === 'input'
            ? 'Digite seu número de telefone para gerar o código'
            : state === 'creating'
            ? 'Preparando sua instância WhatsApp...'
            : state === 'pairing'
            ? 'Digite o código no WhatsApp do seu celular'
            : 'WhatsApp conectado com sucesso!'}
        </p>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Creating Instance State */}
      {state === 'creating' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-12"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-ceramic-900 mb-2">
            Criando instância...
          </h3>
          <p className="text-ceramic-500 text-sm text-center max-w-sm">
            Aguarde enquanto preparamos sua conexão WhatsApp
          </p>
          <div className="mt-4 p-3 bg-ceramic-50 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-ceramic-600">
              <Phone className="w-4 h-4" />
              <span>+55 {formattedPhone}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Phone Input State */}
      {state === 'input' && (
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-ceramic-700 mb-2"
            >
              Número do WhatsApp
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-ceramic-500 font-medium">+55</span>
              </div>
              <input
                type="tel"
                id="phone"
                value={formattedPhone}
                onChange={handlePhoneChange}
                placeholder="(11) 98765-4321"
                className="w-full pl-14 pr-4 py-4 text-lg border-2 border-ceramic-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                maxLength={16}
                autoFocus
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <Phone className="w-5 h-5 text-ceramic-400" />
              </div>
            </div>
            <p className="mt-2 text-sm text-ceramic-500">
              Este deve ser o número vinculado ao seu WhatsApp
            </p>
          </div>

          <button
            type="submit"
            disabled={phoneNumber.length < 10}
            className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-ceramic-300 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            Gerar código de pareamento
          </button>
        </motion.form>
      )}

      {/* Pairing State */}
      {state === 'pairing' && instanceName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="p-4 bg-ceramic-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-ceramic-500" />
              <span className="text-ceramic-700">+55 {formattedPhone}</span>
              <button
                onClick={() => {
                  setState('input');
                  setError(null);
                }}
                className="ml-auto text-sm text-green-600 hover:text-green-500"
              >
                Alterar
              </button>
            </div>
          </div>

          <PairingCodeDisplay
            phoneNumber={`55${phoneNumber}`}
            onCodeGenerated={handleCodeGenerated}
            onPairingSuccess={handlePairingSuccess}
          />

          {/* Connection monitoring indicator */}
          <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-blue-700">
              Aguardando conexão... {sessionStatus && `(${sessionStatus})`}
            </span>
          </div>

          {/* Manual success button for testing */}
          <div className="pt-4 border-t border-ceramic-100">
            <button
              onClick={handlePairingSuccess}
              className="w-full py-3 text-green-600 hover:bg-green-50 font-medium rounded-xl transition-colors"
            >
              Já conectei meu WhatsApp
            </button>
          </div>
        </motion.div>
      )}

      {/* Connected State */}
      {state === 'connected' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-12"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
          </div>

          <h3 className="text-xl font-bold text-ceramic-900">Conectado!</h3>
          <p className="text-ceramic-600 mt-1">
            Preparando sincronização...
          </p>

          <Loader2 className="w-6 h-6 text-green-600 animate-spin mt-6" />
        </motion.div>
      )}
    </div>
  );
}

export default WhatsAppPairingStep;
