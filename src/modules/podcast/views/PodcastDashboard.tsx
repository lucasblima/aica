import React, { useState, useEffect } from 'react';
import { Plus, Calendar, User, Clock, Settings, ArrowLeft, Mic2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Episode {
    id: string;
    title: string;
    guest_name?: string;
    status: 'draft' | 'in_production' | 'published' | 'archived';
    scheduled_date?: string;
    created_at: string;
}

interface PodcastShow {
    id: string;
    name: string;
    description?: string;
    cover_url?: string;
}

interface PodcastDashboardProps {
    showId: string;
    showTitle: string; // Fallback, but we'll fetch fresh data
    onSelectEpisode: (episodeId: string) => void;
    onCreateEpisode: () => void;
    onBack: () => void;
}

export const PodcastDashboard: React.FC<PodcastDashboardProps> = ({
    showId,
    showTitle: fallbackTitle,
    onSelectEpisode,
    onCreateEpisode,
    onBack
}) => {
    const [show, setShow] = useState<PodcastShow | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLoading, setShowLoading] = useState(true);

    useEffect(() => {
        loadShowData();
        loadEpisodes();
    }, [showId]);

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
            const { data, error } = await supabase
                .from('podcast_episodes')
                .select('id, title, guest_name, status, scheduled_date, created_at')
                .eq('show_id', showId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEpisodes(data || []);
        } catch (error) {
            console.error('Error loading episodes:', error);
        } finally {
            setLoading(false);
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
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para biblioteca
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
                                        <img src={show.cover_url} alt={show.name} className="w-full h-full object-cover" />
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
                                    <h1 className="text-4xl font-black text-[#5C554B] tracking-tight mb-2">
                                        {show?.name || fallbackTitle}
                                    </h1>
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
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-ceramic-base py-3 z-10">
                        <h2 className="text-xl font-bold text-[#5C554B]">Episódios</h2>
                        <button
                            onClick={onCreateEpisode}
                            className="flex items-center gap-2 px-4 py-2 bg-[#F0EFE9] hover:bg-white text-[#5C554B] font-bold text-sm rounded-xl transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,1)] hover:scale-105"
                        >
                            <Plus className="w-4 h-4" />
                            Novo Episódio
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-[#F7F6F4] h-24 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : episodes.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-16">
                            <div className="bg-[#EBE9E4] inline-flex p-6 rounded-3xl mb-4 shadow-[inset_2px_2px_4px_rgba(163,158,145,0.15)]">
                                <Calendar className="w-16 h-16 text-[#948D82]" />
                            </div>
                            <h3 className="text-xl font-bold text-[#5C554B] mb-2">
                                Nenhum episódio ainda
                            </h3>
                            <p className="text-[#948D82] mb-6">
                                Crie seu primeiro episódio para começar
                            </p>
                            <button
                                onClick={onCreateEpisode}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#F0EFE9] hover:bg-white text-[#5C554B] font-bold rounded-xl transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:scale-105"
                            >
                                <Plus className="w-5 h-5" />
                                Criar Primeiro Episódio
                            </button>
                        </div>
                    ) : (
                        /* Episode List */
                        <div className="space-y-3">
                            {episodes.map(episode => (
                                <button
                                    key={episode.id}
                                    onClick={() => onSelectEpisode(episode.id)}
                                    className="w-full bg-[#F7F6F4] hover:bg-white transition-all duration-200 rounded-xl p-5 text-left group shadow-[2px_2px_6px_rgba(163,158,145,0.1)] hover:shadow-[4px_4px_12px_rgba(163,158,145,0.15)]"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Episode Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-[#5C554B] mb-2 group-hover:text-amber-600 transition-colors truncate">
                                                {episode.title || 'Sem título'}
                                            </h3>

                                            <div className="flex items-center gap-4 text-xs text-[#948D82]">
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

                                                <div className="text-[#B0ADA6]">
                                                    Criado {new Date(episode.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(episode.status)}`}>
                                            {getStatusLabel(episode.status)}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PodcastDashboard;
