/**
 * WhatsAppStepContent Component
 * Issue #100 - Step de conexao WhatsApp no wizard de organizacoes
 *
 * Permite conectar o WhatsApp da organizacao durante o wizard,
 * com gamificacao e feedback visual.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Phone,
  ArrowRight,
  Shield,
  Clock,
  Users,
} from 'lucide-react';
import { ConnectionStatusCard } from '@/modules/connections/components/whatsapp/ConnectionStatusCard';
import { STEP_COMPLETION_BONUS } from '../../types/wizard';

// =============================================================================
// Types
// =============================================================================

interface WhatsAppStepContentProps {
  /** Telefone da organizacao (do step de contato) */
  organizationPhone?: string;
  /** Callback quando conexao e bem-sucedida */
  onConnectionSuccess?: () => void;
  /** Callback para conceder XP */
  onAwardXP?: (xp: number) => void;
  /** Se a conexao ja foi feita anteriormente */
  isAlreadyConnected?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const WHATSAPP_CONNECTION_XP = 50; // XP bonus por conectar WhatsApp

const BENEFITS = [
  {
    icon: Users,
    title: 'Atendimento Automatizado',
    description: 'Responda parceiros e interessados 24/7',
  },
  {
    icon: Clock,
    title: 'Notificacoes em Tempo Real',
    description: 'Receba alertas de editais e oportunidades',
  },
  {
    icon: Shield,
    title: 'Comunicacao Segura',
    description: 'Seus dados protegidos com criptografia',
  },
];

// =============================================================================
// Main Component
// =============================================================================

export function WhatsAppStepContent({
  organizationPhone = '',
  onConnectionSuccess,
  onAwardXP,
  isAlreadyConnected = false,
}: WhatsAppStepContentProps) {
  const [isConnected, setIsConnected] = useState(isAlreadyConnected);
  const [showReward, setShowReward] = useState(false);
  const [hasAwaredXP, setHasAwardedXP] = useState(isAlreadyConnected);

  // Handle successful connection
  const handleConnectionSuccess = useCallback(() => {
    if (!hasAwaredXP) {
      setIsConnected(true);
      setShowReward(true);
      setHasAwardedXP(true);

      // Award XP for connection
      onAwardXP?.(WHATSAPP_CONNECTION_XP);
      onConnectionSuccess?.();

      // Hide reward after animation
      setTimeout(() => setShowReward(false), 2000);
    }
  }, [hasAwaredXP, onAwardXP, onConnectionSuccess]);

  // Clean phone number for pairing code
  const cleanedPhone = organizationPhone.replace(/\D/g, '');
  const formattedPhone = cleanedPhone.length >= 10
    ? `55${cleanedPhone}` // Adiciona codigo do Brasil se necessario
    : '';

  return (
    <div className="space-y-6">
      {/* Header com XP disponivel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Conectar WhatsApp
            </h3>
            <p className="text-sm text-gray-500">
              {isConnected
                ? 'WhatsApp conectado com sucesso!'
                : 'Vincule o WhatsApp da sua organizacao'
              }
            </p>
          </div>
        </div>

        {/* XP Badge */}
        <div className="relative">
          <div className={`
            px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5
            ${isConnected
              ? 'bg-green-100 text-green-600'
              : 'bg-amber-100 text-amber-600'
            }
          `}>
            <Sparkles className="w-4 h-4" />
            <span>{isConnected ? 'Conectado' : `+${WHATSAPP_CONNECTION_XP} XP`}</span>
          </div>

          {/* XP Reward Animation */}
          <AnimatePresence>
            {showReward && (
              <motion.div
                className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-sm font-bold rounded-full shadow-lg whitespace-nowrap"
                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                animate={{ opacity: 1, y: -10, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.5 }}
              >
                +{WHATSAPP_CONNECTION_XP} XP
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status Indicator */}
      {isConnected ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-green-50 border border-green-200 rounded-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-green-800">
                WhatsApp Conectado!
              </h4>
              <p className="text-sm text-green-600">
                Sua organizacao agora pode receber notificacoes e se comunicar
                com parceiros diretamente pelo WhatsApp.
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BENEFITS.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-50 rounded-xl"
              >
                <benefit.icon className="w-5 h-5 text-green-600 mb-2" />
                <h4 className="text-sm font-bold text-gray-900">
                  {benefit.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Phone Number Info */}
          {organizationPhone && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Phone className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Numero detectado: {organizationPhone}
                </p>
                <p className="text-xs text-blue-600">
                  Usaremos este numero para gerar o codigo de pareamento
                </p>
              </div>
            </div>
          )}

          {/* Connection Card */}
          <ConnectionStatusCard
            phoneNumber={formattedPhone}
            showQRCode={true}
            autoRefresh={true}
            refreshInterval={5000}
            defaultMethod="pairing"
            className="!p-0 !shadow-none !rounded-none"
          />

          {/* Skip Option */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">
              Voce pode pular esta etapa e conectar depois
            </p>
            <p className="text-xs text-gray-400">
              O WhatsApp pode ser configurado a qualquer momento nas configuracoes
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default WhatsAppStepContent;
