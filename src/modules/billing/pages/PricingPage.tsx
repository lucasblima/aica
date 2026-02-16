import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PageShell } from '@/components/ui';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { PlanCard } from '../components/PlanCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_brl_monthly: number;
  daily_interaction_limit: number | null;
  features: string[];
  is_active: boolean;
}

interface FAQItem {
  question: string;
  answer: string;
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
    daily_interaction_limit: 50,
    features: [
      '50 interacoes por dia',
      '5 creditos bonus diarios',
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
    price_brl_monthly: 39.90,
    daily_interaction_limit: 500,
    features: [
      '500 interacoes por dia',
      '20 creditos bonus diarios',
      'Todos os 8 modulos',
      'Chat com IA avancado',
      'Analise profunda com Gemini Pro',
      'Suporte prioritario',
      'Integracao WhatsApp completa',
    ],
    is_active: true,
  },
  {
    id: 'teams',
    name: 'Teams',
    description: 'Para equipes e associacoes esportivas',
    price_brl_monthly: 149,
    daily_interaction_limit: null,
    features: [
      'Interacoes ilimitadas',
      '50 creditos bonus diarios',
      'Todos os 8 modulos',
      'Chat com IA avancado',
      'Analise profunda com Gemini Pro',
      'Suporte prioritario',
      'Integracao WhatsApp completa',
      'Painel de equipe (ate 10 membros)',
      'Relatorios consolidados',
    ],
    is_active: true,
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'O que conta como uma interacao?',
    answer:
      'Cada chamada de IA conta como uma interacao. Isso inclui mensagens no chat, analises automaticas, geracoes de relatorio e qualquer processamento que utilize o modelo Gemini. Acoes simples como navegar, editar dados ou visualizar telas nao consomem interacoes.',
  },
  {
    question: 'Posso trocar de plano a qualquer momento?',
    answer:
      'Sim. Voce pode fazer upgrade ou downgrade a qualquer momento. Ao fazer upgrade, a diferenca proporcional sera cobrada. Ao fazer downgrade, o novo preco sera aplicado no proximo ciclo de cobranca.',
  },
  {
    question: 'Como funciona o sistema de creditos bonus?',
    answer:
      'Creditos bonus sao resgatados diariamente e podem ser usados para funcionalidades especiais como analises profundas e geracoes premium. Creditos nao utilizados nao acumulam para o dia seguinte.',
  },
  {
    question: 'Quais formas de pagamento sao aceitas?',
    answer:
      'Aceitamos cartao de credito (Visa, Mastercard, Elo, American Express) e Pix. O processamento e feito via Stripe, garantindo seguranca total dos seus dados.',
  },
  {
    question: 'Posso cancelar minha assinatura?',
    answer:
      'Sim, voce pode cancelar a qualquer momento sem multa. Apos o cancelamento, voce continua com acesso ao plano pago ate o final do ciclo de cobranca atual e depois retorna automaticamente para o plano Free.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // TODO: Replace with actual user plan from billing tables
  const currentPlanId = 'free';

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
        'create-checkout-session',
        {
          body: { plan_id: planId },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (fnError) throw fnError;

      if (data?.checkout_url) {
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

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <PageShell title="Planos e Precos" onBack={() => navigate(-1)}>
      {/* Header Description */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-ceramic-text-secondary font-medium">
          Escolha o plano ideal para transformar sua produtividade com IA.
          Todos os planos incluem acesso aos 8 modulos do AICA.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-ceramic-error/10 border border-ceramic-error/20 text-ceramic-error rounded-xl p-4 text-sm font-medium text-center">
          {error}
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.id === currentPlanId}
            isPopular={plan.id === 'pro'}
            onSubscribe={() => handleSubscribe(plan.id)}
            isLoading={loadingPlan === plan.id}
          />
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-ceramic-text-primary text-center mb-6">
          Perguntas Frequentes
        </h2>

        <div className="max-w-2xl mx-auto space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="bg-ceramic-50 rounded-xl shadow-ceramic-emboss overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-bold text-ceramic-text-primary pr-4">
                  {item.question}
                </span>
                {expandedFAQ === index ? (
                  <ChevronUp className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
                )}
              </button>

              {expandedFAQ === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-ceramic-text-secondary leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center mt-8 pb-4">
        <p className="text-xs text-ceramic-text-secondary">
          Precos em Reais (BRL). Cobranca mensal via Stripe.
          Cancelamento a qualquer momento sem multa.
        </p>
      </div>
    </PageShell>
  );
}

export default PricingPage;
