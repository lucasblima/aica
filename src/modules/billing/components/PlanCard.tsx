import React from 'react';
import { Check, Loader2, Zap } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_brl_monthly: number;
  monthly_credits: number;
  features: string[];
  is_active: boolean;
  highlight?: string;
}

interface PlanCardProps {
  plan: PricingPlan;
  isCurrentPlan: boolean;
  isPopular: boolean;
  onSubscribe: () => void;
  isLoading?: boolean;
}

export function PlanCard({ plan, isCurrentPlan, isPopular, onSubscribe, isLoading = false }: PlanCardProps) {
  const formatPrice = (price: number): string => {
    if (price === 0) return 'Gratis';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const formatCredits = (credits: number): string => {
    if (credits >= 1000) return `${(credits / 1000).toFixed(credits % 1000 === 0 ? 0 : 1)}k`;
    return String(credits);
  };

  return (
    <div
      className={`relative bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss flex flex-col transition-transform hover:scale-[1.02] ${
        isPopular ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-ceramic-base' : ''
      }`}
    >
      {/* Badges */}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg shadow-amber-500/20">
            Mais Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-ceramic-success text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
            Plano Atual
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="pt-2 text-center">
        <h3 className="text-lg font-bold text-ceramic-text-primary">{plan.name}</h3>
        <p className="text-sm text-ceramic-text-secondary mt-1">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mt-5 text-center">
        <span className="text-4xl font-black text-ceramic-text-primary">
          {formatPrice(plan.price_brl_monthly)}
        </span>
        {plan.price_brl_monthly > 0 && (
          <span className="text-sm text-ceramic-text-secondary font-medium">/mes</span>
        )}
      </div>

      {/* Monthly Credits Badge */}
      <div className="mt-4 text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1.5 rounded-full">
          <Zap className="w-3.5 h-3.5" />
          {formatCredits(plan.monthly_credits)} creditos/mes
        </span>
        {plan.highlight && (
          <p className="text-xs font-bold text-ceramic-accent uppercase tracking-wide">
            {plan.highlight}
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="mt-6 space-y-3 flex-1">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" />
            <span className="text-sm text-ceramic-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <div className="mt-6">
        {isCurrentPlan ? (
          <button
            disabled
            className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-ceramic-text-secondary/10 text-ceramic-text-secondary cursor-not-allowed"
          >
            Plano Atual
          </button>
        ) : (
          <button
            onClick={onSubscribe}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}

export default PlanCard;
