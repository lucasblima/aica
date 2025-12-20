import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, User, Clock, Settings, ChevronLeft, Mic2, Trash2, Archive, ArchiveRestore, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../../../src/services/supabaseClient';
import { PodcastShow } from '../types';

type SortOption = 'created_desc' | 'created_asc' | 'scheduled_desc' | 'scheduled_asc' | 'season' | 'location';

interface Episode {
    id: string;
    title: string;
    guest_name?: string;
    status: 'draft' | 'in_production' | 'published' | 'archived';
    scheduled_date?: string;
    created_at: string;
    season?: string;
    location?: string;
}

interface PodcastDashboardProps {
    showId: string;
    showTitle: string; // Fallback, but we'll fetch fresh data
    onSelectEpisode: (episodeId: string) => void;
    onCreateEpisode: () => void;
    onBack: () => void;
    isLoadingEpisode?: boolean;
    loadingEpisodeId?: string | null;
}

export const PodcastDashboard: React.FC<PodcastDashboardProps> = ({
    showId,
    showTitle: fallbackTitle,
    onSelectEpisode,
    onCreateEpisode,
    onBack,
    isLoadingEpisode = false,
    loadingEpisodeId = null
}) => {
    const [show, setShow] = useState<PodcastShow | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLoading, setShowLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('created_desc');
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadShowData();
        loadEpisodes();
    }, [showId, sortBy, showArchived]);

    const loadShowData = async () => {
        try {
            setShowLoading(true);
            const { data, error } = await supabase
                .from('podcast_shows')
                .select('*')
                .eq('id', showId)
                .single();

            if (error) throw error;
            setShow(data);
        } catch (error) {
            console.error('Error loading show:', error);
        } finally {
            setShowLoading(false);
        }
    };

    const loadEpisodes = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('podcast_episodes')
                .select('id, title, guest_name, status, scheduled_date, created_at, season, location')
                .eq('show_id', showId);

            // Filter archived episodes
            if (!showArchived) {
                query = query.neq('status', 'archived');
            }

            // Apply sorting
            switch (sortBy) {
                case 'created_desc':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'created_asc':
                    query = query.order('created_at', { ascending: true });
                    break;
                case 'scheduled_desc':
                    query = query.order('scheduled_date', { ascending: false, nullsFirst: false });
                    break;
                case 'scheduled_asc':
                    query = query.order('scheduled_date', { ascending: true, nullsFirst: false });
                    break;
                case 'season':
                    query = query.order('season', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
                    break;
                case 'location':
                    query = query.order('location', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
                    break;
            }

            const { data, error } = await query;

            if (error) throw error;
            setEpisodes(data || []);
        } catch (error) {
            console.error('Error loading episodes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTitle = async (newTitle: string) => {
        if (!show || show.title === newTitle) return;
        try {
            const { error } = await supabase
                .from('podcast_shows')
                .update({ title: newTitle })
                .eq('id', show.id);

            if (error) throw error;
            setShow({ ...show, title: newTitle });
        } catch (error) {
            console.error('Error updating title:', error);
        }
    };

    const handleArchiveEpisode = async (episodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const episode = episodes.find(ep => ep.id === episodeId);
        if (!episode) return;

        const isArchiving = episode.status !== 'archived';
        const action = isArchiving ? 'arquivar' : 'desarquivar';

        if (!window.confirm(`Tem certeza que deseja ${action} este episódio?`)) return;

        try {
            const { error } = await supabase
                .from('podcast_episodes')
                .update({
                    status: isArchiving ? 'archived' : 'draft',
                    updated_at: new Date().toISOString()
                })
                .eq('id', episodeId);

            if (error) throw error;
            await loadEpisodes();
        } catch (error) {
            console.error('Error archiving episode:', error);
        }
    };

    const handleDeleteEpisode = async (episodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir este episódio permanentemente?')) return;

        try {
            const { error } = await supabase
                .from('podcast_episodes')
                .delete()
                .eq('id', episodeId);

            if (error) throw error;
            setEpisodes(episodes.filter(ep => ep.id !== episodeId));
        } catch (error) {
            console.error('Error deleting episode:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-700';
            case 'in_production': return 'bg-amber-100 text-amber-700';
            case 'draft': return 'bg-gray-100 text-gray-600';
            case 'archived': return 'bg-gray-50 text-gray-400';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'published': return 'Publicado';
            case 'in_production': return 'Em Produção';
            case 'draft': return 'Rascunho';
            case 'archived': return 'Arquivado';
            default: return status;
        }
    };

    const draftCount = episodes.filter(e => e.status === 'draft').length;
    const publishedCount = episodes.filter(e => e.status === 'published').length;

    return (
        <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
            {/* Header with Cover & Title */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[#D6D3CD]/30">
                <div className="max-w-6xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={onBack}
                        className="mb-4 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Voltar
                    </button>

                    {/* Cover + Title + Settings */}
                    <div className="flex items-start gap-6">
                        {/* Podcast Cover */}
                        <div className="flex-shrink-0">
                            {showLoading ? (
                                <div className="w-32 h-32 bg-[#EBE9E4] rounded-2xl animate-pulse shadow-[4px_4px_12px_rgba(163,158,145,0.2)]" />
                            ) : (
                                <div className="w-32 h-32 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl shadow-[4px_4px_12px_rgba(163,158,145,0.2)] overflow-hidden ceramic-card">
                                    {show?.cover_url ? (
                                        <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Mic2 className="w-16 h-16 text-amber-600 opacity-30" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                            {showLoading ? (
                                <>
                                    <div className="h-10 bg-[#EBE9E4] rounded-lg w-2/3 mb-3 animate-pulse" />
                                    <div className="h-5 bg-[#EBE9E4] rounded w-1/2 animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        defaultValue={show?.title || fallbackTitle}
                                        onBlur={(e) => handleUpdateTitle(e.target.value)}
                                        className="text-2xl font-black text-ceramic-text-primary tracking-tight mb-2 bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0 placeholder-[#5C554B]/50"
                                        placeholder="Nome do Podcast"
                                    />
                                    {show?.description && (
                                        <p className="text-[#948D82] text-sm leading-relaxed">
                                            {show.description}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Settings Button (Inset) */}
                        <button className="flex-shrink-0 p-3 rounded-xl bg-[#EBE9E4] shadow-[inset_2px_2px_4px_rgba(163,158,145,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] hover:shadow-[inset_3px_3px_6px_rgba(163,158,145,0.25),inset_-3px_-3px_6px_rgba(255,255,255,1)] transition-all">
                            <Settings className="w-5 h-5 text-[#5C554B]" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Strip (The Groove) */}
            <div className="flex-shrink-0 px-6 py-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-[#EBE9E4] rounded-2xl shadow-[inset_4px_4px_8px_rgba(163,158,145,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] p-6">
                        <div className="grid grid-cols-3 divide-x divide-[#D6D3CD]">
                            {/* Total */}
                            <div className="flex flex-col items-center justify-center px-4">
                                <span className="text-3xl font-black text-[#5C554B] mb-1">
                                    {episodes.length}
                                </span>
                                <span className="text-[10px] font-bold text-[#948D82] uppercase tracking-[0.15em]">
                                    Total
                                </span>
                            </div>

                            {/* Rascunhos */}
                            <div className="flex flex-col items-center justify-center px-4">
                                <span className="text-3xl font-black text-amber-600 mb-1">
                                    {draftCount}
                                </span>
                                <span className="text-[10px] font-bold text-[#948D82] uppercase tracking-[0.15em]">
                                    Rascunhos
                                </span>
                            </div>

                            {/* Publicados */}
                            <div className="flex flex-col items-center justify-center px-4">
                                <span className="text-3xl font-black text-green-600 mb-1">
                                    {publishedCount}
                                </span>
                                <span className="text-[10px] font-bold text-[#948D82] uppercase tracking-[0.15em]">
                                    Publicados
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Episodes List */}
            <div className="flex-1 overflow-y-auto px-6 pb-32">
                <div className="max-w-6xl mx-auto">
                    {/* Section Header with Controls */}
                    <div className="sticky top-0 bg-ceramic-base py-3 z-10 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-bold text-[#5C554B]">Episódios</h2>
                            <button
                                onClick={onCreateEpisode}
                                className="flex items-center gap-2 px-4 py-2 bg-[#F0EFE9] hover:bg-white text-[#5C554B] font-bold text-sm rounded-xl transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,1)] hover:scale-105"
                            >
                                <Plus className="w-4 h-4" />
                                Novo Episódio
                            </button>
                        </div>

                        {/* Sort and Filter Controls */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2">
                                <ArrowUpDown className="w-4 h-4 text-[#948D82]" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="text-sm px-3 py-2 rounded-lg bg-[#F7F6F4] text-[#5C554B] font-medium border-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-[inset_2px_2px_4px_rgba(163,158,145,0.1)]"
                                >
                                    <option value="created_desc">Mais Recentes</option>
                                    <option value="created_asc">Mais Antigos</option>
                                    <option value="scheduled_desc">Data Entrevista ↓</option>
                                    <option value="scheduled_asc">Data Entrevista ↑</option>
                                    <option value="season">Por Temporada</option>
                                    <option value="location">Por Estúdio</option>
                                </select>
                            </div>

                            {/* Show Archived Toggle */}
                            <button
                                onClick={() => setShowArchived(!showArchived)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    showArchived
                                        ? 'bg-amber-100 text-amber-700 shadow-[inset_2px_2px_4px_rgba(217,119,6,0.2)]'
                                        : 'bg-[#F7F6F4] text-[#948D82] hover:bg-[#EBE9E4] shadow-[2px_2px_4px_rgba(163,158,145,0.1)]'
                                }`}
                            >
                                {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                {showArchived ? 'Ocultar Arquivados' : 'Mostrar Arquivados'}
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-[#F7F6F4] h-24 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : episodes.length === 0 ? (
                        /* Empty State with Ceramic Inset CTA */
                        <motion.div
                            className="ceramic-tray p-8 text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="ceramic-inset w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-amber-50">
                                <Calendar className="w-10 h-10 text-amber-600" />
                            </div>
                            <h3 className="text-xl font-bold text-[#5C554B] mb-2">
                                Nenhum episódio ainda
                            </h3>
                            <p className="text-[#948D82] mb-8 max-w-sm mx-auto">
                                Crie seu primeiro episódio para começar sua jornada produtiva
                            </p>
                            <button
                                onClick={onCreateEpisode}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Primeiro Episódio
                            </button>
                        </motion.div>
                    ) : (
                        /* Episode List */
                        <div className="space-y-3">
                            {episodes.map(episode => {
                                const isThisEpisodeLoading = loadingEpisodeId === episode.id;
                                return (
                                <div
                                    key={episode.id}
                                    onClick={() => !isLoadingEpisode && onSelectEpisode(episode.id)}
                                    role="button"
                                    tabIndex={isLoadingEpisode ? -1 : 0}
                                    onKeyDown={(e) => {
                                        if (!isLoadingEpisode && (e.key === 'Enter' || e.key === ' ')) {
                                            onSelectEpisode(episode.id);
                                        }
                                    }}
                                    className={`relative w-full bg-[#F7F6F4] transition-all duration-200 rounded-xl p-5 text-left group shadow-[2px_2px_6px_rgba(163,158,145,0.1)] outline-none
                                        ${isLoadingEpisode ? 'cursor-wait' : 'cursor-pointer hover:bg-white hover:shadow-[4px_4px_12px_rgba(163,158,145,0.15)]'}
                                        ${isThisEpisodeLoading ? 'ring-2 ring-amber-400 bg-amber-50/50' : 'focus:ring-2 focus:ring-amber-500/20'}
                                        ${isLoadingEpisode && !isThisEpisodeLoading ? 'opacity-60' : ''}`}
                                >
                                    {/* Loading Overlay */}
                                    {isThisEpisodeLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm text-amber-600 font-medium">Carregando...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Episode Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-[#5C554B] mb-2 group-hover:text-amber-600 transition-colors truncate">
                                                {episode.title || 'Sem título'}
                                            </h3>

                                            <div className="flex items-center gap-4 text-xs text-[#948D82] flex-wrap">
                                                {episode.guest_name && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5" />
                                                        <span>{episode.guest_name}</span>
                                                    </div>
                                                )}

                                                {episode.scheduled_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>
                                                            {new Date(episode.scheduled_date).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                )}

                                                {episode.season && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>T{episode.season}</span>
                                                    </div>
                                                )}

                                                {episode.location && (
                                                    <div className="flex items-center gap-1 text-amber-600">
                                                        <Mic2 className="w-3.5 h-3.5" />
                                                        <span>{episode.location}</span>
                                                    </div>
                                                )}

                                                <div className="text-[#B0ADA6]">
                                                    Criado {new Date(episode.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(episode.status)}`}>
                                            {getStatusLabel(episode.status)}
                                        </div>

                                        {/* Action Buttons (Hover) */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            {/* Archive/Unarchive Button */}
                                            <button
                                                onClick={(e) => handleArchiveEpisode(episode.id, e)}
                                                className={`p-2 rounded-lg transition-all ${
                                                    episode.status === 'archived'
                                                        ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                                }`}
                                                title={episode.status === 'archived' ? 'Desarquivar episódio' : 'Arquivar episódio'}
                                            >
                                                {episode.status === 'archived' ? (
                                                    <ArchiveRestore className="w-4 h-4" />
                                                ) : (
                                                    <Archive className="w-4 h-4" />
                                                )}
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => handleDeleteEpisode(episode.id, e)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Excluir episódio permanentemente"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PodcastDashboard;
