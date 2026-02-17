import React from 'react';
import { Check, Loader2, Zap, Crown, Sparkles, Clock } from 'lucide-react';

// Feature flag — flip to true when payment gateway is ready (Asaas or Stripe)
export const PAYMENTS_ENABLED = false;

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

interface PlanCardProps {
  plan: PricingPlan;
  isCurrentPlan: boolean;
  isPopular: boolean;
  onSubscribe: () => void;
  isLoading?: boolean;
  onManageSubscription?: () => void;
  isManageLoading?: boolean;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Zap className="w-5 h-5" />,
  pro: <Sparkles className="w-5 h-5" />,
  max: <Crown className="w-5 h-5" />,
};

export function PlanCard({ plan, isCurrentPlan, isPopular, onSubscribe, isLoading = false, onManageSubscription, isManageLoading = false }: PlanCardProps) {
  const formatCredits = (credits: number): string => {
    if (credits >= 1000) return `${(credits / 1000).toFixed(credits % 1000 === 0 ? 0 : 1)}k`;
    return String(credits);
  };

  const icon = PLAN_ICONS[plan.id] ?? <Zap className="w-5 h-5" />;

  return (
    <div
      className={`
        relative bg-ceramic-50 rounded-2xl flex flex-col
        transition-all duration-300 ease-out
        hover:shadow-xl hover:-translate-y-1
        ${isPopular
          ? 'ring-2 ring-amber-400/60 ring-offset-4 ring-offset-ceramic-base shadow-xl scale-[1.03] z-10'
          : 'shadow-ceramic-emboss'
        }
      `}
    >
      {/* Popular badge */}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-white text-[11px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full shadow-lg shadow-amber-500/25">
            Mais Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-ceramic-success text-white text-[11px] font-bold uppercase tracking-widest px-5 py-1.5 rounded-full">
            Plano Atual
          </span>
        </div>
      )}

      {/* Card content */}
      <div className="p-8 pt-10 flex flex-col flex-1">
        {/* Icon + Plan name */}
        <div className="flex items-center gap-2.5 mb-1">
          <span className={`${isPopular ? 'text-amber-500' : 'text-ceramic-text-secondary'}`}>
            {icon}
          </span>
          <h3 className="text-lg font-bold text-ceramic-text-primary tracking-tight">
            {plan.name}
          </h3>
        </div>

        <p className="text-sm text-ceramic-text-secondary leading-relaxed">
          {plan.description}
        </p>

        {/* Price — the hero element */}
        <div className="mt-6 mb-1">
          {plan.price_brl_monthly === 0 ? (
            <div className="flex items-baseline">
              <span className="text-5xl font-black text-ceramic-text-primary tracking-tight">
                Gratis
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-medium text-ceramic-text-secondary -mr-0.5">R$</span>
              <span className="text-5xl font-black text-ceramic-text-primary tracking-tight">
                {Math.floor(plan.price_brl_monthly)}
              </span>
              <span className="text-xl font-bold text-ceramic-text-primary/60">
                ,{String(Math.round((plan.price_brl_monthly % 1) * 100)).padStart(2, '0')}
              </span>
              <span className="text-sm font-medium text-ceramic-text-secondary ml-0.5">/mes</span>
            </div>
          )}
        </div>

        {/* Credits badge + multiplier */}
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-sm font-semibold px-3 py-1.5 rounded-full border border-amber-200/60">
            <Zap className="w-3.5 h-3.5" />
            {formatCredits(plan.monthly_credits)} creditos/mes
          </span>
          {plan.multiplier && (
            <span className="inline-flex items-center bg-amber-500/10 text-amber-600 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wide">
              {plan.multiplier}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-ceramic-border/50 my-6" />

        {/* Features */}
        <ul className="space-y-3 flex-1">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="mt-0.5 w-4.5 h-4.5 rounded-full bg-ceramic-success/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3.5 h-3.5 text-ceramic-success" />
              </div>
              <span className="text-sm text-ceramic-text-secondary leading-snug">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-8">
          {isCurrentPlan ? (
            <div className="space-y-2">
              <button
                disabled
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-ceramic-text-secondary/8 text-ceramic-text-secondary/60 cursor-not-allowed transition-colors"
              >
                Plano Atual
              </button>
              {PAYMENTS_ENABLED && plan.price_brl_monthly > 0 && onManageSubscription && (
                <button
                  onClick={onManageSubscription}
                  disabled={isManageLoading}
                  className="w-full text-xs text-ceramic-text-secondary hover:text-amber-600 transition-colors py-1 disabled:opacity-50"
                >
                  {isManageLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
                </button>
              )}
            </div>
          ) : plan.price_brl_monthly > 0 && !PAYMENTS_ENABLED ? (
            <button
              disabled
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-ceramic-text-secondary/5 text-ceramic-text-secondary/50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Disponivel em breve
            </button>
          ) : (
            <button
              onClick={onSubscribe}
              disabled={isLoading}
              className={`
                w-full py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isPopular
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30'
                  : plan.price_brl_monthly === 0
                    ? 'bg-ceramic-text-primary/5 hover:bg-ceramic-text-primary/10 text-ceramic-text-primary'
                    : 'bg-ceramic-text-primary hover:bg-ceramic-text-primary/90 text-white shadow-lg shadow-ceramic-text-primary/10'
                }
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </span>
              ) : plan.price_brl_monthly === 0 ? (
                'Comecar Gratis'
              ) : (
                `Assinar ${plan.name}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlanCard;
