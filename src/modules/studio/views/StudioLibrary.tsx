import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic2, AlertCircle, Calendar, BarChart3, Palette, Home } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { PodcastShow } from '../types/podcast';
import { CreatePodcastDialog } from '../components/CreatePodcastDialog';
import { HeaderGlobal } from '@/components/layout';
import type { StudioLibraryProps, ProjectType } from '../types/studio';
import { createNamespacedLogger } from '@/lib/logger';
import { getAllProjectTypes } from '../config/projectTypeConfigs';
import { ProjectTypePreview } from '../components/ProjectTypePreview';

const gridContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

const log = createNamespacedLogger('StudioLibrary');

/**
 * StudioLibrary Component
 *
 * Generic library view for listing and creating Studio projects.
 * Currently supports podcast shows and episodes.
 *
 * Key Features:
 * - Lists all podcast shows
 * - Shows episode count and browse episodes
 * - Create new podcast show
 * - Use callbacks instead of internal navigation
 *
 * Props:
 * - onSelectShow: Called when user selects a show
 * - onSelectProject: Called when user selects a project/episode
 * - onCreateNew: Called when user clicks create new show
 * - userEmail: User's email for header display
 * - onLogout: Called when user clicks logout
 */
export const StudioLibrary: React.FC<StudioLibraryProps> = ({
  onSelectShow,
  onSelectProject,
  onCreateNew,
  userEmail,
  onLogout
}) => {
  const navigate = useNavigate();
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('podcast_shows_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShows(data || []);
    } catch (error) {
      log.error('Error loading podcast shows:', error);
      setLoadError('Não foi possível carregar seus podcasts. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate to show page
   */
  const handleShowClick = (showId: string, showTitle: string) => {
    onSelectShow(showId, showTitle);
  };

  const handleCreateShow = async (title: string, description: string) => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('podcast_shows')
        .insert({
          name: title,
          description,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        log.error('Supabase error details:', error);
        throw error;
      }

      log.debug('Show created successfully:', data);
      setShowModal(false);
      loadShows();

      // Navigate to the newly created show page
      onSelectShow(data.id, data.name);

      // Note: Don't call onCreateNew() here - let user manually click "Criar Episódio"
      // This ensures the show ID is properly set before opening the wizard
    } catch (error) {
      log.error('Error creating show:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setCreateError(`Erro ao criar podcast: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div data-testid="studio-library" className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header with HeaderGlobal */}
      <HeaderGlobal
        title="Estúdio Aica"
        subtitle="CONTENT STUDIO"
        userEmail={userEmail}
        onLogout={onLogout}
        onLogoClick={() => navigate('/')}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4">
        {/* Quick Links */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ceramic-base text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-cool border border-ceramic-border transition-colors"
          >
            <Home className="w-4 h-4" />
            Inicio
          </button>
          <a href="/studio/calendar" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ceramic-cool text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-border transition-colors">
            <Calendar className="w-4 h-4" />
            Calendário
          </a>
          <a href="/studio/analytics" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ceramic-cool text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-border transition-colors">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </a>
          <a href="/studio/brandkit" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ceramic-cool text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-border transition-colors">
            <Palette className="w-4 h-4" />
            Brand Kit
          </a>
        </div>
        {/* Error Banners */}
        <AnimatePresence>
          {loadError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ceramic-error font-medium">{loadError}</p>
                <button
                  onClick={() => { setLoadError(null); loadShows(); }}
                  className="mt-2 text-sm text-ceramic-error hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            </motion.div>
          )}
          {createError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ceramic-error font-medium">{createError}</p>
                <button
                  onClick={() => { setCreateError(null); setShowModal(true); }}
                  className="mt-2 text-sm text-ceramic-error hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shows Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ceramic-card p-4 flex flex-col rounded-2xl">
                {/* Cover placeholder */}
                <div className="rounded-xl mb-3 aspect-square bg-ceramic-cool animate-pulse" />
                {/* Title line */}
                <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-3/4 mb-2" />
                {/* Badge line */}
                <div className="h-3 bg-ceramic-cool animate-pulse rounded-full w-16 mt-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Show Card - Inset Style */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              variants={gridContainerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={gridItemVariants}>
                <button
                  data-testid="create-new-button"
                  onClick={() => setShowModal(true)}
                  className="group ceramic-inset p-4 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 min-h-[12rem] rounded-2xl w-full h-full"
                >
                  <div className="h-12 w-12 rounded-full border-2 border-dashed border-ceramic-text-secondary/50 flex items-center justify-center group-hover:border-ceramic-text-primary transition-colors">
                    <Plus className="h-6 w-6 text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors text-center">Criar Novo</span>
                </button>
              </motion.div>

              {/* Existing Shows */}
              {shows.map(show => (
                <motion.div key={show.id} variants={gridItemVariants}>
                  <button
                    data-testid="show-card"
                    onClick={() => handleShowClick(show.id, show.title)}
                    className="group ceramic-card p-4 text-left hover:scale-[1.02] transition-all duration-300 flex flex-col rounded-2xl w-full h-full"
                  >
                    {/* Cover Image */}
                    <div className="ceramic-inset rounded-xl mb-3 aspect-square overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                      {show.cover_url ? (
                        <img
                          src={show.cover_url}
                          alt={show.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Mic2 className="w-8 h-8 text-amber-600 opacity-30" />
                      )}
                    </div>

                    {/* Show Info */}
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-ceramic-text-primary mb-1 group-hover:text-amber-600 transition-colors line-clamp-2">
                        {show.title}
                      </h3>
                      {/* Episode Count Badge */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          {show.episodes_count || 0} eps
                        </span>
                      </div>
                    </div>

                    {/* Hover indicator */}
                    <div className="flex justify-end items-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-amber-600">
                        Ver detalhes →
                      </span>
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Empty State */}
        {!loading && shows.length === 0 && (
          <div className="text-center py-20">
            <div className="ceramic-inset inline-flex p-8 rounded-3xl mb-6">
              <Mic2 className="w-10 h-10 text-ceramic-text-tertiary" />
            </div>
            <h2 className="text-2xl font-bold text-ceramic-text-primary mb-3">
              Nenhum podcast ainda
            </h2>
            <p className="text-ceramic-text-secondary mb-8">
              Crie seu primeiro show para começar a produzir episódios
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="ceramic-card px-6 py-3 text-ceramic-text-primary font-bold rounded-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Podcast
            </button>
          </div>
        )}

        {/* Content Types Section */}
        {!loading && (
          <div className="mt-10 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary mb-4">
              Criar Novo Projeto
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getAllProjectTypes().map(config => (
                <ProjectTypePreview
                  key={config.type}
                  config={config}
                  disabled={config.comingSoon}
                  onClick={
                    config.comingSoon
                      ? undefined
                      : config.type === 'podcast'
                        ? () => setShowModal(true)
                        : () => onCreateNew(config.type as ProjectType)
                  }
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      <CreatePodcastDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateShow}
      />
    </div>
  );
};

export default StudioLibrary;
