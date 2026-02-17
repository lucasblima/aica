import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Copy, Check, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/services/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixData {
  qr_code_base64: string | null;
  copy_paste: string | null;
  expiration_date: string | null;
  payment_id: string;
}

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  pixData: PixData;
  planName: string;
  value: number;
  onPaymentConfirmed?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PixPaymentModal({
  isOpen,
  onClose,
  pixData,
  planName,
  value,
  onPaymentConfirmed,
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer (30 min default)
  useEffect(() => {
    if (!isOpen || !pixData.expiration_date) return;

    const expirationMs = new Date(pixData.expiration_date).getTime();
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expirationMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setPaymentStatus('expired');
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, pixData.expiration_date]);

  // Fallback: if no expiration_date, set 30 min timer
  useEffect(() => {
    if (!isOpen || pixData.expiration_date || timeLeft !== null) return;

    const expirationMs = Date.now() + 30 * 60 * 1000;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expirationMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setPaymentStatus('expired');
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, pixData.expiration_date, timeLeft]);

  // Poll payment status every 5s
  const pollPaymentStatus = useCallback(async () => {
    if (!pixData.payment_id || paymentStatus !== 'pending') return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) return;

      const { data } = await supabase.functions.invoke('manage-asaas-subscription', {
        body: { action: 'get_payments' },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (data?.success && data.payments) {
        const payment = data.payments.find((p: { id: string; status: string }) => p.id === pixData.payment_id);
        if (payment && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED' || payment.status === 'RECEIVED_IN_CASH')) {
          setPaymentStatus('confirmed');
          onPaymentConfirmed?.();
        }
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [pixData.payment_id, paymentStatus, onPaymentConfirmed]);

  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending') return;

    pollIntervalRef.current = setInterval(pollPaymentStatus, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, paymentStatus, pollPaymentStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!pixData.copy_paste) return;
    try {
      await navigator.clipboard.writeText(pixData.copy_paste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = pixData.copy_paste;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (v: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md bg-ceramic-base rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-ceramic-border/30">
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">Pagar com PIX</h2>
                <p className="text-xs text-ceramic-text-secondary mt-0.5">
                  {planName} — {formatCurrency(value)}/mes
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-ceramic-text-secondary/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-ceramic-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">

              {/* Payment Confirmed */}
              {paymentStatus === 'confirmed' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-ceramic-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-ceramic-success" />
                  </div>
                  <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">Pagamento confirmado!</h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    Sua assinatura {planName} foi ativada com sucesso.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm px-6 py-3 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Payment Expired */}
              {paymentStatus === 'expired' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-ceramic-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-ceramic-error" />
                  </div>
                  <h3 className="text-xl font-bold text-ceramic-text-primary mb-2">PIX expirado</h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    O codigo PIX expirou. Tente novamente para gerar um novo.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 bg-ceramic-text-primary/5 hover:bg-ceramic-text-primary/10 text-ceramic-text-primary rounded-xl font-bold text-sm px-6 py-3 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Pending Payment */}
              {paymentStatus === 'pending' && (
                <>
                  {/* Timer */}
                  {timeLeft !== null && (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-ceramic-text-secondary" />
                      <span className={`font-mono font-bold ${timeLeft < 300 ? 'text-ceramic-error' : 'text-ceramic-text-secondary'}`}>
                        Expira em {formatTime(timeLeft)}
                      </span>
                    </div>
                  )}

                  {/* QR Code */}
                  {pixData.qr_code_base64 && (
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-xl shadow-sm">
                        <img
                          src={`data:image/png;base64,${pixData.qr_code_base64}`}
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                      </div>
                    </div>
                  )}

                  {/* Copy-Paste Code */}
                  {pixData.copy_paste && (
                    <div>
                      <p className="text-xs text-ceramic-text-secondary mb-2 font-medium">
                        Ou copie o codigo PIX:
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-ceramic-text-secondary/5 rounded-xl px-4 py-3 overflow-hidden">
                          <p className="text-xs font-mono text-ceramic-text-primary truncate">
                            {pixData.copy_paste}
                          </p>
                        </div>
                        <button
                          onClick={handleCopy}
                          className={`flex-shrink-0 rounded-xl px-4 py-3 font-bold text-sm transition-all ${
                            copied
                              ? 'bg-ceramic-success text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                          }`}
                        >
                          {copied ? (
                            <span className="flex items-center gap-1.5">
                              <Check className="w-4 h-4" />
                              Copiado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Copy className="w-4 h-4" />
                              Copiar
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Polling indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-ceramic-text-secondary/60">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Aguardando confirmacao do pagamento...
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PixPaymentModal;
