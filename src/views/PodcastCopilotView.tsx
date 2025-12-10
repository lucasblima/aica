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
import { ErrorBoundary, ModuleErrorFallback } from '../components/ErrorBoundary';

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
    const [userId, setUserId] = useState<string | null>(null);

    // Teleprompter State
    const [showTeleprompter, setShowTeleprompter] = useState(false);
    const [teleprompterIndex, setTeleprompterIndex] = useState(0);

    // Get current user ID on mount
    React.useEffect(() => {
        const getCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
        };
        getCurrentUser();
    }, []);

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

    // Dashboard -> Select Existing Episode (NEW FLOW)
    const handleSelectEpisode = async (episodeId: string) => {
        setCurrentEpisodeId(episodeId);
        setCurrentProjectId(episodeId);

        try {
            const { data: episode } = await supabase
                .from('podcast_episodes')
                .select('*')
                .eq('id', episodeId)
                .single();

            if (!episode) {
                console.error('Episode not found');
                return;
            }

            // Always go to PreProduction for existing episodes
            // PreProduction will handle loading existing data or generating new research
            if (episode.biography) {
                // Has dossier - pass it to PreProduction
                const dossier: Dossier = {
                    guestName: episode.guest_name || 'Convidado',
                    episodeTheme: episode.episode_theme || 'Tema',
                    biography: episode.biography,
                    controversies: episode.controversies || [],
                    suggestedTopics: [],
                    iceBreakers: episode.ice_breakers || [],
                    technicalSheet: episode.technical_sheet
                };
                setCurrentDossier(dossier);
            } else {
                // No dossier yet - PreProduction will generate it
                setCurrentDossier(null);
            }

            // Set guest data for PreProduction
            setCurrentGuestData({
                name: episode.guest_name || 'Convidado',
                theme: episode.episode_theme || 'Tema',
                fullName: episode.guest_name || 'Convidado'
            });

            setView('preproduction');
        } catch (error) {
            console.error('Error loading episode:', error);
            alert('Erro ao carregar episódio. Tente novamente.');
        }
    };

    // Dashboard -> Create New Episode -> Wizard (NEW FLOW)
    const handleCreateEpisode = async () => {
        if (!currentShowId) return;
        // Don't create episode here - Wizard will do it
        setView('wizard'); // FIX: Route to wizard instead of legacy preparation
    };

    // Wizard -> Pre-Production
    const handleWizardComplete = async (wizardData: any, episodeId: string) => {
        // Store episode ID
        setCurrentEpisodeId(episodeId);
        setCurrentProjectId(episodeId);

        // Store guest data from wizard
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
    const handleGoToProduction = (dossier: Dossier, projectId: string, topics: Topic[]) => {
        setCurrentDossier(dossier);
        setCurrentProjectId(projectId);
        setCurrentTopics(topics); // FIX: Populate topics from PreProduction
        setView('production');
    };

    // Production -> Post-Production
    const handleFinishProduction = (duration: number) => {
        setRecordingDuration(duration); // FIX: Store recording duration
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
    if (view === 'wizard' && currentShowId && userId) {
        return (
            <GuestIdentificationWizard
                showId={currentShowId}
                userId={userId}
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

    // ================== DEPRECATED LEGACY VIEWS ==================
    // These views are deprecated in favor of the new flow:
    // Wizard → PreProduction → Production → PostProduction
    //
    // Legacy flow (DEPRECATED):
    // - 'preparation' → PreparationMode (replaced by Wizard + PreProductionHub)
    // - 'studio' → StudioMode (replaced by ProductionMode)
    //
    // If these views are accessed, they will fall through to the fallback view below.
    // Consider removing these commented blocks after verifying the new flow works.

    /*
    // 7. DEPRECATED - Legacy: Preparation Mode
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

    // 8. DEPRECATED - Legacy: Studio Mode
    if (view === 'studio' && currentDossier && currentProjectId) {
        return (
            <StudioLayout
                title={currentDossier.guestName || currentShowTitle || "Episódio"}
                status="recording"
                onExit={handleBackToPreparation}
                variant="fixed"
            >
                <ErrorBoundary
                    fallback={
                        <ModuleErrorFallback
                            moduleName="Studio Mode"
                            onReset={handleBackToPreparation}
                        />
                    }
                >
                    <StudioMode
                        dossier={currentDossier}
                        projectId={currentProjectId}
                        onBack={handleBackToPreparation}
                        className="h-full min-h-0 rounded-t-2xl shadow-2xl"
                    />
                </ErrorBoundary>
            </StudioLayout>
        );
    }
    */

    // Fallback
    return (
        <div className="flex items-center justify-center h-screen bg-[#F0EFE9]">
            <p className="text-[#5C554B]">Carregando...</p>
        </div>
    );
};

export default PodcastCopilotView;
