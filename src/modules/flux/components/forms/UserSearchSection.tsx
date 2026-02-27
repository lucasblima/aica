/**
 * UserSearchSection Component
 *
 * Search for existing AICA users to link as athletes.
 * Shown at the top of AthleteFormDrawer in 'create' mode.
 *
 * Features:
 * - Debounced search input (300ms)
 * - Results list with avatar, name, email
 * - Selected user display with option to clear
 * - Toggle to switch to manual entry mode
 */

import React from 'react';
import { Search, X, UserCheck, UserPlus, Loader2 } from 'lucide-react';
import { useUserSearch, type UserSearchResult } from '../../hooks/useUserSearch';

interface UserSearchSectionProps {
  onUserSelected: (user: UserSearchResult) => void;
  onClear: () => void;
  selectedUser: UserSearchResult | null;
  isManualMode: boolean;
  onToggleManualMode: () => void;
}

export default function UserSearchSection({
  onUserSelected,
  onClear,
  selectedUser,
  isManualMode,
  onToggleManualMode,
}: UserSearchSectionProps) {
  const { query, setQuery, results, isSearching, error, hasSearched, clearResults } =
    useUserSearch(300);

  const handleSelectUser = (user: UserSearchResult) => {
    onUserSelected(user);
    clearResults();
  };

  const handleClearSelection = () => {
    onClear();
    clearResults();
  };

  // If a user is selected, show the selected user card
  if (selectedUser) {
    return (
      <div className="ceramic-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-ceramic-success" />
            <span className="text-xs font-bold text-ceramic-success uppercase tracking-wider">
              Usuario AICA vinculado
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-1 hover:bg-white/30 rounded transition-colors"
            title="Remover vinculo"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-ceramic-success/10 border border-ceramic-success/20 rounded-lg">
          {selectedUser.avatar_url ? (
            <img
              src={selectedUser.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-ceramic-success/20 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-ceramic-success" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ceramic-text-primary truncate">
              {selectedUser.full_name || 'Usuario sem nome'}
            </p>
            {selectedUser.email && (
              <p className="text-xs text-ceramic-text-secondary truncate">
                {selectedUser.email}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If in manual mode, show toggle to switch back
  if (isManualMode) {
    return (
      <div className="ceramic-card p-4">
        <button
          type="button"
          onClick={onToggleManualMode}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4 text-ceramic-info" />
          <span className="text-xs font-bold text-ceramic-info">
            Buscar usuario AICA existente
          </span>
        </button>
      </div>
    );
  }

  // Search mode
  return (
    <div className="ceramic-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-ceramic-info" />
          <span className="text-xs font-bold text-ceramic-info uppercase tracking-wider">
            Vincular usuario AICA
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full ceramic-inset pl-10 pr-4 py-3 rounded-lg text-sm text-ceramic-text-primary placeholder-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-ceramic-info/50"
          placeholder="Buscar por nome ou email..."
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary/50" />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-info animate-spin" />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-ceramic-warning px-1">{error}</p>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-ceramic-info/10 transition-colors text-left"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-ceramic-cool flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-ceramic-text-secondary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ceramic-text-primary truncate">
                  {user.full_name || 'Usuario sem nome'}
                </p>
                {user.email && (
                  <p className="text-xs text-ceramic-text-secondary truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {hasSearched && !isSearching && results.length === 0 && !error && (
        <p className="text-xs text-ceramic-text-secondary px-1 italic">
          Nenhum usuario encontrado para "{query}"
        </p>
      )}

      {/* Manual Entry Toggle */}
      <button
        type="button"
        onClick={onToggleManualMode}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 ceramic-inset hover:bg-white/50 rounded-lg transition-colors"
      >
        <UserPlus className="w-4 h-4 text-ceramic-text-secondary" />
        <span className="text-xs font-bold text-ceramic-text-secondary">
          Ou cadastrar manualmente
        </span>
      </button>
    </div>
  );
}
