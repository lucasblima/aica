import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Mic2, FolderOpen, AlertCircle, FileEdit, Home, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { HeaderGlobal } from '@/components/layout';
import type { PodcastShow } from '../types/podcast';
import { createNamespacedLogger } from '@/lib/logger';
import { updateShow, deleteShow, deleteEpisode as deleteEpisodeService } from '../services/workspaceDatabaseService';

const log = createNamespacedLogger('PodcastShowPage');

const tabContentVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

interface PodcastShowPageProps {
  showId: string;
  showTitle: string;
  onBack: () => void;
  onSelectEpisode: (episodeId: string) => void;
  onCreateEpisode: () => void;
  userEmail: string;
  onLogout: () => void;
}

type TabType = 'episodes' | 'drafts' | 'files' | 'settings';
type FilterType = 'all' | 'published' | 'draft' | 'in_progress';
type SortType = 'newest' | 'oldest' | 'name';

interface Episode {
  id: string;
  title: string;
  guest_name: string | null;
  status: 'draft' | 'planning' | 'in_progress' | 'in_production' | 'scheduled' | 'recorded' | 'editing' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  episode_theme: string | null;
}

/**
 * PodcastShowPage - Página de contexto dedicada para um podcast
 *
 * Fornece visão completa do podcast com:
 * - Header com informações e estatísticas
 * - Tabs: Episódios, Rascunhos, Arquivos, Configurações
 * - Grid de episódios com filtros e ordenação
 * - CRUD completo de episódios
 */
