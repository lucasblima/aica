import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import PodcastLibrary from '../modules/podcast/views/PodcastLibrary';
import PodcastDashboard from '../modules/podcast/views/PodcastDashboard';
import PreparationMode from '../modules/podcast/views/PreparationMode';
import StudioMode from '../modules/podcast/views/StudioMode';
import PreProductionHub from '../modules/podcast/views/PreProductionHub';
import ProductionMode from '../modules/podcast/views/ProductionMode';
import PostProductionHub from '../modules/podcast/views/PostProductionHub';
import GuestIdentificationWizard from '../modules/podcast/components/GuestIdentificationWizard';
import TeleprompterWindow from '../modules/podcast/components/TeleprompterWindow';
import type { Dossier, Topic } from '../modules/podcast/types';
import { StudioLayout } from '../modules/podcast/components/StudioLayout';

interface PodcastCopilotViewProps {
    userEmail?: string;
    onLogout: () => void;
    onExit: () => void;
    onNavVisibilityChange?: (visible: boolean) => void;
}

// Extended view types for new workflow
type PodcastView =
    | 'library'
    | 'dashboard'
    | 'wizard'           // NEW: Guest identification wizard
    | 'preproduction'    // NEW: Pre-production hub
    | 'preparation'      // Legacy (kept for compatibility)
    | 'production'       // NEW: Production mode
    | 'studio'           // Legacy (kept for compatibility)
    | 'postproduction';  // NEW: Post-production hub

interface GuestData {
    name: string;
    fullName?: string;
    title?: string;
    theme?: string;
    season?: string;
    location?: string;
    scheduledDate?: string;
    scheduledTime?: string;
}

