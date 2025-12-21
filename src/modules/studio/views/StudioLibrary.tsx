import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowRight, Mic2, ChevronDown } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { PodcastShow } from '../types/podcast';
import { CreatePodcastDialog } from '../components/CreatePodcastDialog';
import { HeaderGlobal } from '../../../components/HeaderGlobal';
import type { StudioLibraryProps, StudioProject } from '../types/studio';

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
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [episodesByShow, setEpisodesByShow] = useState<Record<string, StudioProject[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('podcast_shows_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShows(data || []);
    } catch (error) {
      console.error('Error loading podcast shows:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load episodes for a specific show
   * Converts PodcastEpisode to StudioProject
   */
  const loadEpisodes = useCallback(async (showId: string, show: PodcastShow) => {
    try {
      setLoadingEpisodes(prev => ({ ...prev, [showId]: true }));

      const { data, error } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('show_id', showId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert episodes to StudioProject
      const projects: StudioProject[] = (data || []).map(episode => episodeToProject(episode, show));
      setEpisodesByShow(prev => ({ ...prev, [showId]: projects }));
    } catch (error) {
      console.error(`Error loading episodes for show ${showId}:`, error);
    } finally {
      setLoadingEpisodes(prev => ({ ...prev, [showId]: false }));
    }
  }, []);

  /**
   * Toggle expansion of a show to see its episodes
   */
  const handleToggleExpand = useCallback((showId: string, show: PodcastShow) => {
    if (expandedShowId === showId) {
      setExpandedShowId(null);
    } else {
      setExpandedShowId(showId);
      // Load episodes if not already loaded
      if (!episodesByShow[showId]) {
        loadEpisodes(showId, show);
      }
    }
  }, [expandedShowId, episodesByShow, loadEpisodes]);

  const handleCreateShow = async (title: string, description: string) => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('podcast_shows')
        .insert({
          name: title,
          title: title,
          description,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      console.log('Show created successfully:', data);
      setShowModal(false);
      loadShows();

      // Select the newly created show and expand it
      // This allows the user to see the "Criar Episódio" button for this show
      setExpandedShowId(data.id);
      onSelectShow(data.id);

      // Note: Don't call onCreateNew() here - let user manually click "Criar Episódio"
      // This ensures the show ID is properly set before opening the wizard
    } catch (error) {
      console.error('Error creating show:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert(`Erro ao criar podcast: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div data-testid="studio-library" className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header with HeaderGlobal */}
      <HeaderGlobal
        title="Estúdio Aica"
        subtitle="PODCAST COPILOT"
        userEmail={userEmail}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-4">
        {/* Shows Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ceramic-card h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Show Card - Inset Style */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <button
                data-testid="create-new-button"
                onClick={() => setShowModal(true)}
                className="group ceramic-inset p-4 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 min-h-[12rem] rounded-2xl"
              >
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-ceramic-text-secondary/50 flex items-center justify-center group-hover:border-ceramic-text-primary transition-colors">
                  <Plus className="h-6 w-6 text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors" />
                </div>
                <span className="text-xs font-bold text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors text-center">Criar Novo</span>
              </button>

              {/* Existing Shows */}
              {shows.map(show => {
                const isExpanded = expandedShowId === show.id;
                return (
                <button
                  key={show.id}
                  data-testid="show-card"
                  onClick={() => handleToggleExpand(show.id, show)}
                  className={`group ceramic-card p-4 text-left hover:scale-[1.02] transition-all duration-300 flex flex-col rounded-2xl ${
                    isExpanded ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-ceramic-base' : ''
                  }`}
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

                  {/* Expansion Indicator */}
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-[10px] font-bold transition-opacity ${
                      isExpanded ? 'text-amber-600 opacity-100' : 'opacity-0 group-hover:opacity-70 text-ceramic-text-secondary'
                    }`}>
                      {isExpanded ? 'Ver episódios ↓' : 'Clique para ver episódios'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-amber-600 transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : 'opacity-0 group-hover:opacity-100'
                    }`} />
                  </div>
                </button>
              )}
              )}
            </div>

            {/* Episodes List for Expanded Show */}
            {expandedShowId && episodesByShow[expandedShowId] && (
              <div className="mt-8 pt-8 border-t border-ceramic-text-tertiary/20 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ceramic-text-primary">
                    Episódios
                  </h2>
                  <button
                    onClick={() => setExpandedShowId(null)}
                    className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors font-bold"
                  >
                    Fechar ✕
                  </button>
                </div>
                {loadingEpisodes[expandedShowId] ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="ceramic-card h-32 animate-pulse" />
                    ))}
                  </div>
                ) : episodesByShow[expandedShowId].length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-ceramic-text-secondary mb-4">Nenhum episódio neste podcast</p>
                    <button
                      onClick={() => {
                        // Set the show ID in context FIRST
                        onSelectShow(expandedShowId);
                        // Then open the wizard to create an episode for this show
                        onCreateNew();
                      }}
                      className="ceramic-card px-6 py-3 text-ceramic-text-primary font-bold rounded-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Criar Episódio
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {episodesByShow[expandedShowId].map(episode => (
                      <button
                        key={episode.id}
                        data-testid="episode-card"
                        onClick={() => onSelectProject(episode)}
                        className="group ceramic-card p-4 text-left hover:scale-[1.02] transition-all duration-300 flex flex-col rounded-2xl"
                      >
                        {/* Thumbnail */}
                        <div className="ceramic-inset rounded-xl mb-3 aspect-square overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <Mic2 className="w-8 h-8 text-blue-600 opacity-30" />
                        </div>

                        {/* Episode Info */}
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-ceramic-text-primary mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {episode.title || 'Untitled Episode'}
                          </h4>
                          <p className="text-xs text-ceramic-text-secondary mb-2 line-clamp-1">
                            {episode.metadata && 'guestName' in episode.metadata && episode.metadata.guestName
                              ? `Guest: ${episode.metadata.guestName}`
                              : 'No guest assigned'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                              {episode.status}
                            </span>
                          </div>
                        </div>

                        {/* Hover Arrow */}
                        <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                        </div>
                      </button>
                    ))}

                    {/* Create New Episode Button */}
                    <button
                      onClick={() => {
                        // Set the show ID in context FIRST
                        onSelectShow(expandedShowId);
                        // Then open the wizard to create an episode for this show
                        onCreateNew();
                      }}
                      className="group ceramic-inset p-4 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 min-h-[12rem] rounded-2xl"
                    >
                      <div className="h-12 w-12 rounded-full border-2 border-dashed border-ceramic-text-secondary/50 flex items-center justify-center group-hover:border-ceramic-text-primary transition-colors">
                        <Plus className="h-6 w-6 text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors" />
                      </div>
                      <span className="text-xs font-bold text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors text-center">Novo Ep.</span>
                    </button>
                  </div>
                )}
              </div>
            )}
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

/**
 * Convert a PodcastEpisode to StudioProject
 * Extracts relevant data and structures it for the generic Studio interface
 */
function episodeToProject(
  episode: any,
  show: PodcastShow
): StudioProject {
  return {
    id: episode.id,
    type: 'podcast',
    title: episode.title || 'Untitled Episode',
    description: episode.description,
    showId: episode.show_id,
    showTitle: show.title,
    status: episode.status || 'draft',
    createdAt: new Date(episode.created_at),
    updatedAt: new Date(episode.updated_at),
    metadata: {
      type: 'podcast',
      guestName: episode.setup?.guest_name || episode.guest_name,
      episodeTheme: episode.setup?.theme || episode.episode_theme,
      scheduledDate: episode.setup?.scheduled_date || episode.scheduled_date,
      scheduledTime: episode.setup?.scheduled_time,
      location: episode.setup?.location || episode.location,
      season: episode.setup?.season || episode.season,
      recordingDuration: episode.recording_duration
    }
  };
}

export default StudioLibrary;
