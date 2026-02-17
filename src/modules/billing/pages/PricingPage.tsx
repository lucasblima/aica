import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Zap, Brain, MessageSquare, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageShell } from '@/components/ui';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useUserPlan } from '@/hooks/useUserPlan';
import { PlanCard, PAYMENTS_ENABLED } from '../components/PlanCard';
import { PixPaymentModal } from '../components/PixPaymentModal';
import type { PixData } from '../components/PixPaymentModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_brl_monthly: number;
  monthly_credits: number;
  features: string[];
  is_active: boolean;
  highlight?: string;
  multiplier?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface CreditTier {
  cost: number;
  label: string;
  examples: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Static Data
// ---------------------------------------------------------------------------

const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Para comecar a organizar sua vida com IA',
    price_brl_monthly: 0,
    monthly_credits: 500,
    features: [
      '500 creditos por mes',
      'Todos os 8 modulos',
      'Chat com IA basico',
      'Exportacao de dados',
    ],
    is_active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Para quem quer produtividade maxima',
    price_brl_monthly: 34.99,
    monthly_credits: 2500,
    multiplier: '5x',
    features: [
      '2.500 creditos por mes',
      'Chat com IA avancado',
      'Analise profunda com Gemini Pro',
      'Suporte prioritario',
      'Integracao WhatsApp completa',
    ],
    is_active: true,
  },
  {
    id: 'max',
    name: 'Max',
    description: 'Para power users e profissionais',
    price_brl_monthly: 89.99,
    monthly_credits: 10000,
    multiplier: '20x',
    features: [
      '10.000 creditos por mes',
      'Tudo do Pro incluido',
      'Acesso via API',
      'Dashboard de uso avancado',
      'Suporte dedicado',
    ],
    is_active: true,
  },
];

const CREDIT_TIERS: CreditTier[] = [
  {
    cost: 1,
    label: '1 credito',
    examples: 'Analise de sentimento, classificacao, resumo rapido',
    icon: <Zap className="w-5 h-5 text-amber-500" />,
  },
  {
    cost: 2,
    label: '2 creditos',
    examples: 'Chat com IA, analise de tarefas, sugestoes',
    icon: <MessageSquare className="w-5 h-5 text-amber-500" />,
  },
  {
    cost: 3,
    label: '3 creditos',
    examples: 'Relatorios diarios, briefings, dossie de contato',
    icon: <Brain className="w-5 h-5 text-amber-500" />,
  },
  {
    cost: 5,
    label: '5 creditos',
    examples: 'Conselho de Vida, sintese de padroes, analise profunda',
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Como funcionam os creditos?',
    answer:
      'Cada acao de IA consome creditos. Acoes simples custam 1 credito, chat e analises custam 2, relatorios custam 3, e acoes avancadas como Conselho de Vida custam 5 creditos. Seus creditos renovam todo mes.',
  },
  {
    question: 'Posso trocar de plano a qualquer momento?',
    answer:
      'Sim. Ao fazer upgrade, a diferenca proporcional sera cobrada. Ao fazer downgrade, o novo preco sera aplicado no proximo ciclo de cobranca.',
  },
  {
    question: 'O que acontece se meus creditos acabarem?',
    answer:
      'Voce continua usando o AICA, mas funcionalidades de IA ficam limitadas. Faca upgrade para mais creditos ou aguarde a renovacao mensal.',
  },
  {
    question: 'Quais formas de pagamento sao aceitas?',
    answer:
      'Cartao de credito (Visa, Mastercard, Elo, Amex) e Pix. Processamento seguro via gateway certificado.',
  },
  {
    question: 'Posso cancelar minha assinatura?',
    answer:
      'Sim, cancele a qualquer momento sem multa. Voce mantem acesso ao plano pago ate o final do ciclo e depois retorna ao Free.',
  },
];

