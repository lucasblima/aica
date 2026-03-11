import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutGrid,
  BookOpen,
  Mic,
  FileText,
  DollarSign,
  Users,
  Activity,
  Calendar,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ModuleTab } from './ModuleTab';

// Lazy-load all 8 demos
const AtlasDemo = lazy(() =>
  import('./demo/AtlasDemo').then((m) => ({ default: m.AtlasDemo }))
);
const JourneyDemo = lazy(() =>
  import('./demo/JourneyDemo').then((m) => ({ default: m.JourneyDemo }))
);
const StudioDemo = lazy(() =>
  import('./demo/StudioDemo').then((m) => ({ default: m.StudioDemo }))
);
const GrantsDemo = lazy(() =>
  import('./demo/GrantsDemo').then((m) => ({ default: m.GrantsDemo }))
);
const FinanceDemo = lazy(() =>
  import('./demo/FinanceDemo').then((m) => ({ default: m.FinanceDemo }))
);
const ConnectionsDemo = lazy(() =>
  import('./demo/ConnectionsDemo').then((m) => ({
    default: m.ConnectionsDemo,
  }))
);
const FluxDemo = lazy(() =>
  import('./demo/FluxDemo').then((m) => ({ default: m.FluxDemo }))
);
const AgendaDemo = lazy(() =>
  import('./demo/AgendaDemo').then((m) => ({ default: m.AgendaDemo }))
);

interface ModuleConfig {
  id: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  component: React.LazyExoticComponent<React.ComponentType>;
}

const MODULES: ModuleConfig[] = [
  { id: 'atlas', name: 'Atlas', subtitle: 'Priorize o que importa', icon: LayoutGrid, component: AtlasDemo },
  { id: 'journey', name: 'Journey', subtitle: 'Consciência diária', icon: BookOpen, component: JourneyDemo },
  { id: 'studio', name: 'Studio', subtitle: 'Podcast copilot', icon: Mic, component: StudioDemo },
  { id: 'grants', name: 'Grants', subtitle: 'Captação inteligente', icon: FileText, component: GrantsDemo },
  { id: 'finance', name: 'Finance', subtitle: 'Visão financeira', icon: DollarSign, component: FinanceDemo },
  { id: 'connections', name: 'Connections', subtitle: 'Rede de contatos', icon: Users, component: ConnectionsDemo },
  { id: 'flux', name: 'Flux', subtitle: 'Treinos personalizados', icon: Activity, component: FluxDemo },
  { id: 'agenda', name: 'Agenda', subtitle: 'Google Calendar sync', icon: Calendar, component: AgendaDemo },
];

export function ModuleExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);

  // Auto-cycle every 5s until user clicks
  useEffect(() => {
    if (userInteracted) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MODULES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [userInteracted]);

  const handleTabClick = useCallback((index: number) => {
    setUserInteracted(true);
    setActiveIndex(index);
  }, []);

  const activeModule = MODULES[activeIndex];
  const ActiveIcon = activeModule.icon;
  const ActiveComponent = activeModule.component;

  return (
    <section className="bg-[#E8E6DF] py-16 md:py-24 px-4">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <h2 className="text-3xl md:text-5xl font-black text-ceramic-text-primary text-center mb-10 md:mb-14">
          8 dimensões da sua vida.{' '}
          <span className="text-amber-500">Um sistema.</span>
        </h2>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Tab list — vertical on desktop, horizontal scroll on mobile */}
          <div className="md:w-56 shrink-0">
            {/* Mobile: horizontal scroll */}
            <div className="flex md:hidden overflow-x-auto hide-scrollbar gap-1 pb-2">
              {MODULES.map((mod, idx) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleTabClick(idx)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap shrink-0 text-sm transition-colors ${
                    idx === activeIndex
                      ? 'bg-amber-50 text-ceramic-text-primary font-medium border border-amber-300'
                      : 'text-ceramic-text-secondary hover:bg-ceramic-cool/50'
                  }`}
                >
                  <mod.icon
                    className={`w-4 h-4 shrink-0 ${
                      idx === activeIndex ? 'text-amber-500' : ''
                    }`}
                  />
                  {mod.name}
                </button>
              ))}
            </div>

            {/* Desktop: vertical list */}
            <div className="hidden md:flex flex-col gap-1">
              {MODULES.map((mod, idx) => (
                <ModuleTab
                  key={mod.id}
                  icon={mod.icon}
                  name={mod.name}
                  isActive={idx === activeIndex}
                  onClick={() => handleTabClick(idx)}
                />
              ))}
            </div>
          </div>

          {/* Demo panel */}
          <div className="flex-1 bg-ceramic-base rounded-[2rem] shadow-ceramic-emboss p-6 md:p-8 min-h-[400px]">
            {/* Panel header */}
            <div className="flex items-center gap-3 mb-6">
              <ActiveIcon className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-ceramic-text-primary">
                  {activeModule.name}
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  {activeModule.subtitle}
                </p>
              </div>
            </div>

            {/* Demo content with animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    </div>
                  }
                >
                  <ActiveComponent />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
