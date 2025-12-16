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

    // Loading State for episode selection
    const [isLoadingEpisode, setIsLoadingEpisode] = useState(false);
    const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null);

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

    // Debug: Log view state changes
    React.useEffect(() => {
        console.log('[PodcastCopilot] View changed to:', view, { currentShowId, userId, currentGuestData: !!currentGuestData, currentProjectId });
    }, [view, currentShowId, userId, currentGuestData, currentProjectId]);

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
        console.log('[PodcastCopilot] handleSelectEpisode called', { episodeId, view });

        // Set loading state BEFORE async operation
        setIsLoadingEpisode(true);
        setLoadingEpisodeId(episodeId);

        try {
            console.log('[PodcastCopilot] Fetching episode from Supabase...');
            const { data: episode, error } = await supabase
                .from('podcast_episodes')
                .select('*')
                .eq('id', episodeId)
                .single();

            if (error) {
                console.error('[PodcastCopilot] Supabase error:', error);
                alert('Erro ao carregar episódio: ' + error.message);
                return; // Stay on dashboard
            }

            if (!episode) {
                console.error('[PodcastCopilot] Episode not found');
                alert('Episódio não encontrado.');
                return; // Stay on dashboard
            }

            console.log('[PodcastCopilot] Episode loaded:', episode.id, episode.guest_name);

            // Prepare ALL data BEFORE updating any state
            let dossier: Dossier | null = null;
            if (episode.biography) {
                dossier = {
                    guestName: episode.guest_name || 'Convidado',
                    episodeTheme: episode.episode_theme || 'Tema',
                    biography: episode.biography,
                    controversies: episode.controversies || [],
                    suggestedTopics: [],
                    iceBreakers: episode.ice_breakers || [],
                    technicalSheet: episode.technical_sheet
                };
            }

            const guestData: GuestData = {
                name: episode.guest_name || 'Convidado',
                theme: episode.episode_theme || 'Tema',
                fullName: episode.guest_name || 'Convidado'
            };

            // Update ALL state at once, THEN change view
            // This ensures PreProduction guard will have all required data
            setCurrentEpisodeId(episodeId);
            setCurrentProjectId(episodeId);
            setCurrentDossier(dossier);
            setCurrentGuestData(guestData);

            console.log('[PodcastCopilot] Setting view to preproduction');
            setView('preproduction');
        } catch (error) {
            console.error('[PodcastCopilot] Error loading episode:', error);
            alert('Erro ao carregar episódio. Tente novamente.');
            // Don't change view - stay on dashboard
        } finally {
            // Clear loading state regardless of success/failure
            setIsLoadingEpisode(false);
            setLoadingEpisodeId(null);
        }
    };

    // Dashboard -> Create New Episode -> Wizard (NEW FLOW)
    const handleCreateEpisode = async () => {
        console.log('[PodcastCopilot] handleCreateEpisode called', { currentShowId, userId, view });
        if (!currentShowId) {
            console.error('[PodcastCopilot] No currentShowId, returning early');
            return;
        }
        // Don't create episode here - Wizard will do it
        console.log('[PodcastCopilot] Setting view to wizard');
        setView('wizard'); // FIX: Route to wizard instead of legacy preparation
        console.log('[PodcastCopilot] setView(wizard) foi chamado');
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
    console.log('[PodcastCopilot] Rendering, view:', view, { currentShowId, userId, currentGuestData: !!currentGuestData, currentProjectId });

    // 1. Library
    if (view === 'library') {
        console.log('[PodcastCopilot] Rendering Library view');
        return (
            <PodcastLibrary
                onSelectShow={handleSelectShow}
                onCreateNew={() => {}} // Handled internally by PodcastLibrary modal
                userEmail={userEmail}
                onLogout={onLogout}
            />
        );
    }

    // 2. Dashboard
    // IMPORTANT: Check view first, then handle missing showId with loading state
    // This prevents redirect loops when currentShowId is temporarily null
    if (view === 'dashboard') {
        console.log('[PodcastCopilot] Rendering Dashboard view', { currentShowId });

        // Show loading while showId is being resolved
        if (!currentShowId) {
            console.log('[PodcastCopilot] Dashboard loading - waiting for showId');
            return (
                <div className="flex items-center justify-center h-screen bg-ceramic-base">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-ceramic-text-secondary text-sm">Carregando...</p>
                    </div>
                </div>
            );
        }

        return (
            <PodcastDashboard
                showId={currentShowId}
                showTitle={currentShowTitle}
                onSelectEpisode={handleSelectEpisode}
                onCreateEpisode={handleCreateEpisode}
                onBack={handleBackToLibrary}
                isLoadingEpisode={isLoadingEpisode}
                loadingEpisodeId={loadingEpisodeId}
            />
        );
    }

    // 3. NEW: Guest Identification Wizard
    // IMPORTANT: Check view first, then handle missing dependencies with loading states
    // This prevents redirect loops when userId or currentShowId are temporarily null
    if (view === 'wizard') {
        console.log('[PodcastCopilot] Rendering Wizard view', { userId, currentShowId });

        // Show loading while dependencies are being resolved
        if (!userId || !currentShowId) {
            console.log('[PodcastCopilot] Wizard loading - waiting for dependencies', { userId: !!userId, currentShowId: !!currentShowId });
            return (
                <StudioLayout
                    title="Novo Episódio"
                    status="draft"
                    onExit={handleBackToDashboard}
                    variant="scrollable"
                    isStudioMode={false}
                >
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-ceramic-text-secondary text-sm">Carregando...</p>
                        </div>
                    </div>
                </StudioLayout>
            );
        }

        return (
            <StudioLayout
                title="Novo Episódio"
                status="draft"
                onExit={handleBackToDashboard}
                variant="scrollable"
                isStudioMode={false}
            >
                <div className="max-w-4xl mx-auto">
                    <GuestIdentificationWizard
                        showId={currentShowId}
                        userId={userId}
                        onComplete={handleWizardComplete}
                        onCancel={handleBackToDashboard}
                    />
                </div>
            </StudioLayout>
        );
    }

    // 4. NEW: Pre-Production Hub
    if (view === 'preproduction') {
        // Show loading while episode data is being fetched
        if (!currentGuestData || !currentProjectId) {
            return (
                <StudioLayout
                    title="Carregando..."
                    status="draft"
                    onExit={handleBackToDashboard}
                    variant="scrollable"
                    isStudioMode={false}
                >
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-ceramic-text-secondary text-sm">Carregando episódio...</p>
                        </div>
                    </div>
                </StudioLayout>
            );
        }

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
    console.warn('[PodcastCopilot] Falling through to fallback! view:', view, { currentShowId, userId, currentGuestData: !!currentGuestData, currentProjectId, currentDossier: !!currentDossier });
    return (
        <div className="flex items-center justify-center h-screen bg-[#F0EFE9]">
            <p className="text-[#5C554B]">Carregando...</p>
        </div>
    );
};

export default PodcastCopilotView;