// ---------------------------------------------------------------------------
// FAQ Accordion Item
// ---------------------------------------------------------------------------

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-ceramic-border/40 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-[15px] font-semibold text-ceramic-text-primary pr-4 group-hover:text-amber-600 transition-colors">
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-ceramic-text-secondary leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: userPlan, isLoading: isPlanLoading } = useUserPlan();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [pixModalData, setPixModalData] = useState<{ pixData: PixData; planName: string; value: number } | null>(null);

  const currentPlanId = userPlan.id;

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setError(null);
    setLoadingPlan(planId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session?.access_token) {
        throw new Error('Sessao expirada. Faca login novamente.');
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-asaas-checkout',
        {
          body: { plan_id: planId },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      // If PIX data is available, show the PIX modal
      if (data?.pix_data?.copy_paste || data?.pix_data?.qr_code_base64) {
        const planInfo = PLANS.find(p => p.id === planId);
        setPixModalData({
          pixData: data.pix_data,
          planName: planInfo?.name || planId,
          value: planInfo?.price_brl_monthly || 0,
        });
      } else if (data?.checkout_url) {
        // Redirect to Asaas hosted checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Nao foi possivel criar a sessao de checkout.');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao processar assinatura.';
      setError(message);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = () => {
    navigate('/manage-subscription');
  };

  return (
    <PageShell title="Planos" onBack={() => navigate(-1)}>
      {/* Hero section */}
      <div className="text-center max-w-xl mx-auto pt-4 pb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-ceramic-text-primary tracking-tight leading-tight">
          Escolha seu plano
        </h1>
        <p className="mt-3 text-base text-ceramic-text-secondary leading-relaxed">
          Todos os planos incluem acesso completo aos 8 modulos.
          <br className="hidden sm:block" />
          Mude ou cancele quando quiser.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-ceramic-error/8 border border-ceramic-error/15 text-ceramic-error rounded-xl px-5 py-3.5 text-sm font-medium text-center">
            {error}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto items-start">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.id === currentPlanId}
            isPopular={plan.id === 'pro'}
            onSubscribe={() => handleSubscribe(plan.id)}
            isLoading={loadingPlan === plan.id}
            onManageSubscription={handleManageSubscription}
            isManageLoading={manageLoading}
          />
        ))}
      </div>

      {/* Credit Tiers */}
      <div className="mt-20 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-ceramic-text-primary tracking-tight">
            O que custa cada acao?
          </h2>
          <p className="mt-2 text-sm text-ceramic-text-secondary">
            Acoes mais simples custam menos. Voce decide como usar seus creditos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CREDIT_TIERS.map((tier) => (
            <div
              key={tier.cost}
              className="bg-ceramic-50 rounded-xl p-5 shadow-ceramic-emboss hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center gap-2.5 mb-3">
                {tier.icon}
                <span className="text-lg font-black text-ceramic-text-primary">
                  {tier.label}
                </span>
              </div>
              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                {tier.examples}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-ceramic-text-primary tracking-tight text-center mb-6">
          Perguntas frequentes
        </h2>

        <div className="bg-ceramic-50 rounded-2xl shadow-ceramic-emboss px-6">
          {FAQ_ITEMS.map((item, index) => (
            <FAQAccordionItem
              key={index}
              item={item}
              isOpen={expandedFAQ === index}
              onToggle={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 pb-8">
        <p className="text-xs text-ceramic-text-secondary/60 leading-relaxed">
          Precos em Reais (BRL).{PAYMENTS_ENABLED ? ' Cobranca mensal segura via PIX, cartao ou boleto.' : ' Planos pagos disponiveis em breve.'}
          <br />
          Cancelamento a qualquer momento, sem multa.
        </p>
      </div>

      {/* PIX Payment Modal */}
      {pixModalData && (
        <PixPaymentModal
          isOpen={!!pixModalData}
          onClose={() => setPixModalData(null)}
          pixData={pixModalData.pixData}
          planName={pixModalData.planName}
          value={pixModalData.value}
          onPaymentConfirmed={() => {
            setPixModalData(null);
            // Refresh page to show updated plan
            window.location.reload();
          }}
        />
      )}
    </PageShell>
  );
}

export default PricingPage;
