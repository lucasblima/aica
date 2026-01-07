import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Sparkles, TrendingUp, MessageSquare } from 'lucide-react';
import { useConnectionSpaces } from '../hooks/useConnectionSpaces';
import { SpaceCard } from '../components/SpaceCard';
import { CeramicTabSelector } from '../../../components/CeramicTabSelector';
import { staggerContainer, staggerItem } from '../../../lib/animations/ceramic-motion';
import type { Archetype } from '../types';
import { ARCHETYPE_CONFIG } from '../types';

interface ConnectionsViewProps {
  userId: string;
  onNavigateToSpace?: (spaceId: string, archetype: Archetype) => void;
  onCreateSpace?: (archetype?: Archetype) => void;
}

type FilterTab = 'all' | Archetype;

/**
 * ConnectionsView - Main container for displaying and managing Connection Spaces
 *
 * This is the primary view for the Connections module, displaying all connection spaces
 * organized by archetype with filtering, favorites, and quick actions.
 *
 * Features:
 * - Archetype filtering (All, Habitat, Ventures, Academia, Tribo)
 * - Favorites section for quick access
 * - Quick stats showing total spaces, active collaborations, pending invitations
 * - Responsive grid layout (1/2/3 columns)
 * - Empty state with archetype suggestions
 * - Pull-to-refresh support
 * - Loading skeletons
 *
 * @example
 * ```tsx
 * <ConnectionsView
 *   userId={user.id}
 *   onNavigateToSpace={(id) => navigate(`/spaces/${id}`)}
 *   onCreateSpace={() => setShowCreateModal(true)}
 * />
 * ```
 */
