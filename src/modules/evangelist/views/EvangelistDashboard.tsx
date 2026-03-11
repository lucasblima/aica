import { useState } from 'react';
import { useEvangelistDashboard } from '../hooks/useEvangelistDashboard';
import { TierBadge } from '../components/TierBadge';
import { TierProgress } from '../components/TierProgress';
import { ReferralLinkCopier } from '../components/ReferralLinkCopier';
import { TIER_CONFIG } from '../types';
import type { ReferralConversion, CommissionEntry } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysSince(dateStr: string): number {
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function formatPeriod(monthStr: string): string {
  // period_month comes as "YYYY-MM-DD" (PostgreSQL DATE column)
  const [year, month] = monthStr.split('-');
  const MONTHS = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  const idx = parseInt(month, 10) - 1;
  return `${MONTHS[idx] ?? month} ${year}`;
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const CONVERSION_STATUS: Record<ReferralConversion['status'], { label: string; classes: string }> = {
  pending: { label: 'Pendente', classes: 'bg-ceramic-warning/10 text-ceramic-warning' },
  confirmed: { label: 'Confirmado', classes: 'bg-ceramic-success/10 text-ceramic-success' },
  churned: { label: 'Cancelou', classes: 'bg-ceramic-error/10 text-ceramic-error' },
};

const LEDGER_STATUS: Record<CommissionEntry['status'], { label: string; classes: string }> = {
  calculated: { label: 'Calculado', classes: 'bg-ceramic-cool text-ceramic-text-secondary' },
  pending_payment: { label: 'Aguardando', classes: 'bg-ceramic-warning/10 text-ceramic-warning' },
  paid: { label: 'Pago', classes: 'bg-ceramic-success/10 text-ceramic-success' },
  cancelled: { label: 'Cancelado', classes: 'bg-ceramic-error/10 text-ceramic-error' },
};

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------

interface StatCardDef {
  label: string;
  getValue: (s: NonNullable<ReturnType<typeof useEvangelistDashboard>['stats']>) => string;
  accent: string;
  icon: string;
  subtitle?: string;
}

const STAT_CARDS: StatCardDef[] = [
  {
    label: 'Confirmados',
    getValue: (s) => String(s.confirmed_count),
    accent: 'text-ceramic-success',
    icon: '\u2705',
  },
  {
    label: 'Pendentes',
    getValue: (s) => String(s.pending_count),
    accent: 'text-yellow-600',
    icon: '\u23F3',
    subtitle: 'aguardando 30 dias',
  },
  {
    label: 'Total Ganho',
    getValue: (s) => `R$ ${s.total_earned.toFixed(2)}`,
    accent: 'text-blue-600',
    icon: '\uD83D\uDCB0',
  },
  {
    label: 'A Receber',
    getValue: (s) => `R$ ${s.pending_payment.toFixed(2)}`,
    accent: 'text-orange-600',
    icon: '\uD83D\uDCC8',
  },
];

// ---------------------------------------------------------------------------
// Pagination config
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EvangelistDashboard() {
  const { profile, conversions, ledger, stats, isLoading, error, refresh } =
    useEvangelistDashboard();

  const [conversionsPage, setConversionsPage] = useState(1);

  // ------ Loading ------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-ceramic-border border-t-amber-500" />
      </div>
    );
  }

  // ------ Error ------
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-ceramic-base rounded-xl p-8 text-center space-y-4 shadow-sm">
          <p className="text-ceramic-text-primary font-medium">
            Ocorreu um erro ao carregar o painel
          </p>
          <p className="text-ceramic-text-secondary text-sm">{error}</p>
          <button
            onClick={refresh}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ------ No profile ------
  if (!profile) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-ceramic-base rounded-xl p-8 text-center space-y-2 shadow-sm">
          <p className="text-ceramic-text-primary font-medium text-lg">
            Programa de Evangelistas
          </p>
          <p className="text-ceramic-text-secondary">
            Voce ainda nao e um evangelista. Entre em contato para participar do programa.
          </p>
        </div>
      </div>
    );
  }

  // Derived values
  const tierConfig = TIER_CONFIG[profile.tier];
  const visibleConversions = conversions.slice(0, conversionsPage * PAGE_SIZE);
  const hasMoreConversions = conversions.length > visibleConversions.length;

  const totalAccumulatedCommission = ledger.reduce(
    (sum, entry) => sum + Number(entry.commission_amount),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* ================================================================
          Section A — Tier Hero
          ================================================================ */}
      <section className="bg-ceramic-base rounded-2xl p-8 shadow-ceramic-emboss">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TierBadge tier={profile.tier} size="lg" />
            </div>
            <h1 className="text-2xl font-semibold text-ceramic-text-primary">
              Ola, Evangelista {tierConfig.name}!
            </h1>
            <TierProgress
              currentTier={profile.tier}
              currentCount={stats?.confirmed_count ?? 0}
            />
          </div>
          <div className="md:self-start">
            <ReferralLinkCopier referralCode={profile.referral_code} />
          </div>
        </div>
      </section>

      {/* ================================================================
          Section B — Stats Cards
          ================================================================ */}
      {stats && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className="bg-ceramic-base rounded-xl p-6 shadow-sm flex flex-col gap-1"
            >
              <span className="text-ceramic-text-secondary text-sm flex items-center gap-1.5">
                <span>{card.icon}</span>
                {card.label}
              </span>
              <span className={`text-2xl font-bold ${card.accent}`}>
                {card.getValue(stats)}
              </span>
              {card.subtitle && (
                <span className="text-ceramic-text-secondary text-xs">
                  {card.subtitle}
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ================================================================
          Section C — Referrals Table
          ================================================================ */}
      <section className="bg-ceramic-base rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ceramic-border">
          <h2 className="text-lg font-semibold text-ceramic-text-primary">
            Indicados
          </h2>
        </div>

        {conversions.length === 0 ? (
          <div className="px-6 py-12 text-center text-ceramic-text-secondary">
            Nenhum indicado ainda. Compartilhe seu link!
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ceramic-text-secondary border-b border-ceramic-border">
                    <th className="px-6 py-3 font-medium">Nome / Email</th>
                    <th className="px-6 py-3 font-medium">Plano</th>
                    <th className="px-6 py-3 font-medium">Data Cadastro</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Dias Restantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ceramic-border">
                  {visibleConversions.map((c) => {
                    const statusCfg = CONVERSION_STATUS[c.status];
                    const elapsed = daysSince(c.converted_at);
                    const remaining = Math.max(30 - elapsed, 0);

                    return (
                      <tr key={c.id} className="hover:bg-ceramic-cool/40 transition-colors">
                        <td className="px-6 py-3 text-ceramic-text-primary">
                          {c.referred_name || c.referred_email || truncateId(c.referred_user_id)}
                        </td>
                        <td className="px-6 py-3 text-ceramic-text-primary capitalize">
                          {c.plan}
                        </td>
                        <td className="px-6 py-3 text-ceramic-text-secondary">
                          {new Date(c.converted_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.classes}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-ceramic-text-secondary">
                          {c.status === 'pending' ? `${remaining} dias` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMoreConversions && (
              <div className="px-6 py-4 border-t border-ceramic-border text-center">
                <button
                  onClick={() => setConversionsPage((p) => p + 1)}
                  className="text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors"
                >
                  Ver mais
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ================================================================
          Section D — Commission Ledger
          ================================================================ */}
      <section className="bg-ceramic-base rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ceramic-border">
          <h2 className="text-lg font-semibold text-ceramic-text-primary">
            Comissoes
          </h2>
        </div>

        {ledger.length === 0 ? (
          <div className="px-6 py-12 text-center text-ceramic-text-secondary">
            Nenhuma comissao registrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ceramic-text-secondary border-b border-ceramic-border">
                  <th className="px-6 py-3 font-medium">Periodo</th>
                  <th className="px-6 py-3 font-medium text-right">Valor Bruto</th>
                  <th className="px-6 py-3 font-medium text-right">Taxa</th>
                  <th className="px-6 py-3 font-medium text-right">Comissao</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ceramic-border">
                {ledger.map((entry) => {
                  const statusCfg = LEDGER_STATUS[entry.status];
                  return (
                    <tr key={entry.id} className="hover:bg-ceramic-cool/40 transition-colors">
                      <td className="px-6 py-3 text-ceramic-text-primary">
                        {formatPeriod(entry.period_month)}
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-primary text-right">
                        R$ {Number(entry.gross_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-secondary text-right">
                        {(Number(entry.commission_rate) * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-primary text-right font-medium">
                        R$ {Number(entry.commission_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.classes}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ceramic-border">
                  <td className="px-6 py-3 text-ceramic-text-primary font-semibold" colSpan={3}>
                    Total Acumulado
                  </td>
                  <td className="px-6 py-3 text-ceramic-text-primary text-right font-bold">
                    R$ {totalAccumulatedCommission.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default EvangelistDashboard;
