/**
 * WhatsAppPairingStep Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Simplified pairing flow:
 * - Phone number input with country code
 * - Validates phone → transitions directly to PairingCodeDisplay
 * - PairingCodeDisplay handles all backend calls (session + instance + code)
 * - Connection status via realtime subscription from parent
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { PairingCodeDisplay } from './PairingCodeDisplay';
import { createNamespacedLogger } from '@/lib/logger';
import type { WhatsAppSession } from '@/types/whatsappSession';

const log = createNamespacedLogger('WhatsAppPairingStep');

interface WhatsAppPairingStepProps {
  /** Callback when pairing is successful */
  onSuccess: () => void;
  /** Callback to go back */
  onBack: () => void;
  /** Session data from parent (avoids duplicate subscription) */
  session?: WhatsAppSession | null;
  /** Whether the session is connected */
  isConnected?: boolean;
  /** Session status string */
  sessionStatus?: string | null;
  /** Optional className */
  className?: string;
}

type PairingState = 'input' | 'pairing' | 'connected';

export function WhatsAppPairingStep({
  onSuccess,
  onBack,
  session,
  isConnected = false,
  sessionStatus,
  className = '',
}: WhatsAppPairingStepProps) {
  const [state, setState] = useState<PairingState>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount - only run once
  const hasCheckedSessionRef = useRef(false);

  useEffect(() => {
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

    // If there's an existing session in connecting/pending state WITH a phone number, skip to pairing
    if (session && (session.status === 'connecting' || session.status === 'pending')) {
      log.debug('Found existing session in connecting state:', session.instance_name);
      if (session.phone_number && session.phone_number.replace(/\D/g, '').length >= 10) {
        const phone = session.phone_number.replace(/^55/, '');
        setPhoneNumber(phone);
        if (phone.length >= 10) {
          setFormattedPhone(`(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`);
        }
        setState('pairing');
      }
    }
  }, [session]);

  // Auto-detect when WhatsApp is connected via webhook
  useEffect(() => {
    if (isConnected && state === 'pairing') {
      log.debug('Connection detected via realtime subscription!');
      setState('connected');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  }, [isConnected, state, onSuccess]);

  // Format phone number as user types
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhoneNumber(value);

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

  // Handle form submit - just validate phone and go to pairing
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (phoneNumber.length < 10) return;

      setError(null);
      log.debug('Phone validated, transitioning to pairing state');
      setState('pairing');
    },
    [phoneNumber]
  );

  // Handle pairing success
  const handlePairingSuccess = useCallback(() => {
    setState('connected');
    setTimeout(() => {
      onSuccess();
    }, 1500);
  }, [onSuccess]);

  // Handle code generated
  const handleCodeGenerated = useCallback((code: string) => {
    log.debug('Pairing code generated:', code);
  }, []);

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
      {state === 'pairing' && (
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
