import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, Mic2 } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import { PodcastShow } from '../types';
import { CreatePodcastDialog } from '../components/CreatePodcastDialog';
import { HeaderGlobal } from '../../../components/HeaderGlobal';

interface PodcastLibraryProps {
    onSelectShow: (showId: string) => void;
    onCreateNew: () => void;
    userEmail?: string;
    onLogout?: () => void;
}

export const PodcastLibrary: React.FC<PodcastLibraryProps> = ({ onSelectShow, onCreateNew, userEmail, onLogout }) => {
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

            const { data, error } = await supabase
                .from('podcast_shows')
                .insert({
                    name: title,        // Primary name field (required)
                    title: title,       // Secondary title field (for compatibility)
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
        } catch (error) {
            console.error('Error creating show:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            alert(`Erro ao criar podcast: ${errorMessage}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {/* New Show Card - Inset Style */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="group ceramic-inset p-4 flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition-all duration-300 min-h-[12rem] rounded-2xl"
                        >
                            <div className="h-12 w-12 rounded-full border-2 border-dashed border-ceramic-text-secondary/50 flex items-center justify-center group-hover:border-ceramic-text-primary transition-colors">
                                <Plus className="h-6 w-6 text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors" />
                            </div>
                            <span className="text-xs font-bold text-ceramic-text-secondary group-hover:text-ceramic-text-primary transition-colors text-center">Criar Novo</span>
                        </button>

                        {/* Existing Shows */}
                        {shows.map(show => (
                            <button
                                key={show.id}
                                onClick={() => onSelectShow(show.id)}
                                className="group ceramic-card p-4 text-left hover:scale-[1.02] transition-all duration-300 flex flex-col rounded-2xl"
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

                                {/* Hover Arrow */}
                                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-4 h-4 text-amber-600" />
                                </div>
                            </button>
                        ))}


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

export default PodcastLibrary;
