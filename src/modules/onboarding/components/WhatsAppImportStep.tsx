/**
 * WhatsAppImportStep Component
 *
 * Onboarding step that guides users through importing their WhatsApp conversations
 * via the native WhatsApp export feature (100% legal, zero ban risk).
 *
 * Replaces WhatsAppPairingStep + ContactsSyncStep (Evolution API removed).
 */

import { motion } from 'framer-motion';
import { ArrowLeft, Upload, MessageSquare, Shield, Smartphone } from 'lucide-react';
import { WhatsAppExportUpload } from '@/modules/connections/components/whatsapp/WhatsAppExportUpload';

interface WhatsAppImportStepProps {
  onComplete: () => void;
  onBack: () => void;
  className?: string;
}

export function WhatsAppImportStep({
  onComplete,
  onBack,
  className = '',
}: WhatsAppImportStepProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="mb-6"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>

        <h2 className="text-xl font-semibold text-ceramic-text-primary tracking-tight">
          Importar Conversas
        </h2>
        <p className="text-sm text-ceramic-text-secondary mt-1">
          Exporte suas conversas do WhatsApp e importe aqui para o AICA analisar
        </p>
      </motion.div>

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-start gap-3 p-4 bg-ceramic-success/10 rounded-xl mb-6"
      >
        <Shield className="w-5 h-5 text-ceramic-success flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-ceramic-text-primary">100% Legal e Seguro</p>
          <p className="text-ceramic-success mt-1">
            Usa o recurso oficial de exportacao do WhatsApp. Suas mensagens originais
            nunca sao armazenadas — apenas resumos anonimizados.
          </p>
        </div>
      </motion.div>

      {/* Upload Component */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <WhatsAppExportUpload />
      </motion.div>

      {/* Skip Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 text-center"
      >
        <button
          onClick={onComplete}
          className="text-ceramic-text-secondary hover:text-ceramic-text-primary text-sm transition-colors"
        >
          Pular por enquanto — importar depois
        </button>
      </motion.div>
    </div>
  );
}

export default WhatsAppImportStep;
