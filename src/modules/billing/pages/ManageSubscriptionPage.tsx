import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, CreditCard, Calendar, XCircle, ExternalLink, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/ui';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AsaasSubscription {
  id: string;
  status: string;
  value: number;
  cycle: string;
  nextDueDate: string;
  billingType: string;
  description: string;
  plan_id: string;
}

interface AsaasPayment {
  id: string;
  value: number;
  status: string;
  billingType: string;
  dueDate: string;
  paymentDate: string | null;
  invoiceUrl: string | null;
  description: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativa', color: 'text-ceramic-success' },
  INACTIVE: { label: 'Inativa', color: 'text-ceramic-text-secondary' },
  EXPIRED: { label: 'Expirada', color: 'text-ceramic-error' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: 'Confirmado', color: 'text-ceramic-success' },
  RECEIVED: { label: 'Recebido', color: 'text-ceramic-success' },
  PENDING: { label: 'Pendente', color: 'text-amber-600' },
  OVERDUE: { label: 'Atrasado', color: 'text-ceramic-error' },
  REFUNDED: { label: 'Reembolsado', color: 'text-ceramic-info' },
  RECEIVED_IN_CASH: { label: 'Recebido em dinheiro', color: 'text-ceramic-success' },
};

const BILLING_TYPE_LABELS: Record<string, string> = {
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartao de credito',
  PIX: 'PIX',
  UNDEFINED: 'A definir',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ManageSubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan, isLoading: isPlanLoading } = useUserPlan();

  const [asaasSub, setAsaasSub] = useState<AsaasSubscription | null>(null);
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }
    return { Authorization: `Bearer ${sessionData.session.access_token}` };
  }, []);

  const fetchSubscriptionData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();

      // Fetch subscription and payments in parallel
      const [subResult, paymentsResult] = await Promise.all([
        supabase.functions.invoke('manage-asaas-subscription', {
          body: { action: 'get_subscription' },
          headers,
        }),
        supabase.functions.invoke('manage-asaas-subscription', {
          body: { action: 'get_payments' },
          headers,
        }),
      ]);

      if (subResult.data?.success && subResult.data.subscription) {
        setAsaasSub(subResult.data.subscription);
      }

      if (paymentsResult.data?.success && paymentsResult.data.payments) {
        setPayments(paymentsResult.data.payments);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados da assinatura.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handleCancel = async () => {
    setCancelLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const { data, error: fnError } = await supabase.functions.invoke('manage-asaas-subscription', {
        body: { action: 'cancel_subscription' },
        headers,
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setCancelSuccess(true);
      setShowCancelConfirm(false);
      setAsaasSub(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar assinatura.';
      setError(message);
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <PageShell title="Gerenciar Assinatura" onBack={() => navigate(-1)}>
      <div className="max-w-2xl mx-auto space-y-6 pb-8">

        {/* Error Banner */}
        {error && (
          <div className="bg-ceramic-error/8 border border-ceramic-error/15 text-ceramic-error rounded-xl px-5 py-3.5 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Cancel Success */}
        {cancelSuccess && (
          <div className="bg-ceramic-success/8 border border-ceramic-success/15 text-ceramic-success rounded-xl px-5 py-3.5 text-sm font-medium">
            Assinatura cancelada com sucesso. Voce retornou ao plano Free.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="ml-3 text-sm text-ceramic-text-secondary">Carregando assinatura...</span>
          </div>
        )}

        {/* No subscription */}
        {!loading && !asaasSub && !cancelSuccess && (
          <div className="bg-ceramic-50 rounded-2xl shadow-ceramic-emboss p-8 text-center">
            <Crown className="w-10 h-10 text-ceramic-text-secondary/40 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-ceramic-text-primary mb-2">Nenhuma assinatura ativa</h2>
            <p className="text-sm text-ceramic-text-secondary mb-6">
              Voce esta no plano Free. Faca upgrade para desbloquear mais creditos e funcionalidades.
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm px-6 py-3 transition-colors"
            >
              Ver planos
            </button>
          </div>
        )}

        {/* Subscription Card */}
        {!loading && asaasSub && (
          <div className="bg-ceramic-50 rounded-2xl shadow-ceramic-emboss p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-ceramic-text-primary">Seu Plano</h2>
              </div>
              <button
                onClick={fetchSubscriptionData}
                className="p-2 hover:bg-ceramic-text-secondary/5 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Plano</p>
                <p className="text-sm font-bold text-ceramic-text-primary">{plan.name}</p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Status</p>
                <p className={`text-sm font-bold ${STATUS_LABELS[asaasSub.status]?.color || 'text-ceramic-text-primary'}`}>
                  {STATUS_LABELS[asaasSub.status]?.label || asaasSub.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Valor mensal</p>
                <p className="text-sm font-bold text-ceramic-text-primary">{formatCurrency(asaasSub.value)}</p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Proxima cobranca</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {asaasSub.nextDueDate ? formatDate(asaasSub.nextDueDate) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Forma de pagamento</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {BILLING_TYPE_LABELS[asaasSub.billingType] || asaasSub.billingType}
                </p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary mb-1">Creditos/mes</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {plan.monthly_credits >= 1000
                    ? `${(plan.monthly_credits / 1000).toFixed(plan.monthly_credits % 1000 === 0 ? 0 : 1)}k`
                    : plan.monthly_credits}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 bg-ceramic-text-primary/5 hover:bg-ceramic-text-primary/10 text-ceramic-text-primary rounded-xl font-bold text-sm px-4 py-3 transition-colors"
              >
                Mudar plano
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="flex-1 bg-ceramic-error/8 hover:bg-ceramic-error/15 text-ceramic-error rounded-xl font-bold text-sm px-4 py-3 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="bg-ceramic-error/5 border border-ceramic-error/20 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-ceramic-error">Cancelar assinatura?</h3>
            <p className="text-sm text-ceramic-text-secondary">
              Ao cancelar, voce perdera acesso aos beneficios do plano pago e retornara ao plano Free
              com 500 creditos/mes. Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 bg-ceramic-text-secondary/8 hover:bg-ceramic-text-secondary/15 text-ceramic-text-primary rounded-xl font-bold text-sm px-4 py-3 transition-colors"
              >
                Manter plano
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 bg-ceramic-error hover:bg-ceramic-error/90 text-white rounded-xl font-bold text-sm px-4 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {cancelLoading ? 'Cancelando...' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {!loading && payments.length > 0 && (
          <div className="bg-ceramic-50 rounded-2xl shadow-ceramic-emboss p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <CreditCard className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-ceramic-text-primary">Historico de Pagamentos</h2>
            </div>

            <div className="space-y-3">
              {payments.map((payment) => {
                const statusInfo = PAYMENT_STATUS_LABELS[payment.status] || { label: payment.status, color: 'text-ceramic-text-secondary' };
                return (
                  <div key={payment.id} className="flex items-center justify-between py-3 border-b border-ceramic-border/30 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ceramic-text-primary">
                          {formatCurrency(payment.value)}
                        </span>
                        <span className={`text-xs font-bold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3 h-3 text-ceramic-text-secondary/60" />
                        <span className="text-xs text-ceramic-text-secondary">
                          {payment.paymentDate ? formatDate(payment.paymentDate) : `Vence ${formatDate(payment.dueDate)}`}
                        </span>
                        <span className="text-xs text-ceramic-text-secondary/60">
                          {BILLING_TYPE_LABELS[payment.billingType] || payment.billingType}
                        </span>
                      </div>
                    </div>
                    {payment.invoiceUrl && (
                      <a
                        href={payment.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-ceramic-text-secondary/5 rounded-lg transition-colors"
                        title="Ver fatura"
                      >
                        <ExternalLink className="w-4 h-4 text-ceramic-text-secondary" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default ManageSubscriptionPage;
