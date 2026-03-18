/**
 * ModuleHubPage — Bento grid showing ALL modules
 * CS-004: Module Hub Page
 *
 * Features:
 * - Bento grid with all modules
 * - Filter tabs: All | Active | Coming Soon | By Category
 * - AI chat preview modal
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Grid3X3, Zap, Clock, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModuleRegistry, type ModuleRegistryEntry } from '@/hooks/useModuleRegistry';
import { PageShell, CeramicLoadingState } from '@/components/ui';
import { ModuleCard } from './ModuleCard';

type FilterMode = 'all' | 'active' | 'coming-soon' | 'category';

const MODULE_ROUTES: Record<string, string> = {
  atlas: '/',
  agenda: '/',
  journey: '/',
  studio: '/studio',
  finance: '/',
  connections: '/connections',
  eraforge: '/eraforge',
  flux: '/flux',
  telegram: '/connections',
};

const FILTER_OPTIONS: { key: FilterMode; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Todos', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
  { key: 'active', label: 'Ativos', icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'coming-soon', label: 'Em Breve', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'category', label: 'Categoria', icon: <Layers className="w-3.5 h-3.5" /> },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export function ModuleHubPage() {
  const navigate = useNavigate();
  const {
    modules,
    isLoading,
    isOnWaitlist,
    joinWaitlist,
    leaveWaitlist,
  } = useModuleRegistry();

  const [filter, setFilter] = useState<FilterMode>('all');
  // Filter logic
  const filteredModules = useMemo(() => {
    switch (filter) {
      case 'active':
        return modules.filter((m) => m.status === 'live');
      case 'coming-soon':
        return modules.filter((m) => m.status !== 'live');
      default:
        return modules;
    }
  }, [modules, filter]);

  // Group by category for category view
  const categorizedModules = useMemo(() => {
    if (filter !== 'category') return null;
    const groups: Record<string, ModuleRegistryEntry[]> = {};
    modules.forEach((m) => {
      const cat = m.category || 'outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [modules, filter]);

  const handleNavigateToModule = (moduleId: string) => {
    const route = MODULE_ROUTES[moduleId];
    if (route) {
      navigate(route);
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <CeramicLoadingState variant="page" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl shadow-ceramic-emboss bg-ceramic-base flex items-center justify-center text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-ceramic-text-primary">Modulos</h1>
            <p className="text-xs text-ceramic-text-secondary">
              {modules.length} modulos &middot;{' '}
              {modules.filter((m) => m.status === 'live').length} ativos
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filter === opt.key
                  ? 'bg-ceramic-text-primary text-white shadow-ceramic-emboss'
                  : 'bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-cool-hover'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Module grid */}
        {filter === 'category' && categorizedModules ? (
          <div className="space-y-6">
            {Object.entries(categorizedModules).map(([category, mods]) => (
              <div key={category}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary mb-3 px-1 capitalize">
                  {category}
                </h3>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {mods.map((m) => (
                    <motion.div key={m.id} variants={staggerItem}>
                      <ModuleCard
                        module={m}
                        isOnWaitlist={isOnWaitlist(m.id)}
                        onJoinWaitlist={() => joinWaitlist(m.id)}
                        onLeaveWaitlist={() => leaveWaitlist(m.id)}
                        onNavigate={m.status === 'live' ? () => handleNavigateToModule(m.id) : undefined}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {filteredModules.map((m) => (
              <motion.div key={m.id} variants={staggerItem}>
                <ModuleCard
                  module={m}
                  isOnWaitlist={isOnWaitlist(m.id)}
                  onJoinWaitlist={() => joinWaitlist(m.id)}
                  onLeaveWaitlist={() => leaveWaitlist(m.id)}
                  onNavigate={m.status === 'live' ? () => handleNavigateToModule(m.id) : undefined}
                />
              </motion.div>
            ))}
          </motion.div>
        )}

        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-ceramic-text-secondary">Nenhum módulo encontrado</p>
          </div>
        )}
      </div>

    </PageShell>
  );
}

export default ModuleHubPage;