export const PodcastShowPage: React.FC<PodcastShowPageProps> = ({
  showId,
  showTitle,
  onBack,
  onSelectEpisode,
  onCreateEpisode,
  userEmail,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('episodes');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');

  // Fetch show details and episodes on mount
  useEffect(() => {
    fetchShowData();
  }, [showId]);

  const fetchShowData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);

      // Fetch show details
      const { data: showData, error: showError } = await supabase
        .from('podcast_shows_with_stats')
        .select('*')
        .eq('id', showId)
        .single();

      if (showError) throw showError;
      setShow(showData);

      // Fetch episodes
      const { data: episodesData, error: episodesError } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('show_id', showId)
        .order('created_at', { ascending: false });

      if (episodesError) throw episodesError;
      setEpisodes(episodesData || []);
    } catch (error) {
      log.error('Error fetching show data:', error);
      setFetchError('Nao foi possivel carregar os dados do podcast. Verifique sua conexao e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Computed values
  const stats = useMemo(() => {
    const total = episodes.length;
    const drafts = episodes.filter(e => e.status === 'draft').length;
    const published = episodes.filter(e => e.status === 'published').length;
    const inProgress = episodes.filter(e => e.status === 'in_progress').length;

    return { total, drafts, published, inProgress };
  }, [episodes]);

  // Filtered and sorted episodes
  const filteredEpisodes = useMemo(() => {
    let result = [...episodes];

    // Apply filter
    if (filter === 'published') result = result.filter(e => e.status === 'published');
    if (filter === 'draft') result = result.filter(e => e.status === 'draft');
    if (filter === 'in_progress') result = result.filter(e => e.status === 'in_progress');

    // Apply sort
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === 'name') result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

    return result;
  }, [episodes, filter, sortBy]);

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      {/* Header */}
      <HeaderGlobal
        title="Estúdio Aica"
        subtitle="PODCAST COPILOT"
        userEmail={userEmail}
        onLogout={onLogout}
        onLogoClick={() => navigate('/')}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Fetch Error Banner */}
        <AnimatePresence>
          {fetchError && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-6 mt-6 p-4 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ceramic-error font-medium">{fetchError}</p>
                <button
                  onClick={() => { setFetchError(null); fetchShowData(); }}
                  className="mt-2 text-sm text-ceramic-error hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="p-6 space-y-6">
            {/* Granular header skeleton */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-6">
                {/* Artwork placeholder */}
                <div className="w-24 h-24 rounded-2xl bg-ceramic-cool animate-pulse flex-shrink-0" />
                {/* Info lines */}
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-ceramic-cool animate-pulse rounded-lg w-2/3" />
                  <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-full" />
                  <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-4/5" />
                  {/* Stat badges */}
                  <div className="flex gap-4 mt-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-3 bg-ceramic-cool animate-pulse rounded w-12" />
                        <div className="h-6 bg-ceramic-cool animate-pulse rounded-lg w-10" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Action button placeholder */}
                <div className="h-11 w-36 bg-ceramic-cool animate-pulse rounded-xl flex-shrink-0" />
              </div>
            </div>
            {/* Tab bar skeleton */}
            <div className="flex gap-6 border-b border-ceramic-border px-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 bg-ceramic-cool animate-pulse rounded w-20 mb-3" />
              ))}
            </div>
            {/* Content area skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-ceramic-border p-4">
                  <div className="aspect-video bg-ceramic-cool animate-pulse rounded-xl mb-3" />
                  <div className="h-4 bg-ceramic-cool animate-pulse rounded-lg w-3/4 mb-2" />
                  <div className="h-3 bg-ceramic-cool animate-pulse rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : !fetchError && (
          <>
            {/* Navigation Bar */}
            <div className="flex items-center gap-2 mx-6 mt-4 mb-2">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-base text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-cool border border-ceramic-border transition-colors"
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-base text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-cool border border-ceramic-border transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Biblioteca
              </button>
            </div>

            {/* Show Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 mx-6 mt-2 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                {/* Show Artwork */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center shadow-lg flex-shrink-0">
                  {show?.cover_url ? (
                    <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Mic2 className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600" />
                  )}
                </div>

                {/* Show Info */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-ceramic-text-primary truncate">{showTitle}</h1>
                  <p className="text-ceramic-text-secondary mt-1 text-sm line-clamp-2">
                    {show?.description || 'Sem descricao'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mt-4">
                    <Stat label="Total" value={stats.total} />
                    <Stat label="Publicados" value={stats.published} color="green" />
                    <Stat label="Em progresso" value={stats.inProgress} color="amber" />
                    <Stat label="Rascunhos" value={stats.drafts} color="stone" />
                  </div>
                </div>

                {/* Actions */}
                <button
                  data-testid="new-episode-button"
                  onClick={onCreateEpisode}
                  className="ceramic-card px-4 py-3 font-bold rounded-xl hover:scale-105 transition-transform inline-flex items-center gap-2 shadow-sm flex-shrink-0 w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Novo Episodio
                </button>
              </div>
            </div>

            {/* Tabs */}
            <nav className="bg-ceramic-base border-b border-ceramic-border px-6 sticky top-0 z-10 overflow-x-auto">
              <div className="flex gap-4 sm:gap-6 min-w-max">
                <TabButton active={activeTab === 'episodes'} onClick={() => setActiveTab('episodes')}>
                  Episódios
                </TabButton>
                <TabButton active={activeTab === 'drafts'} onClick={() => setActiveTab('drafts')}>
                  Rascunhos
                </TabButton>
                <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
                  Arquivos
                </TabButton>
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
                  Configurações
                </TabButton>
              </div>
            </nav>

            {/* Tab Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {activeTab === 'episodes' && (
                    <EpisodesSection
                      episodes={filteredEpisodes}
                      filter={filter}
                      sortBy={sortBy}
                      onFilterChange={setFilter}
                      onSortChange={setSortBy}
                      onSelectEpisode={onSelectEpisode}
                      onCreateNew={onCreateEpisode}
                      onDeleteEpisode={() => fetchShowData()}
                    />
                  )}
                  {activeTab === 'drafts' && <DraftsSection episodes={episodes.filter(e => e.status === 'draft')} onSelectEpisode={onSelectEpisode} onDeleteEpisode={() => fetchShowData()} />}
                  {activeTab === 'files' && <FilesSection showId={showId} />}
                  {activeTab === 'settings' && <SettingsSection show={show} onRefresh={fetchShowData} onShowDeleted={onBack} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

/* ============================================================================
 * Sub-components
 * ========================================================================== */

interface StatProps {
  label: string;
  value: number;
  color?: 'green' | 'amber' | 'stone';
}

const Stat: React.FC<StatProps> = ({ label, value, color = 'stone' }) => {
  const colorClasses = {
    green: 'text-ceramic-success bg-ceramic-success-bg',
    amber: 'text-amber-700 bg-amber-100',
    stone: 'text-ceramic-text-primary bg-ceramic-base',
  };

  return (
    <div className="flex flex-col">
      <span className="text-xs text-ceramic-text-secondary uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-bold mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${colorClasses[color]} w-fit`}>
        {value}
      </span>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`
      py-3 px-1 border-b-2 font-medium text-sm transition-colors
      ${active
        ? 'border-amber-500 text-amber-600'
        : 'border-transparent text-ceramic-text-secondary hover:text-ceramic-text-primary'}
    `}
  >
    {children}
  </button>
);

interface EpisodesSectionProps {
  episodes: Episode[];
  filter: FilterType;
  sortBy: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onSelectEpisode: (episodeId: string) => void;
  onCreateNew: () => void;
  onDeleteEpisode: () => void;
}

const EpisodesSection: React.FC<EpisodesSectionProps> = ({
  episodes,
  filter,
  sortBy,
  onFilterChange,
  onSortChange,
  onSelectEpisode,
  onCreateNew,
  onDeleteEpisode,
}) => {
  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === 'all'} onClick={() => onFilterChange('all')}>
            Todos
          </FilterChip>
          <FilterChip active={filter === 'draft'} onClick={() => onFilterChange('draft')}>
            Rascunhos
          </FilterChip>
          <FilterChip active={filter === 'in_progress'} onClick={() => onFilterChange('in_progress')}>
            Em progresso
          </FilterChip>
          <FilterChip active={filter === 'published'} onClick={() => onFilterChange('published')}>
            Publicados
          </FilterChip>
        </div>

        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as SortType)}
          className="px-3 py-2 rounded-lg border border-ceramic-border text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="newest">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="name">Nome A-Z</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Create new card */}
        <CreateNewCard onClick={onCreateNew} />

        {/* Episode cards */}
        {episodes.map(episode => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            onClick={() => onSelectEpisode(episode.id)}
            onDelete={() => onDeleteEpisode()}
          />
        ))}
      </div>

      {/* Empty state */}
      {episodes.length === 0 && (
        <div className="text-center py-12 mt-8">
          <p className="text-ceramic-text-secondary">Nenhum episodio encontrado com os filtros selecionados</p>
        </div>
      )}
    </div>
  );
};

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`
      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
      ${active
        ? 'bg-amber-500 text-white shadow-sm'
        : 'bg-ceramic-base text-ceramic-text-secondary hover:bg-ceramic-cool'}
    `}
  >
    {children}
  </button>
);

const CreateNewCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="group ceramic-inset p-4 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 min-h-[12rem] rounded-2xl"
  >
    <div className="h-12 w-12 rounded-full border-2 border-dashed border-ceramic-text-secondary/50 flex items-center justify-center group-hover:border-ceramic-text-primary transition-colors">
      <Plus className="h-6 w-6 text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors" />
    </div>
    <span className="text-xs font-bold text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors text-center">
      Novo Episódio
    </span>
  </button>
);

interface EpisodeCardProps {
  episode: Episode;
  onClick: () => void;
  onDelete?: (episodeId: string) => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, onClick, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusConfig: Record<Episode['status'], { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-ceramic-base', text: 'text-ceramic-text-secondary', label: 'Rascunho' },
    planning: { bg: 'bg-ceramic-info/10', text: 'text-ceramic-info', label: 'Planejando' },
    in_progress: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Em progresso' },
    in_production: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Produzindo' },
    scheduled: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Agendado' },
    recorded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Gravado' },
    editing: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Editando' },
    published: { bg: 'bg-ceramic-success-bg', text: 'text-ceramic-success', label: 'Publicado' },
    archived: { bg: 'bg-stone-100', text: 'text-stone-500', label: 'Arquivado' },
  };

  const status = statusConfig[episode.status];
  const relativeDate = formatRelativeDate(episode.updated_at);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteEpisodeService(episode.id);
      onDelete?.(episode.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="
        bg-ceramic-base rounded-2xl p-4 text-left
        border border-ceramic-border
        hover:border-amber-300 hover:shadow-lg
        transition-all duration-200
        group relative
      "
    >
      {/* Menu button */}
      {onDelete && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); setConfirmDelete(false); }}
            className="p-1.5 rounded-lg bg-ceramic-base/80 text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 bg-ceramic-base border border-ceramic-border rounded-lg shadow-lg py-1 min-w-[140px]">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-ceramic-error hover:bg-ceramic-error/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Excluindo...' : confirmDelete ? 'Confirmar?' : 'Excluir'}
              </button>
            </div>
          )}
        </div>
      )}

      <button onClick={onClick} className="w-full text-left">
        {/* Thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mb-3 flex items-center justify-center">
          <Mic2 className="w-8 h-8 text-amber-400" />
        </div>

        {/* Content */}
        <h3 className="font-medium text-ceramic-text-primary line-clamp-2 group-hover:text-amber-600 transition-colors">
          {episode.title || 'Sem titulo'}
        </h3>

        <p className="text-sm text-ceramic-text-secondary mt-1 line-clamp-1">
          {episode.guest_name || 'Sem convidado'}
        </p>

        {episode.episode_theme && (
          <p className="text-xs text-ceramic-text-secondary mt-1 line-clamp-1">
            Tema: {episode.episode_theme}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ceramic-border">
          <span className={`text-xs px-2 py-1 rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>

          <span className="text-xs text-ceramic-text-secondary">{relativeDate}</span>
        </div>
      </button>
    </div>
  );
};

const DraftsSection: React.FC<{ episodes: Episode[]; onSelectEpisode: (id: string) => void; onDeleteEpisode: () => void }> = ({
  episodes,
  onSelectEpisode,
  onDeleteEpisode,
}) => (
  <div>
    <h2 className="text-lg font-bold text-ceramic-text-primary mb-4">Rascunhos</h2>
    {episodes.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-ceramic-cool rounded-full flex items-center justify-center mb-4">
          <FileEdit className="w-8 h-8 text-ceramic-text-secondary" />
        </div>
        <h3 className="text-lg font-medium text-ceramic-text-primary mb-1">Nenhum rascunho</h3>
        <p className="text-sm text-ceramic-text-secondary mb-4">
          Episodios salvos como rascunho aparecerao aqui
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {episodes.map(episode => (
          <EpisodeCard key={episode.id} episode={episode} onClick={() => onSelectEpisode(episode.id)} onDelete={() => onDeleteEpisode()} />
        ))}
      </div>
    )}
  </div>
);

const FilesSection: React.FC<{ showId: string }> = ({ showId }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 bg-ceramic-cool rounded-full flex items-center justify-center mb-4">
      <FolderOpen className="w-8 h-8 text-ceramic-text-secondary" />
    </div>
    <h3 className="text-lg font-medium text-ceramic-text-primary mb-1">Arquivos do Podcast</h3>
    <p className="text-sm text-ceramic-text-secondary mb-4">
      Em breve: gerencie logos, intros, musicas e assets
    </p>
    <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
      Fazer upload
    </button>
  </div>
);

interface SettingsSectionProps {
  show: PodcastShow | null;
  onRefresh: () => void;
  onShowDeleted: () => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ show, onRefresh, onShowDeleted }) => {
  const [title, setTitle] = useState(show?.title || '');
  const [description, setDescription] = useState(show?.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = title !== (show?.title || '') || description !== (show?.description || '');

  const handleSave = async () => {
    if (!show || !hasChanges) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await updateShow(show.id, { title, description });
      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!show) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteShow(show.id);
      onShowDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-ceramic-text-primary mb-4">Configuracoes do Podcast</h2>
      <div className="ceramic-card p-6 rounded-2xl space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30">
            <p className="text-sm text-ceramic-error">{error}</p>
          </div>
        )}
        {saveSuccess && (
          <div className="p-3 rounded-lg bg-ceramic-success/10 border border-ceramic-success/30">
            <p className="text-sm text-ceramic-success">Alteracoes salvas com sucesso!</p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-ceramic-text-primary mb-1">Nome do Podcast</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-ceramic-border rounded-lg text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ceramic-text-primary mb-1">Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-ceramic-border rounded-lg text-ceramic-text-primary bg-ceramic-base focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`
            px-6 py-2.5 rounded-lg font-medium text-sm transition-all
            ${hasChanges
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
              : 'bg-ceramic-cool text-ceramic-text-secondary cursor-not-allowed'}
          `}
        >
          {saving ? 'Salvando...' : 'Salvar Alteracoes'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 ceramic-card p-6 rounded-2xl border border-ceramic-error/30">
        <h3 className="text-lg font-bold text-ceramic-error mb-2">Zona de Perigo</h3>
        <p className="text-sm text-ceramic-text-secondary mb-4">
          Excluir o podcast ira remover permanentemente todos os episodios e dados associados.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg border border-ceramic-error text-ceramic-error text-sm font-medium hover:bg-ceramic-error/10 transition-colors"
          >
            Excluir Podcast
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-ceramic-error text-white text-sm font-medium hover:bg-ceramic-error/90 transition-colors"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusao'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-lg border border-ceramic-border text-ceramic-text-secondary text-sm font-medium hover:bg-ceramic-cool transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * Utilities
 * ========================================================================== */

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}m`;
  return `${Math.floor(diffDays / 365)}a`;
}

export default PodcastShowPage;
