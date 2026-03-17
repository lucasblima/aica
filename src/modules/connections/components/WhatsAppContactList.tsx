/**
 * WhatsAppContactList Component
 * Virtualized, filterable list of WhatsApp contacts
 *
 * Issue #92: feat(whatsapp): Exibir lista de contatos sincronizados com UI rica
 */

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { WhatsAppContactCard } from './WhatsAppContactCard';
import { ContactFilters } from './ContactFilters';
import { ContactSearchBar } from './ContactSearchBar';
import { useContactFilters } from '../hooks/useContactFilters';
import type { ContactNetwork } from '@/types/memoryTypes';

export interface WhatsAppContactListProps {
  /** Array of contacts to display */
  contacts: ContactNetwork[];
  /** IDs of favorited contacts */
  favoriteIds?: string[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Click handler for contact card */
  onContactClick?: (contact: ContactNetwork) => void;
  /** Handler for chat action */
  onChatClick?: (contact: ContactNetwork) => void;
  /** Handler for favorite toggle */
  onFavoriteToggle?: (contact: ContactNetwork) => void;
  /** Handler for more options */
  onMoreClick?: (contact: ContactNetwork) => void;
  /** Card variant */
  cardVariant?: 'default' | 'compact';
  /** Container height */
  height?: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom empty state component */
  renderEmptyState?: (filterType: string) => React.ReactNode;
}

/**
 * Default empty state messages
 */
const EMPTY_MESSAGES: Record<string, { icon: string; title: string; description: string }> = {
  all: {
    icon: '👥',
    title: 'Nenhum contato encontrado',
    description: 'Sincronize seus contatos do WhatsApp para comecar.',
  },
  favorites: {
    icon: '⭐',
    title: 'Nenhum favorito ainda',
    description: 'Marque contatos como favoritos para acessa-los rapidamente.',
  },
  recent: {
    icon: '🕐',
    title: 'Sem interacoes recentes',
    description: 'Contatos com mensagens nos ultimos 7 dias aparecerao aqui.',
  },
  at_risk: {
    icon: '💚',
    title: 'Nenhum contato em risco',
    description: 'Otimo! Todos os relacionamentos estão saudaveis.',
  },
  inactive: {
    icon: '😴',
    title: 'Nenhum contato inativo',
    description: 'Todos os contatos tiveram interação recente.',
  },
  search: {
    icon: '🔍',
    title: 'Nenhum resultado',
    description: 'Tente buscar por outro nome, telefone ou email.',
  },
};

function DefaultEmptyState({ filterType }: { filterType: string }) {
  const content = EMPTY_MESSAGES[filterType] || EMPTY_MESSAGES.all;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-5xl mb-4">{content.icon}</span>
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">{content.title}</h3>
      <p className="text-sm text-ceramic-text-secondary max-w-xs">{content.description}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="ceramic-card p-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-ceramic-cool" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-ceramic-cool rounded" />
              <div className="h-3 w-20 bg-ceramic-cool rounded" />
            </div>
            <div className="w-10 h-6 bg-ceramic-cool rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-5xl mb-4">😕</span>
      <h3 className="text-lg font-semibold text-ceramic-text-primary mb-2">Erro ao carregar contatos</h3>
      <p className="text-sm text-ceramic-text-secondary max-w-xs">{error.message}</p>
    </div>
  );
}

export function WhatsAppContactList({
  contacts,
  favoriteIds = [],
  isLoading = false,
  error = null,
  onContactClick,
  onChatClick,
  onFavoriteToggle,
  onMoreClick,
  cardVariant = 'default',
  height = 'calc(100vh - 280px)',
  className,
  renderEmptyState,
}: WhatsAppContactListProps) {
  // Use the filters hook
  const {
    filters,
    filteredContacts,
    setActiveFilter,
    setSearchQuery,
    setSortField,
    toggleSortOrder,
    stats,
  } = useContactFilters(contacts, { favoriteIds });

  // Memoized favorite set for efficient lookup
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // Render individual contact card
  const renderContact = useCallback(
    (contact: ContactNetwork) => (
      <div className="px-4 py-1.5">
        <WhatsAppContactCard
          contact={contact}
          isFavorite={favoriteSet.has(contact.id)}
          onClick={onContactClick}
          onChatClick={onChatClick}
          onFavoriteToggle={onFavoriteToggle}
          onMoreClick={onMoreClick}
          variant={cardVariant}
        />
      </div>
    ),
    [favoriteSet, onContactClick, onChatClick, onFavoriteToggle, onMoreClick, cardVariant]
  );

  // Determine empty state type
  const emptyStateType = filters.searchQuery
    ? 'search'
    : filters.activeFilter;

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="p-4 space-y-4">
          <div className="h-10 bg-ceramic-cool rounded-lg animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-ceramic-cool rounded-full animate-pulse" />
            ))}
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState error={error} />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search bar */}
      <div className="px-4 pb-3">
        <ContactSearchBar
          value={filters.searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      {/* Filter chips and sort */}
      <div className="px-4 pb-4">
        <ContactFilters
          activeFilter={filters.activeFilter}
          sortField={filters.sortField}
          sortOrder={filters.sortOrder}
          stats={stats}
          onFilterChange={setActiveFilter}
          onSortChange={setSortField}
          onSortOrderToggle={toggleSortOrder}
        />
      </div>

      {/* Contact list */}
      {filteredContacts.length === 0 ? (
        renderEmptyState ? (
          renderEmptyState(emptyStateType)
        ) : (
          <DefaultEmptyState filterType={emptyStateType} />
        )
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: height }}>
          {filteredContacts.map((contact) => (
            <div key={contact.id}>{renderContact(contact)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WhatsAppContactList;
