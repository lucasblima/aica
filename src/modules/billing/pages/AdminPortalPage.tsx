import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/ui/PageShell';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, Gift, Calculator, CreditCard } from 'lucide-react';

interface AdminCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  ready: boolean;
}

const ADMIN_CARDS: AdminCard[] = [
  {
    title: 'Cupons',
    description: 'Criar cupons promocionais, adicionar créditos manuais e gerenciar campanhas.',
    icon: Gift,
    path: '/admin/coupons',
    color: 'text-amber-500',
    ready: true,
  },
  {
    title: 'Simulador de Pricing',
    description: 'Simular cenarios de precificacao com 20+ variaveis e projecao de 24 meses.',
    icon: Calculator,
    path: '/admin/simulator',
    color: 'text-ceramic-info',
    ready: true,
  },
  {
    title: 'Asaas \u2014 Pagamentos',
    description: 'Gerenciar planos, preços e integracoes de pagamento via Asaas.',
    icon: CreditCard,
    path: '/admin/asaas',
    color: 'text-ceramic-success',
    ready: false,
  },
];

export function AdminPortalPage() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <div className="flex items-center gap-3 mb-6">
        <Logo width={36} onClick={() => navigate('/vida')} className="rounded-lg" />
        <button
          onClick={() => navigate('/vida')}
          className="w-9 h-9 ceramic-card-flat flex items-center justify-center rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-ceramic-text-secondary" />
        </button>
        <h1 className="text-2xl font-bold text-ceramic-text-primary">Admin Portal</h1>
      </div>

      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-ceramic-text-secondary mb-8">
          Ferramentas administrativas para gestao de pricing, cupons e pagamentos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADMIN_CARDS.map(card => (
            <button
              key={card.path}
              onClick={() => card.ready && navigate(card.path)}
              disabled={!card.ready}
              className={`text-left bg-ceramic-base rounded-xl p-5 shadow-ceramic-emboss transition-all ${
                card.ready
                  ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-ceramic-cool flex items-center justify-center">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ceramic-text-primary">{card.title}</h3>
                  {!card.ready && (
                    <span className="text-[10px] bg-ceramic-cool text-ceramic-text-secondary px-1.5 py-0.5 rounded">
                      Em breve
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-ceramic-text-secondary leading-relaxed">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
