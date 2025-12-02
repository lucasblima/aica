import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, Mic2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { PodcastShow } from '../types';
import { CreatePodcastDialog } from '../components/CreatePodcastDialog';

interface PodcastLibraryProps {
    onSelectShow: (showId: string) => void;
    onCreateNew: () => void;
}

export const PodcastLibrary: React.FC<PodcastLibraryProps> = ({ onSelectShow, onCreateNew }) => {
    const [shows, setShows] = useState<PodcastShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);

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

    const handleCreateShow = async (title: string, description: string) => {
        setCreating(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('podcast_shows')
                .insert({
                    title,
                    description,
                    user_id: user.id
                });

            if (error) throw error;

            setShowModal(false);
            loadShows();
        } catch (error) {
            console.error('Error creating show:', error);
            alert('Erro ao criar podcast. Tente novamente.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-ceramic-base p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-ceramic-text-primary rounded-2xl flex items-center justify-center ceramic-card">
                            <Mic2 className="h-8 w-8 text-ceramic-base" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-ceramic-text-primary mb-2">
                        Meus Podcasts
                    </h1>
                    <p className="text-ceramic-text-secondary text-lg">
                        Escolha um show para gerenciar episódios
                    </p>
                </div>

                {/* Shows Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="ceramic-card h-64 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* New Show Card */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="group ceramic-card p-6 flex flex-col items-center justify-center gap-4 hover:scale-[1.02] transition-all duration-300 border-2 border-dashed border-ceramic-text-tertiary/30 hover:border-ceramic-text-primary/30"
                        >
                            <div className="h-16 w-16 rounded-full bg-ceramic-text-primary/5 flex items-center justify-center group-hover:bg-ceramic-text-primary/10 transition-colors">
                                <Plus className="h-8 w-8 text-ceramic-text-primary" />
                            </div>
                            <span className="font-bold text-ceramic-text-primary">Criar Novo Podcast</span>
                        </button>

                        {/* Existing Shows */}
                        {shows.map(show => (
                            <button
                                key={show.id}
                                onClick={() => onSelectShow(show.id)}
                                className="group ceramic-card p-6 text-left hover:scale-[1.02] transition-all duration-300 flex flex-col"
                            >
                                {/* Cover Image */}
                                <div className="ceramic-inset rounded-xl mb-4 aspect-square overflow-hidden bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                    {show.cover_url ? (
                                        <img
                                            src={show.cover_url}
                                            alt={show.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Mic2 className="w-16 h-16 text-amber-600 opacity-30" />
                                    )}
                                </div>

                                {/* Show Info */}
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-ceramic-text-primary mb-2 group-hover:text-amber-600 transition-colors">
                                        {show.title}
                                    </h3>
                                    {show.description && (
                                        <p className="text-sm text-ceramic-text-secondary line-clamp-2 mb-3">
                                            {show.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 text-xs text-ceramic-text-tertiary">
                                        <span>{show.episodes_count || 0} episódios</span>
                                        {show.last_episode_date && (
                                            <>
                                                <span>•</span>
                                                <span>Último: {new Date(show.last_episode_date).toLocaleDateString('pt-BR')}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Hover Arrow */}
                                <div className="flex justify-end mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-5 h-5 text-amber-600" />
                                </div>
                            </button>
                        ))}

                        {/* Create New Card */}
                        <button
                            onClick={onCreateNew}
                            className="ceramic-card p-6 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[16rem] group"
                        >
                            <div className="ceramic-concave w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus className="w-8 h-8 text-ceramic-text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-ceramic-text-primary mb-2">
                                Criar Novo Podcast
                            </h3>
                            <p className="text-sm text-ceramic-text-secondary">
                                Adicione um novo show à sua biblioteca
                            </p>
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && shows.length === 0 && (
                    <div className="text-center py-20">
                        <div className="ceramic-inset inline-flex p-8 rounded-3xl mb-6">
                            <Mic2 className="w-20 h-20 text-ceramic-text-tertiary" />
                        </div>
                        <h2 className="text-2xl font-bold text-ceramic-text-primary mb-3">
                            Nenhum podcast ainda
                        </h2>
                        <p className="text-ceramic-text-secondary mb-8">
                            Crie seu primeiro show para começar a produzir episódios
                        </p>
                        <button
                            onClick={onCreateNew}
                            className="ceramic-btn px-6 py-3 text-ceramic-text-primary font-bold rounded-xl hover:scale-105 transition-transform"
                        >
                            <Plus className="w-5 h-5 inline mr-2" />
                            Criar Primeiro Podcast
                        </button>
                    </div>
                )}
            </div>
            {/* Create Modal */}
            <CreatePodcastDialog
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleCreateShow}
            />
        </div>
    );
};

export default PodcastLibrary;
