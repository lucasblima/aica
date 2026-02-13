/**
 * WhatsAppStepContent Component
 * Issue #100 - Step de conexao WhatsApp no wizard de organizacoes
 *
 * Permite importar conversas do WhatsApp durante o wizard,
 * com gamificacao e feedback visual.
 *
 * Updated: Removed Evolution API — now uses WhatsApp export import.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Shield,
  Clock,
  Users,
  Upload,
} from 'lucide-react';
import { WhatsAppExportUpload } from '@/modules/connections/components/whatsapp/WhatsAppExportUpload';
import { STEP_COMPLETION_BONUS } from '../../types/wizard';

// =============================================================================
// Types
// =============================================================================

interface WhatsAppStepContentProps {
  /** Telefone da organizacao (do step de contato) */
  organizationPhone?: string;
  /** Callback quando importacao e bem-sucedida */
  onConnectionSuccess?: () => void;
  /** Callback para conceder XP */
  onAwardXP?: (xp: number) => void;
  /** Se a importacao ja foi feita anteriormente */
  isAlreadyConnected?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const WHATSAPP_IMPORT_XP = 50;

const BENEFITS = [
  {
    icon: Users,
    title: 'Analise de Contatos',
    description: 'Descubra insights sobre seus parceiros e colaboradores',
  },
  {
    icon: Clock,
    title: 'Deteccao de Tarefas',
    description: 'Tarefas e compromissos detectados automaticamente',
  },
  {
    icon: Shield,
    title: 'Privacidade Garantida',
    description: 'Mensagens nunca sao armazenadas, apenas resumos',
  },
];

// =============================================================================
// Main Component
// =============================================================================

export function WhatsAppStepContent({
  onConnectionSuccess,
  onAwardXP,
  isAlreadyConnected = false,
}: WhatsAppStepContentProps) {
  const [isImported, setIsImported] = useState(isAlreadyConnected);
  const [showReward, setShowReward] = useState(false);
  const [hasAwardedXP, setHasAwardedXP] = useState(isAlreadyConnected);

  const handleImportSuccess = useCallback(() => {
    if (!hasAwardedXP) {
      setIsImported(true);
      setShowReward(true);
      setHasAwardedXP(true);
      onAwardXP?.(WHATSAPP_IMPORT_XP);
      onConnectionSuccess?.();
      setTimeout(() => setShowReward(false), 2000);
    }
  }, [hasAwardedXP, onAwardXP, onConnectionSuccess]);

  return (
    <div className="space-y-6">
      {/* Header com XP disponivel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-ceramic-success-bg flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-ceramic-success" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Importar WhatsApp
            </h3>
            <p className="text-sm text-ceramic-text-secondary">
              {isImported
                ? 'Conversas importadas com sucesso!'
                : 'Importe conversas relevantes da organizacao'
              }
            </p>
          </div>
        </div>

        {/* XP Badge */}
        <div className="relative">
          <div className={`
            px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5
            ${isImported
              ? 'bg-ceramic-success-bg text-ceramic-success'
              : 'bg-amber-100 text-amber-600'
            }
          `}>
            <Sparkles className="w-4 h-4" />
            <span>{isImported ? 'Importado' : `+${WHATSAPP_IMPORT_XP} XP`}</span>
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
                +{WHATSAPP_IMPORT_XP} XP
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status Indicator */}
      {isImported ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-ceramic-success-bg border border-ceramic-success/20 rounded-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-ceramic-success-bg flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-ceramic-success" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-ceramic-success">
                Conversas Importadas!
              </h4>
              <p className="text-sm text-ceramic-success">
                O AICA esta analisando suas conversas para extrair insights,
                contatos e oportunidades relevantes.
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
                className="p-4 bg-ceramic-base rounded-xl"
              >
                <benefit.icon className="w-5 h-5 text-ceramic-success mb-2" />
                <h4 className="text-sm font-bold text-ceramic-text-primary">
                  {benefit.title}
                </h4>
                <p className="text-xs text-ceramic-text-secondary mt-1">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Import Upload Component */}
          <WhatsAppExportUpload />

          {/* Skip Option */}
          <div className="text-center pt-4 border-t border-ceramic-border">
            <p className="text-sm text-ceramic-text-secondary mb-2">
              Voce pode pular esta etapa e importar depois
            </p>
            <p className="text-xs text-ceramic-text-secondary">
              A importacao pode ser feita a qualquer momento em Conexoes &gt; Importar
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default WhatsAppStepContent;
