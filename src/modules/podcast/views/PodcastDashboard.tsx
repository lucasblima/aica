import React, { useState, useEffect } from 'react';
import { Plus, Calendar, User, Clock, Settings } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Episode {
    id: string;
    title: string;
    guest_name?: string;
    status: 'draft' | 'in_production' | 'published' | 'archived';
    scheduled_date?: string;
    created_at: string;
}

interface PodcastDashboardProps {
    showId: string;
    showTitle: string;
    onSelectEpisode: (episodeId: string) => void;
    onCreateEpisode: () => void;
    onBack: () => void;
}

export const PodcastDashboard: React.FC<PodcastDashboardProps> = ({
    showId,
    showTitle,
    onSelectEpisode,
    onCreateEpisode,
    onBack
}) => {
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEpisodes();
    }, [showId]);

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
            case 'published': return 'bg-green-100 text-green-700 border-green-200';
            case 'in_production': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'archived': return 'bg-gray-50 text-gray-500 border-gray-100';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

    return (
        <div className="min-h-screen bg-ceramic-base p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onBack}
                            className="text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors flex items-center gap-1"
                        >
                            <span>←</span> Voltar para biblioteca
                        </button>
                        <button className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-full hover:bg-black/5">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-ceramic-text-primary mb-2">
                                {showTitle}
                            </h1>
                            <p className="text-ceramic-text-secondary">
                                {episodes.length} episódios
                            </p>
                        </div>
                        <button
                            onClick={onCreateEpisode}
                            className="flex items-center gap-2 px-6 py-3 bg-[#F0EFE9] hover:bg-[#EBE9E4] text-ceramic-text-primary font-bold rounded-xl transition-all shadow-[4px_4px_8px_rgba(163,158,145,0.2),-4px_-4px_8px_rgba(255,255,255,0.9)] hover:shadow-[6px_6px_12px_rgba(163,158,145,0.3),-6px_-6px_12px_rgba(255,255,255,1.0)] hover:scale-105"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Episódio
                        </button>
                    </div>
                </div>
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    <div className="ceramic-inset p-6 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-ceramic-text-primary mb-1">
                            {episodes.length}
                        </span>
                        <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                            Total de Episódios
                        </span>
                    </div>
                    <div className="ceramic-inset p-6 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-amber-600 mb-1">
                            {episodes.filter(e => e.status === 'draft').length}
                        </span>
                        <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                            Em Rascunho
                        </span>
                    </div>
                    <div className="ceramic-inset p-6 rounded-2xl flex flex-col items-center justify-center">
                        <span className="text-4xl font-black text-green-600 mb-1">
                            {episodes.filter(e => e.status === 'published').length}
                        </span>
                        <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
                            Publicados
                        </span>
                    </div>
                </div>

                {/* Episodes List Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-ceramic-text-primary">Episódios Recentes</h2>
                </div>
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="ceramic-card h-32 animate-pulse" />
                        ))}
                    </div>
                ) : episodes.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="ceramic-inset inline-flex p-8 rounded-3xl mb-6">
                            <Calendar className="w-20 h-20 text-ceramic-text-tertiary" />
                        </div>
                        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-3">
                            Nenhum episódio ainda
                        </h2>
                        <p className="text-ceramic-text-secondary mb-8">
                            Crie seu primeiro episódio para começar a produzir
                        </p>
                        <button
                            onClick={onCreateEpisode}
                            className="ceramic-btn px-6 py-3 text-ceramic-text-primary font-bold rounded-xl hover:scale-105 transition-transform"
                        >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Criar Primeiro Episódio
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {episodes.map(episode => (
                            <button
                                key={episode.id}
                                onClick={() => onSelectEpisode(episode.id)}
                                className="w-full ceramic-card p-6 text-left hover:scale-[1.01] transition-all duration-300 group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Episode Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-ceramic-text-primary mb-2 group-hover:text-amber-600 transition-colors truncate">
                                            {episode.title || 'Sem título'}
                                        </h3>

                                        <div className="flex items-center gap-4 text-sm text-ceramic-text-secondary">
                                            {episode.guest_name && (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    <span>{episode.guest_name}</span>
                                                </div>
                                            )}

                                            {episode.scheduled_date && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>
                                                        {new Date(episode.scheduled_date).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="text-xs text-ceramic-text-tertiary">
                                                Criado em {new Date(episode.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(episode.status)}`}>
                                        {getStatusLabel(episode.status)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PodcastDashboard;
