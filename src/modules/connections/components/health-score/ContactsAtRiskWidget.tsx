/**
 * ContactsAtRiskWidget Component
 * Issue #144: [WhatsApp AI] feat: Automated Relationship Health Score Calculation
 *
 * Dashboard widget showing contacts that need attention (health_score < 40).
 * Displays count, list preview, and quick actions.
 *
 * @example
 * <ContactsAtRiskWidget />
 * <ContactsAtRiskWidget maxItems={3} onViewAll={() => navigate('/contacts/at-risk')} />
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  User,
  ChevronRight,
  RefreshCw,
  Loader2,
  Phone,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { useContactsAtRisk } from '@/hooks/useContactsAtRisk';
import { HealthScoreBadge } from './HealthScoreBadge';
import { getRiskColor, type ContactAtRisk } from '@/types/healthScore';

// ============================================================================
// TYPES
// ============================================================================

interface ContactsAtRiskWidgetProps {
  /** Maximum items to show in preview */
  maxItems?: number;
  /** Show stats summary */
  showStats?: boolean;
  /** View all callback */
  onViewAll?: () => void;
  /** Contact click callback */
  onContactClick?: (contact: ContactAtRisk) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ContactRowProps {
  contact: ContactAtRisk;
  onClick?: () => void;
}

function ContactRow({ contact, onClick }: ContactRowProps) {
  const riskColor = getRiskColor(contact.risk_level);

  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-ceramic-surface/50 transition-colors text-left"
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ backgroundColor: `${riskColor}15` }}
      >
        {contact.profile_picture_url ? (
          <img
            src={contact.profile_picture_url}
            alt={contact.contact_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-5 h-5" style={{ color: riskColor }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ceramic-text-primary truncate">
          {contact.contact_name}
        </p>
        <div className="flex items-center gap-2 text-xs text-ceramic-text-secondary">
          <Clock className="w-3 h-3" />
          <span>
            {contact.days_inactive} dias sem contato
          </span>
        </div>
      </div>

      {/* Score Badge */}
      <HealthScoreBadge
        score={contact.health_score}
        trend={contact.health_score_trend}
        size="sm"
        showTrend
      />

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
    </motion.button>
  );
}

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div className="ceramic-inset p-3 rounded-xl text-center">
      <p
        className="text-2xl font-bold"
        style={{ color }}
      >
        {value}
      </p>
      <p className="text-xs text-ceramic-text-secondary">
        {label}
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContactsAtRiskWidget({
  maxItems = 5,
  showStats = true,
  onViewAll,
  onContactClick,
  className = '',
}: ContactsAtRiskWidgetProps) {
  const {
    contacts,
    count,
    stats,
    isLoading,
    error,
    refresh,
  } = useContactsAtRisk({
    limit: maxItems,
    autoFetchStats: showStats,
  });

  const displayedContacts = contacts.slice(0, maxItems);
  const hasMore = count > maxItems;

  return (
    <motion.div
      className={`ceramic-card p-6 rounded-3xl space-y-6 ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="ceramic-concave p-3 rounded-xl"
            style={{ backgroundColor: '#EF444415' }}
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Contatos em Risco
            </h3>
            <p className="text-sm text-ceramic-text-secondary">
              {count} {count === 1 ? 'relacionamento precisa' : 'relacionamentos precisam'} de atenção
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refresh}
          disabled={isLoading}
          className="ceramic-inset p-2 rounded-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Atualizar lista"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-ceramic-accent animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
          )}
        </button>
      </div>

      {/* Stats Grid */}
      {showStats && stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatBox
            label="Críticos"
            value={stats.criticalContacts}
            color="#EF4444"
          />
          <StatBox
            label="Alto Risco"
            value={stats.atRiskContacts}
            color="#F97316"
          />
          <StatBox
            label="Declinando"
            value={stats.decliningContacts}
            color="#EAB308"
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && displayedContacts.length === 0 && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="w-8 h-6 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Contacts List */}
      {!isLoading && displayedContacts.length > 0 && (
        <div className="space-y-1">
          {displayedContacts.map((contact) => (
            <ContactRow
              key={contact.contact_id}
              contact={contact}
              onClick={() => onContactClick?.(contact)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedContacts.length === 0 && !error && (
        <div className="ceramic-inset p-8 rounded-xl text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: '#22C55E15' }}
          >
            <MessageSquare className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-sm font-medium text-ceramic-text-primary">
            Todos os relacionamentos saudáveis!
          </p>
          <p className="text-xs text-ceramic-text-secondary mt-1">
            Nenhum contato precisa de atenção no momento
          </p>
        </div>
      )}

      {/* View All Button */}
      {hasMore && onViewAll && (
        <button
          onClick={onViewAll}
          className="w-full ceramic-inset p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-ceramic-accent hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          <span>Ver todos os {count} contatos</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Quick Actions */}
      {displayedContacts.length > 0 && (
        <div className="flex gap-3">
          <button className="flex-1 ceramic-card p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-ceramic-positive hover:scale-[1.02] active:scale-[0.98] transition-transform">
            <Phone className="w-4 h-4" />
            <span>Ligar</span>
          </button>
          <button className="flex-1 ceramic-card p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-ceramic-accent hover:scale-[1.02] active:scale-[0.98] transition-transform">
            <MessageSquare className="w-4 h-4" />
            <span>Mensagem</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default ContactsAtRiskWidget;
