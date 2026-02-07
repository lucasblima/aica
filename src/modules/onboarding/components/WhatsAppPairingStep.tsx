/**
 * WhatsAppPairingStep Component
 * Jony Ive-inspired: minimal, serene, confident whitespace
 *
 * Flow: input → pairing → connected
 * PairingCodeDisplay handles all backend calls
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { PairingCodeDisplay } from './PairingCodeDisplay';
import { createNamespacedLogger } from '@/lib/logger';
import type { WhatsAppSession } from '@/types/whatsappSession';

const log = createNamespacedLogger('WhatsAppPairingStep');

interface WhatsAppPairingStepProps {
  onSuccess: () => void;
  onBack: () => void;
  session?: WhatsAppSession | null;
  isConnected?: boolean;
  sessionStatus?: string | null;
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

  const hasCheckedSessionRef = useRef(false);

  useEffect(() => {
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

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

  useEffect(() => {
    if (isConnected && state === 'pairing') {
      log.debug('Connection detected via realtime subscription!');
      setState('connected');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  }, [isConnected, state, onSuccess]);

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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (phoneNumber.length < 10) return;
      log.debug('Phone validated, transitioning to pairing state');
      setState('pairing');
    },
    [phoneNumber]
  );

  const handlePairingSuccess = useCallback(() => {
    setState('connected');
    setTimeout(() => {
      onSuccess();
    }, 2000);
  }, [onSuccess]);

  const handleCodeGenerated = useCallback((code: string) => {
    log.debug('Pairing code generated:', code);
  }, []);

  const subtitleText = state === 'input'
    ? 'Digite seu número para conectar'
    : state === 'pairing'
    ? 'Insira o código no WhatsApp'
    : 'Conectado com sucesso';

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header — minimal, confident */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="mb-8"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>

        <h2 className="text-xl font-semibold text-ceramic-text-primary tracking-tight">
          Conectar WhatsApp
        </h2>
        <p className="text-sm text-ceramic-text-secondary mt-1">
          {subtitleText}
        </p>
      </motion.div>

      {/* ── Phone Input ── */}
      {state === 'input' && (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          <div>
            <label
              htmlFor="phone"
              className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ceramic-text-secondary mb-3"
            >
              Número do WhatsApp
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-5">
                <span className="text-ceramic-text-secondary text-sm font-medium">+55</span>
              </div>
              <input
                type="tel"
                id="phone"
                value={formattedPhone}
                onChange={handlePhoneChange}
                placeholder="(11) 98765-4321"
                className="w-full pl-14 pr-5 py-4 text-lg bg-white/70 backdrop-blur-sm rounded-2xl
                  border border-ceramic-cool-hover focus:border-ceramic-accent
                  outline-none transition-all duration-300
                  text-ceramic-text-primary placeholder:text-ceramic-text-secondary/40"
                style={{
                  boxShadow: '0 2px 8px rgba(163, 158, 145, 0.06)',
                }}
                maxLength={16}
                autoFocus
              />
            </div>
            <p className="mt-3 text-xs text-ceramic-text-secondary">
              O número vinculado ao seu WhatsApp
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={phoneNumber.length < 10}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed"
            style={{
              background: phoneNumber.length >= 10
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : '#E8EBE9',
              color: phoneNumber.length >= 10 ? 'white' : '#948D82',
              boxShadow: phoneNumber.length >= 10
                ? '0 4px 12px rgba(217, 119, 6, 0.25)'
                : 'none',
            }}
            whileHover={phoneNumber.length >= 10 ? { scale: 1.01 } : {}}
            whileTap={phoneNumber.length >= 10 ? { scale: 0.99 } : {}}
          >
            Gerar código de pareamento
          </motion.button>
        </motion.form>
      )}

      {/* ── Pairing State ── */}
      {state === 'pairing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Phone number pill */}
          <div
            className="flex items-center justify-between px-5 py-3 rounded-2xl bg-white/60 backdrop-blur-sm"
            style={{
              border: '1px solid rgba(163, 158, 145, 0.1)',
            }}
          >
            <span className="text-sm text-ceramic-text-primary">+55 {formattedPhone}</span>
            <button
              onClick={() => setState('input')}
              className="text-xs font-medium text-ceramic-accent hover:text-ceramic-accent-dark transition-colors"
            >
              Alterar
            </button>
          </div>

          <PairingCodeDisplay
            phoneNumber={`55${phoneNumber}`}
            onCodeGenerated={handleCodeGenerated}
            onPairingSuccess={handlePairingSuccess}
          />

          {/* Connection monitoring — breathing dot */}
          <motion.div
            className="flex items-center justify-center gap-2.5 py-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#D97706' }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-xs text-ceramic-text-secondary">
              Aguardando conexão{sessionStatus === 'connecting' ? '...' : ''}
            </span>
          </motion.div>

          {/* Manual confirmation — subtle, not loud */}
          <div className="pt-2">
            <button
              onClick={handlePairingSuccess}
              className="w-full py-3 text-sm font-medium text-ceramic-text-secondary
                hover:text-ceramic-text-primary hover:bg-ceramic-cool/50 rounded-xl transition-all"
            >
              Já conectei meu WhatsApp
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Connected State ── */}
      {state === 'connected' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center py-16"
        >
          {/* Success orb */}
          <div className="relative w-20 h-20 flex items-center justify-center mb-8">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(107, 123, 92, 0.12) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(107, 123, 92, 0.1)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 15 }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              >
                <Check className="w-6 h-6 text-ceramic-positive" strokeWidth={2.5} />
              </motion.div>
            </motion.div>
          </div>

          <h3 className="text-lg font-semibold text-ceramic-text-primary">
            Conectado
          </h3>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Sincronizando contatos...
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default WhatsAppPairingStep;
