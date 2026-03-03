/**
 * PublishWhatsAppButton - Send workout plan via WhatsApp
 *
 * Integrates with fluxWhatsAppService to:
 * - Record scheduled_workouts entries for tracking
 * - Open WhatsApp Web deep link for immediate sends
 * - Schedule sends for Sunday 6PM
 */

import React, { useState, useMemo } from 'react';
import { MessageCircle, Send, Calendar, X, Check, CheckCircle, AlertCircle } from 'lucide-react';
import { publishWorkoutViaWhatsApp } from '../../services/fluxWhatsAppService';
import type { WorkoutBlockData } from './WorkoutBlock';

interface PublishWhatsAppButtonProps {
  athleteId: string;
  athleteName: string;
  athletePhone: string;
  weekNumber: number;
  weekWorkouts: WorkoutBlockData[];
  microcycleId?: string;
  onPublishSuccess?: () => void;
  disabled?: boolean;
}

type PublishStatus = 'idle' | 'sending' | 'success' | 'error';

export const PublishWhatsAppButton: React.FC<PublishWhatsAppButtonProps> = ({
  athleteId,
  athleteName,
  athletePhone,
  weekWorkouts,
  weekNumber,
  microcycleId,
  onPublishSuccess,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendNow, setSendNow] = useState(true);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Generate formatted message preview
  const messagePreview = useMemo(() => {
    const dayNames = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

    let message = `*Treino Semana ${weekNumber}*\n\n`;
    message += `Ola ${athleteName.split(' ')[0]}!\n\n`;
    message += `Aqui esta sua programacao de treinos para a semana:\n\n`;

    // List workouts sequentially (no random day assignment)
    for (let i = 0; i < weekWorkouts.length; i++) {
      const workout = weekWorkouts[i];
      const dayLabel = i < dayNames.length ? dayNames[i] : `Dia ${i + 1}`;
      message += `*${dayLabel}*\n`;
      message += `- ${workout.name} (${workout.duration}min)\n`;
      if (workout.sets && workout.reps) {
        message += `  ${workout.sets}x ${workout.reps}`;
        if (workout.rest && workout.rest !== '0') message += ` - ${workout.rest} rest`;
        message += `\n`;
      }
      message += `\n`;
    }

    const totalVolume = weekWorkouts.reduce((sum, w) => sum + w.duration, 0);
    message += `*Volume Total:* ${totalVolume} minutos\n\n`;
    message += `Bons treinos! Qualquer duvida, estou a disposicao.\n\n`;
    message += `_Enviado via AICA Life OS_`;

    return message;
  }, [athleteName, weekNumber, weekWorkouts]);

  const handlePublish = async () => {
    setPublishStatus('sending');
    setErrorMessage('');

    const result = await publishWorkoutViaWhatsApp({
      athleteId,
      athleteName,
      athletePhone,
      weekNumber,
      weekWorkouts,
      message: messagePreview,
      sendNow,
      microcycleId,
    });

    if (result.success) {
      setPublishStatus('success');
      onPublishSuccess?.();
      // Auto-close after showing success
      setTimeout(() => {
        setIsModalOpen(false);
        setPublishStatus('idle');
      }, 2000);
    } else {
      setPublishStatus('error');
      setErrorMessage(result.error || 'Erro ao enviar. Tente novamente.');
    }
  };

  const handleClose = () => {
    if (publishStatus === 'sending') return;
    setIsModalOpen(false);
    setPublishStatus('idle');
    setErrorMessage('');
  };

  return (
    <>
      {/* Main Button — WhatsApp-style "Enviar Treino" */}
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={disabled || weekWorkouts.length === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-md transition-all ${
          disabled || weekWorkouts.length === 0
            ? 'bg-ceramic-border text-ceramic-text-secondary cursor-not-allowed'
            : 'bg-[#25D366] hover:bg-[#1EBE5A] text-white hover:scale-105'
        }`}
      >
        <MessageCircle className="w-4 h-4" />
        Enviar Treino
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={handleClose}
          />

          {/* Modal — centered with proper constraints for mobile and desktop */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg max-h-[90vh] bg-ceramic-base rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
            {/* Header */}
            <div className="p-6 border-b border-ceramic-border bg-green-50 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 p-3 rounded-xl">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ceramic-text-primary">Enviar por WhatsApp</h2>
                    <p className="text-sm text-ceramic-text-secondary mt-0.5">
                      Para {athleteName} - {athletePhone}
                    </p>
                  </div>
                </div>
                {publishStatus !== 'sending' && (
                  <button
                    onClick={handleClose}
                    className="ceramic-inset p-2 hover:bg-ceramic-cool transition-colors"
                  >
                    <X className="w-5 h-5 text-ceramic-text-secondary" />
                  </button>
                )}
              </div>
            </div>

            {/* Content — scrollable to handle tall content on small screens */}
            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Success Banner */}
              {publishStatus === 'success' && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-800">
                      {sendNow ? 'Treino enviado!' : 'Envio agendado!'}
                    </p>
                    <p className="text-xs text-green-600">
                      {sendNow
                        ? 'O WhatsApp foi aberto com a mensagem pronta para envio.'
                        : 'O envio sera feito automaticamente no domingo as 18h.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {publishStatus === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-red-800">Erro no envio</p>
                    <p className="text-xs text-red-600">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Message Preview */}
              <div>
                <label className="block text-xs font-semibold text-ceramic-text-primary mb-2 uppercase tracking-wider">
                  Previa da Mensagem
                </label>
                <div className="ceramic-inset p-4 rounded-xl max-h-64 overflow-y-auto">
                  <div className="text-xs text-ceramic-text-primary whitespace-pre-wrap font-sans leading-relaxed">
                    {messagePreview.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.split(/(\*[^*]+\*)/).map((part, j) =>
                          part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
                            <strong key={j} className="font-bold">{part.slice(1, -1)}</strong>
                          ) : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? (
                            <em key={j} className="italic text-ceramic-text-secondary">{part.slice(1, -1)}</em>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                        {'\n'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Send Options */}
              {publishStatus !== 'success' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-ceramic-text-primary uppercase tracking-wider">
                    Opcoes de Envio
                  </label>

                  {/* Send Now */}
                  <label className="flex items-center gap-3 ceramic-card p-4 cursor-pointer hover:scale-[1.02] transition-transform">
                    <input
                      type="radio"
                      checked={sendNow}
                      onChange={() => setSendNow(true)}
                      className="w-4 h-4 text-green-500 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-ceramic-text-primary">Enviar Agora</span>
                      </div>
                      <p className="text-xs text-ceramic-text-secondary mt-0.5">
                        Abre o WhatsApp com a mensagem pronta
                      </p>
                    </div>
                  </label>

                  {/* Schedule for Sunday */}
                  <label className="flex items-center gap-3 ceramic-card p-4 cursor-pointer hover:scale-[1.02] transition-transform">
                    <input
                      type="radio"
                      checked={!sendNow}
                      onChange={() => setSendNow(false)}
                      className="w-4 h-4 text-green-500 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-bold text-ceramic-text-primary">Agendar para Domingo 18h</span>
                      </div>
                      <p className="text-xs text-ceramic-text-secondary mt-0.5">
                        Envio automatico no fim de semana
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            {publishStatus !== 'success' && (
              <div className="p-6 border-t border-ceramic-border bg-ceramic-cool flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    disabled={publishStatus === 'sending'}
                    className="flex-1 py-3 ceramic-card text-sm font-bold text-ceramic-text-primary hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishStatus === 'sending'}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {publishStatus === 'sending' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {sendNow ? 'Enviar Agora' : 'Agendar Envio'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </>
  );
};
