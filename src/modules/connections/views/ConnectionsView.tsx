import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Sparkles, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useConnectionSpaces } from '../hooks/useConnectionSpaces';
import { SpaceCard } from '../components/SpaceCard';
import { CeramicTabSelector } from '@/components';
import { NetworkGraph } from '@/components/features/visualizations';
import { staggerContainer, staggerItem } from '../../../lib/animations/ceramic-motion';
import type { ArchetypeType } from '../types';
import { ARCHETYPE_CONFIG } from '../types';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('ConnectionsView');

const ARCHETYPE_COLORS: Record<string, string> = {
  habitat: '#10b981',
  ventures: '#f59e0b',
  academia: '#3b82f6',
  tribo: '#8b5cf6',
};

interface ConnectionsViewProps {
  userId: string;
  onNavigateToSpace?: (spaceId: string) => void;
  onCreateSpace?: (archetype?: ArchetypeType) => void;
}

type FilterTab = 'all' | ArchetypeType;

export function ConnectionsView({
  userId,
  onNavigateToSpace,
  onCreateSpace,
}: ConnectionsViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isTelegramExpanded, setIsTelegramExpanded] = useState(false);

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

  const filterTabs = [
    { id: 'all', label: 'Todos' },
    { id: 'habitat', label: '🏠 Habitat' },
    { id: 'ventures', label: '💼 Ventures' },
    { id: 'academia', label: '🎓 Academia' },
    { id: 'tribo', label: '👥 Tribo' },
  ];

  const filteredSpaces = useMemo(() => {
    if (activeFilter === 'all') return spaces;
    return byArchetype[activeFilter as ArchetypeType] || [];
  }, [activeFilter, spaces, byArchetype]);

  const networkNodes = useMemo(() => {
    if (!spaces?.length) return [];
    return spaces.map((s, i) => {
      const angle = (i / spaces.length) * 2 * Math.PI;
      return { id: s.id, label: s.name, role: s.archetype || 'tribo', x: 50 + 35 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) };
    });
  }, [spaces]);

  const networkLinks = useMemo(() => {
    if (networkNodes.length < 2) return [];
    return networkNodes.map((_, i) => ({ source: networkNodes[i].id, target: networkNodes[(i + 1) % networkNodes.length].id }));
  }, [networkNodes]);

  const handleToggleFavorite = async (spaceId: string, isFavorite: boolean) => {
    try {
      await toggleFavorite(spaceId, !isFavorite);
    } catch (err) {
      log.error('Toggle favorite error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="ceramic-card h-12 mb-4 animate-pulse" />
          <div className="ceramic-card h-10 animate-pulse" />
        </div>
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
          <div className="ceramic-inset w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-ceramic-error/10">
            <Sparkles className="w-8 h-8 text-ceramic-error" />
          </div>
          <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
            Erro ao carregar espaços
          </h3>
          <p className="text-sm text-ceramic-text-secondary mb-4">
            {error.message}
          </p>
          <button
            onClick={() => refresh()}
            className="ceramic-card px-6 py-2 text-sm font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Empty state — simple CTA
  if (spaces.length === 0) {
    return (
      <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
        <header className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
            Conexões
          </h1>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            Seus grupos de pessoas
          </p>
        </header>

        <div className="flex-1 px-6 pb-40 space-y-6">
          <div className="flex items-center justify-center">
          <motion.div
            className="ceramic-tray p-12 text-center max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="ceramic-inset w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-ceramic-info/10"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <Users className="w-10 h-10 text-ceramic-accent" />
            </motion.div>

            <h2 className="text-xl font-black text-ceramic-text-primary text-etched mb-2">
              Crie seu primeiro grupo
            </h2>
            <p className="text-sm text-ceramic-text-secondary mb-8">
              Organize pessoas por contexto: moradia, trabalho, estudos ou comunidade.
            </p>

            <motion.button
              onClick={() => onCreateSpace?.()}
              className="ceramic-shadow px-8 py-4 text-base font-bold text-white bg-ceramic-accent-dark rounded-full hover:shadow-lg active:scale-95 transition-all inline-flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-5 h-5" />
              Criar grupo
            </motion.button>
          </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Main view with spaces
  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      <header className="px-6 pt-6 pb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-ceramic-text-primary text-etched">
              Conexões
            </h1>
            <p className="text-sm text-ceramic-text-secondary mt-1">
              {totalCount} {totalCount === 1 ? 'grupo' : 'grupos'}
            </p>
          </div>

          <button
            onClick={() => onCreateSpace?.()}
            className="ceramic-card w-10 h-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            aria-label="Criar novo grupo"
          >
            <Plus className="w-5 h-5 text-ceramic-accent" />
          </button>
        </div>

        <CeramicTabSelector
          tabs={filterTabs}
          activeTab={activeFilter}
          onChange={(tabId) => setActiveFilter(tabId as FilterTab)}
        />
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-40 space-y-6">
        {/* Telegram Integration — collapsible */}
        <div className="ceramic-card overflow-hidden">
          <button
            onClick={() => setIsTelegramExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-ceramic-text-secondary hover:bg-ceramic-cool/50 transition-colors"
          >
            <span>Vincular Telegram</span>
            {isTelegramExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {isTelegramExpanded && (
            <div className="px-4 pb-4">
              <TelegramLinkCard />
            </div>
          )}
        </div>

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
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
                    onClick={() => onNavigateToSpace?.(space.id)}
                    onToggleFavorite={() => handleToggleFavorite(space.id, space.is_favorite)}
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Network Graph */}
        {networkNodes.length >= 2 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-ceramic-accent" />
              <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                Mapa da Rede
              </h2>
            </div>
            <div className="ceramic-card p-4 max-h-64 flex items-center justify-center">
              <div className="max-w-sm mx-auto w-full h-full">
                <NetworkGraph
                  nodes={networkNodes}
                  links={networkLinks}
                  roleColors={ARCHETYPE_COLORS}
                />
              </div>
            </div>
          </motion.section>
        )}

        {/* Main Grid */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-ceramic-accent" />
            <h2 className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              {activeFilter === 'all' ? 'Todos os grupos' : ARCHETYPE_CONFIG[activeFilter as ArchetypeType]?.label}
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
                <h3 className="text-base font-bold text-ceramic-text-primary mb-2">
                  Nenhum grupo nesta categoria
                </h3>
                <button
                  onClick={() => onCreateSpace?.()}
                  className="ceramic-shadow px-5 py-2.5 text-sm font-bold text-white bg-ceramic-accent-dark rounded-full hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Criar grupo
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
                      onClick={() => onNavigateToSpace?.(space.id)}
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