export const PodcastCopilotView: React.FC<PodcastCopilotViewProps> = ({ userEmail, onLogout, onExit, onNavVisibilityChange }) => {
    // Navigation State
    const [view, setView] = useState<PodcastView>('library');
    const [currentShowId, setCurrentShowId] = useState<string | null>(null);
    const [currentShowTitle, setCurrentShowTitle] = useState<string>('');
    const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    // Data State
    const [currentDossier, setCurrentDossier] = useState<Dossier | null>(null);
    const [currentGuestData, setCurrentGuestData] = useState<GuestData | null>(null);
    const [currentTopics, setCurrentTopics] = useState<Topic[]>([]);
    const [recordingDuration, setRecordingDuration] = useState(0);

    // Teleprompter State
    const [showTeleprompter, setShowTeleprompter] = useState(false);
    const [teleprompterIndex, setTeleprompterIndex] = useState(0);

    // Update nav visibility when view changes
    React.useEffect(() => {
        if (onNavVisibilityChange) {
            const showNav = view === 'library' || view === 'dashboard';
            onNavVisibilityChange(showNav);
        }
    }, [view, onNavVisibilityChange]);

    // ================== NAVIGATION HANDLERS ==================

    // Library -> Dashboard
    const handleSelectShow = async (showId: string) => {
        setCurrentShowId(showId);
        const { data } = await supabase
            .from('podcast_shows')
            .select('title')
            .eq('id', showId)
            .single();
        setCurrentShowTitle(data?.title || 'Podcast');
        setView('dashboard');
    };

    // Dashboard -> Wizard (NEW FLOW) or Legacy Prep/Studio
    const handleSelectEpisode = async (episodeId: string) => {
        setCurrentEpisodeId(episodeId);
        setCurrentProjectId(episodeId);

        try {
            const { data: project } = await supabase
                .from('projects')
                .select('*')
                .eq('id', episodeId)
                .single();

            if (project && project.biography) {
                // Has dossier - go to production
                const dossier: Dossier = {
                    guestName: project.guest_name || 'Convidado',
                    episodeTheme: project.episode_theme || 'Tema',
                    biography: project.biography,
                    controversies: project.controversies || [],
                    suggestedTopics: [],
                    iceBreakers: project.ice_breakers || [],
                    technicalSheet: project.technical_sheet
                };
                setCurrentDossier(dossier);
                setCurrentGuestData({
                    name: project.guest_name,
                    theme: project.episode_theme
                });
                setView('preproduction');
            } else {
                // No dossier - start wizard
                setView('wizard');
            }
        } catch (error) {
            console.error('Error loading episode:', error);
            setView('wizard');
        }
    };

    // Dashboard -> Create New Episode -> Wizard
    const handleCreateEpisode = async () => {
        if (!currentShowId) return;

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

        setCurrentEpisodeId(data.id);
        setCurrentProjectId(data.id);
        setView('wizard');
    };

    // Wizard -> Pre-Production
    const handleWizardComplete = async (wizardData: any) => {
        const guestData: GuestData = {
            name: wizardData.guestName,
            fullName: wizardData.confirmedProfile?.fullName,
            title: wizardData.confirmedProfile?.title || wizardData.guestReference,
            theme: wizardData.themeMode === 'auto' ? undefined : wizardData.theme,
            season: wizardData.season,
            location: wizardData.location,
            scheduledDate: wizardData.scheduledDate,
            scheduledTime: wizardData.scheduledTime
        };

        setCurrentGuestData(guestData);
        setView('preproduction');
    };

    // Pre-Production -> Production
    const handleGoToProduction = (dossier: Dossier, projectId: string) => {
        setCurrentDossier(dossier);
        setCurrentProjectId(projectId);
        setView('production');
    };

    // Production -> Post-Production
    const handleFinishProduction = () => {
        setView('postproduction');
    };

    // Legacy handlers (for compatibility)
    const handleDossierReady = (dossier: Dossier, projectId: string) => {
        setCurrentDossier(dossier);
        setCurrentProjectId(projectId);
        setView('studio');
    };

    const handleGoToStudio = (projectId: string) => {
        setCurrentProjectId(projectId);
        setView('studio');
    };

    // ================== BACK NAVIGATION ==================

    const handleBackToLibrary = () => {
        setView('library');
        setCurrentShowId(null);
        setCurrentShowTitle('');
        setCurrentEpisodeId(null);
        setCurrentDossier(null);
        setCurrentProjectId(null);
        setCurrentGuestData(null);
    };

    const handleBackToDashboard = () => {
        setView('dashboard');
        setCurrentEpisodeId(null);
        setCurrentDossier(null);
        setCurrentProjectId(null);
        setCurrentGuestData(null);
    };

    const handleBackToPreProduction = () => {
        setView('preproduction');
    };

    const handleBackToPreparation = () => {
        setView('preparation');
        setCurrentDossier(null);
    };

    // ================== VIEW RENDERS ==================

    // 1. Library
    if (view === 'library') {
        return (
            <PodcastLibrary
                onSelectShow={handleSelectShow}
                onCreateNew={() => alert('Criar novo podcast')}
                userEmail={userEmail}
                onLogout={onLogout}
            />
        );
    }

    // 2. Dashboard
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

    // 3. NEW: Guest Identification Wizard
    if (view === 'wizard') {
        return (
            <GuestIdentificationWizard
                onComplete={handleWizardComplete}
                onCancel={handleBackToDashboard}
            />
        );
    }

    // 4. NEW: Pre-Production Hub
    if (view === 'preproduction' && currentGuestData && currentProjectId) {
        return (
            <PreProductionHub
                guestData={currentGuestData}
                projectId={currentProjectId}
                onGoToProduction={handleGoToProduction}
                onBack={handleBackToDashboard}
            />
        );
    }

    // 5. NEW: Production Mode
    if (view === 'production' && currentDossier && currentProjectId) {
        return (
            <>
                <ProductionMode
                    dossier={currentDossier}
                    projectId={currentProjectId}
                    topics={currentTopics}
                    onBack={handleBackToPreProduction}
                    onOpenTeleprompter={() => setShowTeleprompter(true)}
                    onFinish={handleFinishProduction}
                />

                {/* Teleprompter Window */}
                {showTeleprompter && (
                    <TeleprompterWindow
                        topics={currentTopics}
                        currentIndex={teleprompterIndex}
                        onIndexChange={setTeleprompterIndex}
                        onClose={() => setShowTeleprompter(false)}
                    />
                )}
            </>
        );
    }

    // 6. NEW: Post-Production Hub
    if (view === 'postproduction' && currentDossier && currentProjectId) {
        return (
            <PostProductionHub
                dossier={currentDossier}
                projectId={currentProjectId}
                recordingDuration={recordingDuration}
                onBack={handleBackToDashboard}
            />
        );
    }

    // 7. Legacy: Preparation Mode
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

    // 8. Legacy: Studio Mode
    if (view === 'studio' && currentDossier && currentProjectId) {
        return (
            <StudioLayout
                title={currentDossier.guestName || currentShowTitle || "Episódio"}
                status="recording"
                onExit={handleBackToPreparation}
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
