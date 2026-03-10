import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '../services/evangelistAdminService';
import { TierBadge } from '../components/TierBadge';
import { TIER_CONFIG } from '../types';
import type { Evangelist } from '../types';
import type { EvangelistWithProfile, AdminSummary } from '../services/evangelistAdminService';
import type { EvangelistTier } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<Evangelist['status'], { label: string; classes: string }> = {
  active: { label: 'Ativo', classes: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspenso', classes: 'bg-red-100 text-red-800' },
  inactive: { label: 'Inativo', classes: 'bg-ceramic-cool text-ceramic-text-secondary' },
};

// ---------------------------------------------------------------------------
// Summary Card Component
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: string;
  subtitle?: string;
  accent: string;
}

function SummaryCard({ label, value, subtitle, accent }: SummaryCardProps) {
  return (
    <div className="bg-ceramic-base rounded-xl p-6 shadow-sm flex flex-col gap-1">
      <span className="text-ceramic-text-secondary text-sm">{label}</span>
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      {subtitle && (
        <span className="text-ceramic-text-secondary text-xs">{subtitle}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function EvangelistsAdmin() {
  const { user } = useAuth();

  // State
  const [evangelists, setEvangelists] = useState<EvangelistWithProfile[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTier, setFilterTier] = useState<EvangelistTier | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<Evangelist['status'] | 'all'>('all');

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Action feedback
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ------ Data Fetching ------

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [evangelistList, summaryData] = await Promise.all([
        adminService.getAllEvangelists(),
        adminService.getAdminSummary(),
      ]);
      setEvangelists(evangelistList);
      setSummary(summaryData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ------ Actions ------

  const handleMarkPaid = useCallback(
    async (evangelistId: string) => {
      try {
        setActionMessage(null);
        await adminService.markCommissionsAsPaid(evangelistId, getCurrentMonth());
        setActionMessage({ type: 'success', text: 'Comissoes marcadas como pagas.' });
        await fetchData();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao marcar como pago';
        setActionMessage({ type: 'error', text: message });
      }
    },
    [fetchData]
  );

  const handleToggleStatus = useCallback(
    async (evangelistId: string, currentStatus: Evangelist['status']) => {
      try {
        setActionMessage(null);
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        await adminService.updateEvangelistStatus(evangelistId, newStatus);
        setActionMessage({
          type: 'success',
          text: newStatus === 'active' ? 'Evangelista reativado.' : 'Evangelista suspenso.',
        });
        await fetchData();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao atualizar status';
        setActionMessage({ type: 'error', text: message });
      }
    },
    [fetchData]
  );

  const handleInvite = useCallback(async () => {
    if (!inviteUserId.trim()) return;
    try {
      setInviteLoading(true);
      setInviteMessage(null);
      await adminService.createEvangelist(inviteUserId.trim());
      setInviteMessage({ type: 'success', text: 'Evangelista criado com sucesso!' });
      setInviteUserId('');
      await fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar evangelista';
      setInviteMessage({ type: 'error', text: message });
    } finally {
      setInviteLoading(false);
    }
  }, [inviteUserId, fetchData]);

  // ------ Filtered list ------

  const filteredEvangelists = evangelists.filter((e) => {
    if (filterTier !== 'all' && e.tier !== filterTier) return false;
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    return true;
  });

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
            Ocorreu um erro ao carregar o painel admin
          </p>
          <p className="text-ceramic-text-secondary text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* ================================================================
          Header
          ================================================================ */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ceramic-text-primary">
          Admin — Evangelistas
        </h1>
      </div>

      {/* ================================================================
          Action Feedback
          ================================================================ */}
      {actionMessage && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            actionMessage.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* ================================================================
          Summary Cards
          ================================================================ */}
      {summary && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Evangelistas Ativos"
            value={String(summary.total_evangelists)}
            accent="text-green-600"
          />
          <SummaryCard
            label="Comissoes a Pagar"
            value={`R$ ${summary.total_pending_payment.toFixed(2)}`}
            accent="text-orange-600"
          />
          <SummaryCard
            label="Conversoes Pendentes"
            value={String(summary.pending_conversions)}
            subtitle="aguardando 30 dias"
            accent="text-yellow-600"
          />
        </section>
      )}

      {/* ================================================================
          Filters + Invite Button
          ================================================================ */}
      <section className="flex flex-wrap items-center gap-4">
        {/* Tier filter */}
        <select
          value={filterTier}
          onChange={(e) =>
            setFilterTier(e.target.value === 'all' ? 'all' : (Number(e.target.value) as EvangelistTier))
          }
          className="bg-ceramic-base border border-ceramic-border rounded-lg px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Todos os Tiers</option>
          <option value="1">1 — Semente</option>
          <option value="2">2 — Ativador</option>
          <option value="3">3 — Catalisador</option>
          <option value="4">4 — Embaixador</option>
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as Evangelist['status'] | 'all')
          }
          className="bg-ceramic-base border border-ceramic-border rounded-lg px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">Todos os Status</option>
          <option value="active">Ativo</option>
          <option value="suspended">Suspenso</option>
          <option value="inactive">Inativo</option>
        </select>

        {/* Invite button */}
        <button
          onClick={() => {
            setShowInvite((v) => !v);
            setInviteMessage(null);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors ml-auto"
        >
          Convidar Evangelista
        </button>
      </section>

      {/* ================================================================
          Invite Panel
          ================================================================ */}
      {showInvite && (
        <section className="bg-ceramic-base rounded-xl p-6 shadow-ceramic-emboss space-y-4">
          <h3 className="text-lg font-semibold text-ceramic-text-primary">
            Convidar Novo Evangelista
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="User ID do usuario"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              className="flex-1 bg-ceramic-cool border border-ceramic-border rounded-lg px-3 py-2 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={handleInvite}
              disabled={inviteLoading || !inviteUserId.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {inviteLoading ? 'Criando...' : 'Criar Evangelista'}
            </button>
          </div>
          {inviteMessage && (
            <p
              className={`text-sm font-medium ${
                inviteMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {inviteMessage.text}
            </p>
          )}
        </section>
      )}

      {/* ================================================================
          Evangelists Table
          ================================================================ */}
      <section className="bg-ceramic-base rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-ceramic-border">
          <h2 className="text-lg font-semibold text-ceramic-text-primary">
            Evangelistas ({filteredEvangelists.length})
          </h2>
        </div>

        {filteredEvangelists.length === 0 ? (
          <div className="px-6 py-12 text-center text-ceramic-text-secondary">
            Nenhum evangelista encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ceramic-text-secondary border-b border-ceramic-border">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Tier</th>
                  <th className="px-6 py-3 font-medium">Codigo Referral</th>
                  <th className="px-6 py-3 font-medium text-right">Confirmados</th>
                  <th className="px-6 py-3 font-medium text-right">Comissao Acumulada</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ceramic-border">
                {filteredEvangelists.map((ev) => {
                  const statusCfg = STATUS_CONFIG[ev.status];
                  return (
                    <tr key={ev.id} className="hover:bg-ceramic-cool/40 transition-colors">
                      <td className="px-6 py-3 text-ceramic-text-primary">
                        {ev.full_name || '—'}
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-secondary">
                        {ev.email || '—'}
                      </td>
                      <td className="px-6 py-3">
                        <TierBadge tier={ev.tier} size="sm" />
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-primary font-mono text-xs">
                        {ev.referral_code}
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-primary text-right">
                        {/* Confirmed count would need a join; show '—' for now if not available */}
                        —
                      </td>
                      <td className="px-6 py-3 text-ceramic-text-primary text-right">
                        {/* Accumulated commission would need a join; show '—' for now if not available */}
                        —
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.classes}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMarkPaid(ev.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                            title="Marcar comissoes do periodo atual como pagas"
                          >
                            Marcar Pago
                          </button>
                          <button
                            onClick={() => handleToggleStatus(ev.id, ev.status)}
                            className={`text-xs font-medium transition-colors ${
                              ev.status === 'active'
                                ? 'text-red-600 hover:text-red-800'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {ev.status === 'active' ? 'Suspender' : 'Reativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default EvangelistsAdmin;
