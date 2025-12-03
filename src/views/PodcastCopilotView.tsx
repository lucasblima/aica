import React, { useState } from 'react';
import PreparationMode from '../modules/podcast/views/PreparationMode';
import StudioMode from '../modules/podcast/views/StudioMode';
import PodcastLibrary from '../modules/podcast/views/PodcastLibrary';
import PodcastDashboard from '../modules/podcast/views/PodcastDashboard';
import type { Dossier } from '../modules/podcast/types';
import { StudioLayout } from '../modules/podcast/components/StudioLayout';

interface PodcastCopilotViewProps {
    userEmail?: string;
    onLogout: () => void;
    onExit: () => void;
    onNavVisibilityChange?: (visible: boolean) => void;
}

type PodcastView = 'library' | 'dashboard' | 'preparation' | 'studio';

export const PodcastCopilotView: React.FC<PodcastCopilotViewProps> = ({ userEmail, onLogout, onExit, onNavVisibilityChange }) => {
    const [view, setView] = useState<PodcastView>('library');
    const [currentShowId, setCurrentShowId] = useState<string | null>(null);
    const [currentShowTitle, setCurrentShowTitle] = useState<string>('');
    const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
    const [currentDossier, setCurrentDossier] = useState<Dossier | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    // Update nav visibility when view changes
    React.useEffect(() => {
        if (onNavVisibilityChange) {
            onNavVisibilityChange(view === 'library' || view === 'dashboard');
        }
    }, [view, onNavVisibilityChange]);

    // Navigation: Library -> Dashboard
    const handleSelectShow = async (showId: string) => {
        setCurrentShowId(showId);

        // Fetch show title
        const { supabase } = await import('../services/supabaseClient');
        const { data } = await supabase
            .from('podcast_shows')
            .select('name')
            .eq('id', showId)
            .single();

        setCurrentShowTitle(data?.name || 'Podcast');
        setView('dashboard');
    };

    // Navigation: Dashboard -> Preparation (new or existing episode)
    const handleSelectEpisode = (episodeId: string) => {
        setCurrentEpisodeId(episodeId);
        setCurrentProjectId(episodeId); // episode_id is the same as project_id
        setView('preparation');
    };

    const handleCreateEpisode = async () => {
        if (!currentShowId) return;

        // Create a new draft episode
        const { supabase } = await import('../services/supabaseClient');
        const { data, error } = await supabase
            .from('podcast_episodes')
            .insert({
                show_id: currentShowId,
                title: 'Novo Episódio',
                status: 'draft'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating episode:', error);
            alert('Erro ao criar episódio');
            return;
        }

        handleSelectEpisode(data.id);
    };

    // Navigation: Preparation -> Studio
    const handleDossierReady = (dossier: Dossier, projectId: string) => {
        setCurrentDossier(dossier);
        setCurrentProjectId(projectId);
        setView('studio');
    };

    const handleGoToStudio = (projectId: string) => {
        setCurrentProjectId(projectId);
        setView('studio');
    };

    // Back navigation
    const handleBackToPreparation = () => {
        setView('preparation');
        setCurrentDossier(null);
    };

    const handleBackToDashboard = () => {
        setView('dashboard');
        setCurrentEpisodeId(null);
        setCurrentDossier(null);
        setCurrentProjectId(null);
    };

    const handleBackToLibrary = () => {
        setView('library');
        setCurrentShowId(null);
        setCurrentShowTitle('');
        setCurrentEpisodeId(null);
        setCurrentDossier(null);
        setCurrentProjectId(null);
    };

    const handleCreateNewShow = () => {
        // TODO: Implement modal for creating new show
        alert('Criar novo podcast - implementar modal');
    };

    // ================== VIEWS ==================

    // 1. Library View - /podcast
    if (view === 'library') {
        return (
            <PodcastLibrary
                onSelectShow={handleSelectShow}
                onCreateNew={handleCreateNewShow}
                userEmail={userEmail}
                onLogout={onLogout}
            />
        );
    }

    // 2. Dashboard View - /podcast/:showId
    if (view === 'dashboard' && currentShowId) {
        return (
            <PodcastDashboard
                showId={currentShowId}
                showTitle={currentShowTitle}
                onSelectEpisode={handleSelectEpisode}
                onCreateEpisode={handleCreateEpisode}
                onBack={handleBackToLibrary}
            />
        );
    }

    // 3. Preparation View - /podcast/:showId/episode/:episodeId/prep
    if (view === 'preparation' && currentProjectId) {
        return (
            <StudioLayout
                title={currentShowTitle || 'Novo Episódio'}
                status="draft"
                onExit={handleBackToDashboard}
                variant="scrollable"
            >
                <PreparationMode
                    onDossierReady={handleDossierReady}
                    onGoToStudio={handleGoToStudio}
                    currentProjectId={currentProjectId}
                />
            </StudioLayout>
        );
    }

    // 4. Studio View - /podcast/:showId/episode/:episodeId/studio
    if (view === 'studio' && currentDossier && currentProjectId) {
        return (
            <StudioLayout
                title={currentDossier.guestName || currentShowTitle || "Episódio"}
                status="recording"
                onExit={handleBackToDashboard}
                variant="fixed"
            >
                <StudioMode
                    dossier={currentDossier}
                    projectId={currentProjectId}
                    onBack={handleBackToPreparation}
                    className="h-full min-h-0 rounded-t-2xl shadow-2xl"
                />
            </StudioLayout>
        );
    }

    // Fallback
    return (
        <div className="flex items-center justify-center h-screen bg-[#F0EFE9]">
            <p className="text-[#5C554B]">Carregando...</p>
        </div>
    );
};

export default PodcastCopilotView;