export function ConnectionsView({
  userId,
  onNavigateToSpace,
  onCreateSpace,
}: ConnectionsViewProps) {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch connection spaces
  const {
    spaces,
    isLoading,
    error,
    refresh,
    toggleFavorite,
    favorites,
    byArchetype,
    totalCount,
  } = useConnectionSpaces({ autoFetch: true });

  // Filter tabs
  const filterTabs = [
    { id: 'all', label: 'Todos' },
    { id: 'habitat', label: 'Habitat' },
    { id: 'ventures', label: 'Ventures' },
    { id: 'academia', label: 'Academia' },
    { id: 'tribo', label: 'Tribo' },
  ];

  // Filtered spaces based on active tab
  const filteredSpaces = useMemo(() => {
    if (activeFilter === 'all') return spaces;
    return byArchetype[activeFilter as Archetype] || [];
  }, [activeFilter, spaces, byArchetype]);

  // Quick stats
  const stats = useMemo(() => {
    // TODO: Integrate with actual member/invitation data when available
    const activeCollaborations = spaces.filter(s => s.is_active).length;
    const pendingInvitations = 0; // Placeholder for future feature

    return {
      totalSpaces: totalCount,
      activeCollaborations,
      pendingInvitations,
    };
  }, [spaces, totalCount]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('[ConnectionsView] Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async (spaceId: string, isFavorite: boolean) => {
    try {
      await toggleFavorite(spaceId, !isFavorite);
    } catch (err) {
      console.error('[ConnectionsView] Toggle favorite error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="px-6 pt-6 pb-4">
          <div className="ceramic-card h-12 mb-4 animate-pulse" />
          <div className="ceramic-card h-10 animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="flex-1 overflow-y-auto px-6 pb-40 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="ceramic-card h-48 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
        <div className="ceramic-card p-8 max-w-md text-center">
          <div className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-red-50">
            <Sparkles className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Erro ao carregar espaços
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-4">
            {error.message}
          </p>
          <button
            onClick={handleRefresh}
            className="ceramic-card px-6 py-2 text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (spaces.length === 0) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
                Minhas Conexões
              </h1>
              <p className="text-sm text-ceramic-text-secondary mt-1">
                Seus espaços de colaboração
              </p>
            </div>
          </div>
        </header>

        {/* Empty state with archetype guidance - warm and inviting */}
        <div className="flex-1 overflow-y-auto px-6 pb-40">
          <motion.div
            className="ceramic-tray p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Icon with ceramic inset */}
            <motion.div
              className="ceramic-inset w-24 h-24 flex items-center justify-center mx-auto mb-8 bg-blue-50"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <Sparkles className="w-12 h-12 text-ceramic-accent" />
            </motion.div>

            {/* Main headline */}
            <h2 className="text-2xl font-black text-ceramic-text-primary text-etched mb-3">
              Comece sua primeira conexão
            </h2>
            <p className="text-base text-ceramic-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
              Escolha um arquétipo para criar seu primeiro espaço de colaboração e transformar ideias em realidade
            </p>

            {/* Archetype suggestions - tactile grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
              {Object.entries(ARCHETYPE_CONFIG).map(([key, config]) => (
                <motion.button
                  key={key}
                  onClick={() => onCreateSpace?.(key as Archetype)}
                  className="ceramic-card p-6 text-left hover:scale-[1.02] transition-transform group"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={`Criar ${config.label}`}
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                    {config.icon}
                  </div>
                  <h3 className="font-bold text-base text-ceramic-text-primary mb-2 group-hover:text-ceramic-accent transition-colors">
                    {config.label}
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary line-clamp-2">
                    {config.subtitle}
                  </p>
                </motion.button>
              ))}
            </div>

            {/* Primary CTA Button - Inevitable action */}
            <motion.button
              onClick={onCreateSpace}
              className="ceramic-shadow px-8 py-4 text-base font-bold text-white bg-ceramic-accent-dark rounded-full hover:shadow-lg active:scale-95 transition-all inline-flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Criar primeiro espaço"
            >
              <Plus className="w-5 h-5" />
              Criar meu primeiro espaço
            </motion.button>

            {/* Subtle supporting text */}
            <p className="text-xs text-ceramic-text-secondary mt-6 opacity-75">
              Cada arquétipo oferece ferramentas específicas para sua jornada colaborativa
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main view with spaces
  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header Section */}
      <header className="px-6 pt-6 pb-4 space-y-4">
        {/* Title and Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
              Minhas Conexões
            </h1>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              {totalCount} {totalCount === 1 ? 'espaço' : 'espaços'}
            </p>
          </div>

          <button
            onClick={onCreateSpace}
            className="ceramic-card w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            aria-label="Criar novo espaço"
          >
            <Plus className="w-5 h-5 text-ceramic-accent" />
          </button>
        </div>

        {/* Filter Tabs */}
        <CeramicTabSelector
          tabs={filterTabs}
          activeTab={activeFilter}
          onChange={(tabId) => setActiveFilter(tabId as FilterTab)}
        />

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="ceramic-inset-shallow p-3 text-center">
            <div className="text-xl font-black text-ceramic-accent">
              {stats.totalSpaces}
            </div>
            <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
              Espaços
            </div>
          </div>

          <div className="ceramic-inset-shallow p-3 text-center">
            <div className="text-xl font-black text-ceramic-accent">
              {stats.activeCollaborations}
            </div>
            <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
              Ativos
            </div>
          </div>

          {/* Invitations stat - actionable when zero */}
          {stats.pendingInvitations === 0 ? (
            <motion.button
              onClick={onCreateSpace}
              className="ceramic-inset p-3 text-center hover:scale-[1.02] active:scale-[0.98] transition-transform"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Convidar pessoas"
            >
              <div className="text-sm font-bold text-ceramic-accent">
                Convidar
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
                Iniciar
              </div>
            </motion.button>
          ) : (
            <div className="ceramic-inset-shallow p-3 text-center">
              <div className="text-xl font-black text-ceramic-accent">
                {stats.pendingInvitations}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary uppercase tracking-wider mt-1">
                Convites
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-ceramic-accent" />
              <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Favoritos
              </h2>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-thin scrollbar-thumb-ceramic-text-secondary/20">
              {favorites.map(space => (
                <div key={space.id} className="min-w-[280px]">
                  <SpaceCard
                    space={space}
                    variant="compact"
                    showFavorite
                    onClick={() => onNavigateToSpace?.(space.id, space.archetype)}
                    onToggleFavorite={() => handleToggleFavorite(space.id, space.is_favorite)}
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Main Grid */}

        {/* Analytics & Tools Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-ceramic-accent" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Ferramentas & Análises
            </h2>
          </div>

          <motion.button
            onClick={() => navigate('/connections/analytics/whatsapp')}
            className="w-full ceramic-card p-4 text-left hover:scale-[1.01] transition-transform group"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            aria-label="WhatsApp Analytics Dashboard"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-ceramic-text-primary group-hover:text-ceramic-accent transition-colors">
                  WhatsApp Analytics
                </h3>
                <p className="text-sm text-ceramic-text-secondary mt-1">
                  Análise emocional e inteligência de mensagens
                </p>
              </div>
              <MessageSquare className="w-5 h-5 text-ceramic-accent/60 group-hover:text-ceramic-accent transition-colors flex-shrink-0 ml-3" />
            </div>
          </motion.button>
        </motion.section>
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-ceramic-accent" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              {activeFilter === 'all' ? 'Todos os espaços' : ARCHETYPE_CONFIG[activeFilter as Archetype]?.label}
            </h2>
            <span className="text-xs text-ceramic-text-secondary/60">
              ({filteredSpaces.length})
            </span>
          </div>

          <AnimatePresence mode="wait">
            {filteredSpaces.length === 0 ? (
              <motion.div
                key="empty-filter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="ceramic-tray p-8 text-center"
              >
                <div className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-blue-50">
                  <Sparkles className="w-8 h-8 text-ceramic-accent" />
                </div>
                <h3 className="text-base font-bold text-ceramic-text-primary mb-2">
                  Nenhum espaço nesta categoria
                </h3>
                <p className="text-sm text-ceramic-text-secondary mb-6">
                  Crie o primeiro espaço neste arquétipo
                </p>
                <button
                  onClick={onCreateSpace}
                  className="ceramic-shadow px-5 py-2.5 text-sm font-bold text-white bg-ceramic-accent-dark rounded-full hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar espaço
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredSpaces.map(space => (
                  <motion.div key={space.id} variants={staggerItem}>
                    <SpaceCard
                      space={space}
                      variant="full"
                      showFavorite
                      memberCount={0} // TODO: Add member count when available
                      onClick={() => onNavigateToSpace?.(space.id, space.archetype)}
                      onToggleFavorite={() => handleToggleFavorite(space.id, space.is_favorite)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

    </div>
  );
}

export default ConnectionsView;
