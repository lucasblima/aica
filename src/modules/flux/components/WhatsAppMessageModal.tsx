/**
 * WhatsAppMessageModal - AI-generated message composer for athlete follow-up
 *
 * Generates contextual messages based on athlete's consistency rate and status.
 * Opens WhatsApp with pre-filled message for coach convenience.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, MessageCircle, Send, RefreshCw, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import type { AthleteWithMetrics, Alert } from '../types';
import { LEVEL_LABELS } from '../types';

interface WhatsAppMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: AthleteWithMetrics;
  alerts?: Alert[];
}

// Message templates based on context
const generateMessage = (athlete: AthleteWithMetrics, alerts: Alert[] = []): string => {
  const firstName = athlete.name.split(' ')[0];
  const consistency = athlete.consistency_rate || 0;
  const hasHealthAlert = alerts.some((a) => a.alert_type === 'health');
  const hasMotivationAlert = alerts.some((a) => a.alert_type === 'motivation');
  const hasAbsenceAlert = alerts.some((a) => a.alert_type === 'absence');

  // Critical: Health concern
  if (hasHealthAlert) {
    return `Oi ${firstName}, tudo bem? 🏊‍♂️

Vi que voce relatou algum desconforto no ultimo treino. Como esta se sentindo agora?

Sua saude e a prioridade. Se precisar, podemos ajustar o treino ou fazer uma pausa ate voce estar 100%.

Me conta como posso te ajudar! 💪`;
  }

  // Motivation issue
  if (hasMotivationAlert) {
    return `Oi ${firstName}! 👋

Percebi que as coisas andam mais dificeis ultimamente. Quero te ouvir - o que esta acontecendo?

Lembre-se: todo atleta passa por fases assim. O importante e nao desistir. Vamos conversar e encontrar juntos um caminho que funcione pra voce.

Estou aqui pra te apoiar! 🙌`;
  }

  // Absence
  if (hasAbsenceAlert) {
    return `Oi ${firstName}, tudo bem? 🏃‍♂️

Senti sua falta nos treinos! Esta tudo certo?

Se tiver alguma dificuldade com horarios ou com o treino em si, me avisa que a gente ajusta. O importante e manter a consistencia, mesmo que seja com menos intensidade.

Como posso te ajudar? 💬`;
  }

  // Low consistency (< 60%)
  if (consistency < 60) {
    return `Oi ${firstName}! 👋

Notei que sua adesao aos treinos esta em ${consistency}% esse mes. Quero entender melhor o que esta acontecendo.

Esta tendo alguma dificuldade? O treino esta muito puxado? Os horarios nao estao funcionando?

Me conta pra gente ajustar o que for preciso. Estou aqui pra te ajudar a alcancar seus objetivos! 💪`;
  }

  // Medium consistency (60-80%)
  if (consistency < 80) {
    return `E ai ${firstName}, tudo bem? 🏋️

Sua adesao esta em ${consistency}% - ja e um bom numero! Mas sei que voce pode mais.

O que esta faltando pra gente chegar nos 100%? Algum ajuste no treino ou na rotina que eu possa fazer?

Bora juntos nessa! 🚀`;
  }

  // Good consistency (>= 80%)
  return `Oi ${firstName}! 🌟

Parabens pela dedicacao! Sua adesao de ${consistency}% mostra que voce esta comprometido(a) com seus objetivos.

Como voce esta se sentindo com os treinos? Tem algo que gostaria de ajustar ou algum feedback?

Continue assim! 💪🔥`;
};

// Alternative messages for refresh
const getAlternativeMessage = (athlete: AthleteWithMetrics, variant: number): string => {
  const firstName = athlete.name.split(' ')[0];
  const consistency = athlete.consistency_rate || 0;

  const variants = [
    // Variant 1 - More casual
    `Fala ${firstName}! 👊

Passando pra saber como voce ta. Vi que a adesao ta em ${consistency}% - bora conversar sobre isso?

O que ta rolando? Posso te ajudar em algo?`,

    // Variant 2 - More professional
    `Ola ${firstName},

Gostaria de fazer um acompanhamento sobre seus treinos. Sua taxa de adesao atual e de ${consistency}%.

Podemos conversar sobre como otimizar sua rotina de treinos? Estou a disposicao.`,

    // Variant 3 - Motivational
    `${firstName}! 💪

Cada treino conta, cada esforco importa. Vi que sua adesao ta em ${consistency}%.

Vamos juntos superar qualquer obstaculo? Me conta o que precisa!`,
  ];

  return variants[variant % variants.length];
};

export function WhatsAppMessageModal({
  isOpen,
  onClose,
  athlete,
  alerts = [],
}: WhatsAppMessageModalProps) {
  const [messageVariant, setMessageVariant] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sent'>('idle');

  // Generate initial message
  const generatedMessage = useMemo(() => {
    if (messageVariant === 0) {
      return generateMessage(athlete, alerts);
    }
    return getAlternativeMessage(athlete, messageVariant - 1);
  }, [athlete, alerts, messageVariant]);

  // Current message (custom or generated)
  const currentMessage = isEditing ? customMessage : generatedMessage;

  // Handle edit start
  const handleStartEdit = () => {
    setCustomMessage(generatedMessage);
    setIsEditing(true);
  };

  // Handle regenerate
  const handleRegenerate = () => {
    setMessageVariant((v) => v + 1);
    setIsEditing(false);
  };

  // Sanitized phone number (remove +, spaces, dashes)
  const sanitizedPhone = useMemo(
    () => athlete.phone?.replace(/[+\s-]/g, '') ?? '',
    [athlete.phone]
  );

  // Handle send via WhatsApp
  const handleSendWhatsApp = useCallback(() => {
    if (sendStatus === 'sent' || !sanitizedPhone) return;
    const encodedMessage = encodeURIComponent(currentMessage);
    const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    setSendStatus('sent');
  }, [sanitizedPhone, currentMessage, sendStatus]);

  // Auto-close after successful send
  useEffect(() => {
    if (sendStatus === 'sent') {
      const timer = setTimeout(() => {
        setSendStatus('idle');
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [sendStatus, onClose]);

  // Reset all state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessageVariant(0);
      setIsEditing(false);
      setCustomMessage('');
      setSendStatus('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const consistency = athlete.consistency_rate || 0;
  const consistencyColor = consistency >= 80 ? 'text-ceramic-success' : consistency >= 60 ? 'text-ceramic-warning' : 'text-ceramic-error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-ceramic-base rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ceramic-text-secondary/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ceramic-success/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-ceramic-success" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ceramic-text-primary">
                Mensagem para {athlete.name.split(' ')[0]}
              </h2>
              <p className="text-xs text-ceramic-text-secondary">
                via WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sendStatus === 'sent'}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg ceramic-inset flex items-center justify-center hover:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Athlete Context */}
        <div className="p-4 bg-white/50 border-b border-ceramic-text-secondary/10">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-ceramic-text-secondary">
                <span className="font-medium">Nivel:</span> {LEVEL_LABELS[athlete.level]}
              </p>
              <p className="text-sm text-ceramic-text-secondary">
                <span className="font-medium">Telefone:</span> {athlete.phone}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ceramic-text-secondary uppercase tracking-wider">Adesao</p>
              <p className={`text-2xl font-bold ${consistencyColor}`}>{consistency}%</p>
            </div>
          </div>

          {/* Alert indicators */}
          {alerts.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-ceramic-warning" />
              <span className="text-xs text-ceramic-warning font-medium">
                {alerts.length} alerta(s) ativo(s)
              </span>
            </div>
          )}
        </div>

        {/* AI Generated Badge */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-ceramic-accent" />
            <span className="text-xs font-bold text-ceramic-accent uppercase tracking-wider">
              Mensagem gerada por IA
            </span>
          </div>
        </div>

        {/* Message Content */}
        <div className="p-4">
          {isEditing ? (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full h-48 p-4 bg-ceramic-base rounded-xl border border-ceramic-text-secondary/20 text-sm text-ceramic-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-ceramic-success/50"
              placeholder="Digite sua mensagem..."
            />
          ) : (
            <div
              onClick={handleStartEdit}
              className="w-full h-48 p-4 bg-ceramic-base rounded-xl border border-ceramic-text-secondary/20 text-sm text-ceramic-text-primary whitespace-pre-wrap overflow-y-auto cursor-text hover:border-ceramic-success/50 transition-colors"
            >
              {generatedMessage}
            </div>
          )}
          <p className="mt-2 text-xs text-ceramic-text-secondary">
            Clique para editar a mensagem
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-ceramic-text-secondary/10">
          {sendStatus === 'sent' ? (
            <div className="flex items-center justify-center gap-2 py-2" aria-live="polite">
              <CheckCircle className="w-5 h-5 text-ceramic-success" />
              <span className="text-sm font-bold text-ceramic-success">
                Mensagem enviada! Fechando...
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-4 py-2 ceramic-inset hover:bg-white/50 transition-colors rounded-lg"
              >
                <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
                <span className="text-sm font-medium text-ceramic-text-secondary">Regenerar</span>
              </button>

              <div className="flex-1" />

              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={handleSendWhatsApp}
                disabled={!sanitizedPhone}
                className="flex items-center gap-2 px-6 py-2 bg-ceramic-success hover:bg-ceramic-success/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span className="font-bold">Enviar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WhatsAppMessageModal;
