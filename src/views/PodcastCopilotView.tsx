/**
 * @deprecated This file is deprecated and will be removed in version 2.0
 *
 * MIGRATION NOTICE:
 * This component has been replaced by the new Studio Module architecture.
 *
 * Old Architecture (Deprecated):
 * - PodcastCopilotView.tsx (this file) - Monolithic component with race conditions
 * - Used useEffect-based navigation causing state flickering
 * - 809 lines with complex guard logic
 *
 * New Architecture (Use this instead):
 * - src/modules/studio/views/StudioMainView.tsx - FSM-based component
 * - src/modules/studio/context/StudioContext.tsx - Centralized state management
 * - Eliminates race conditions through explicit state transitions
 *
 * Migration Guide:
 * 1. Replace route: <Route path="/podcast" element={<PodcastCopilotView />} />
 * 2. With: <Route path="/studio" element={<StudioProvider><StudioMainView /></StudioProvider>} />
 * 3. The /podcast route now redirects to /studio automatically
 *
 * DO NOT USE THIS COMPONENT IN NEW CODE.
 *
 * For questions, see:
 * - docs/architecture/STUDIO_REFACTORING_PLAN.md
 * - docs/architecture/STUDIO_PHASE_3_4_EXECUTION_PLAN.md
 *
 * @see StudioMainView
 * @see StudioContext
 */

import React, { useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PodcastCopilotView');
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
import { ErrorBoundary } from '../components';
import PodcastWorkspace from '../modules/podcast/components/workspace/PodcastWorkspace';

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
    | 'workspace'        // NEW: Unified workspace (Phase 1)
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

// Unified episode state to prevent race conditions
interface EpisodeState {
    episodeId: string | null;
    projectId: string | null;
    dossier: Dossier | null;
    guestData: GuestData | null;
}

export const PodcastCopilotView: React.FC<PodcastCopilotViewProps> = ({ userEmail, onLogout, onExit, onNavVisibilityChange }) => {
    // Navigation State
    const [view, setView] = useState<PodcastView>('library');
    const [currentShowId, setCurrentShowId] = useState<string | null>(null);
    const [currentShowTitle, setCurrentShowTitle] = useState<string>('');

    // Unified Episode State (prevents race conditions)
    const [episodeState, setEpisodeState] = useState<EpisodeState>({
        episodeId: null,
        projectId: null,
        dossier: null,
        guestData: null
    });

    // Derived state for backward compatibility
    const currentEpisodeId = episodeState.episodeId;
    const currentProjectId = episodeState.projectId;
    const currentDossier = episodeState.dossier;
    const currentGuestData = episodeState.guestData;

    // Additional Data State
    const [currentTopics, setCurrentTopics] = useState<Topic[]>([]);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);

    // Teleprompter State
    const [showTeleprompter, setShowTeleprompter] = useState(false);
    const [teleprompterIndex, setTeleprompterIndex] = useState(0);

    // Loading State for episode selection
    const [isLoadingEpisode, setIsLoadingEpisode] = useState(false);
    const [loadingEpisodeId, setLoadingEpisodeId] = useState<string | null>(null);

    // Transition flag to prevent guard effect from firing during state transitions
    const isTransitioningRef = useRef(false);

    // Loading timeout state
    const [wizardLoadingTimeout, setWizardLoadingTimeout] = useState(false);

    // Auth State Listener - keeps userId always in sync
    React.useEffect(() => {
        // Initial fetch
        const getCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                log.debug(' Initial user loaded:', user.id);
                setUserId(user.id);
            }
        };
        getCurrentUser();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                log.debug(' Auth state changed:', event, session?.user?.id);
                if (session?.user) {
                    setUserId(session.user.id);
                } else {
                    setUserId(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Debug: Log view state changes
    React.useEffect(() => {
        log.debug(' View changed to:', view, { currentShowId, userId, currentGuestData: !!currentGuestData, currentProjectId });
    }, [view, currentShowId, userId, currentGuestData, currentProjectId]);

    // Update nav visibility when view changes
    React.useEffect(() => {
        if (onNavVisibilityChange) {
            const showNav = view === 'library' || view === 'dashboard';
            onNavVisibilityChange(showNav);
        }
    }, [view, onNavVisibilityChange]);

    // Wizard loading timeout - shows retry button after 5 seconds
    React.useEffect(() => {
        if (view === 'wizard' && (!userId || !currentShowId)) {
            const timeout = setTimeout(() => {
                log.debug(' Wizard loading timeout reached');
                setWizardLoadingTimeout(true);
            }, 5000);
            return () => clearTimeout(timeout);
        }
        // Reset timeout flag when conditions are met
        setWizardLoadingTimeout(false);
    }, [view, userId, currentShowId]);

    // DEFENSIVE GUARD: Prevent unwanted redirects during wizard/production flows
    // This protects against race conditions where userId or currentShowId temporarily become null
    React.useEffect(() => {
        // PROTECTION 0: If a transition is in progress, skip ALL checks
        // This prevents the guard from firing during state updates
        if (isTransitioningRef.current) {
            log.debug(' Guard: Transition in progress, skipping ALL checks');
            return;
        }

        // PROTECTION 1: If userId is still loading (null), do nothing yet
        // The auth state may not be resolved on initial render
        if (!userId) {
            log.debug(' Guard: userId not ready, skipping redirect check');
            return;
        }

        // PROTECTION 2: If we're in 'wizard' mode, don't redirect automatically
        // The user intentionally navigated here; we should wait for dependencies
        if (view === 'wizard') {
            log.debug(' Guard: In wizard mode, skipping redirect');
            return;
        }

        // PROTECTION 3: If we're in workspace or any production flow, don't redirect
        // These views have their own loading states and should handle missing data gracefully
        if (view === 'workspace' || view === 'preproduction' || view === 'production' || view === 'postproduction') {
            log.debug(' Guard: In workspace/production flow, skipping redirect');
            return;
        }

        // Original redirect logic: Only redirect if on dashboard/preparation without required data
        // This catches edge cases where the user somehow got to a view without proper navigation
        if (!currentShowId && view !== 'library') {
            log.debug(' Guard: No showId and not in library, redirecting to library');
            setView('library');
        }
    }, [currentShowId, userId, view]);

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
        log.debug(' handleSelectEpisode called', { episodeId, view });

        // Set transition flag to prevent guard from interfering
        isTransitioningRef.current = true;

        // Set loading state BEFORE async operation
        setIsLoadingEpisode(true);
        setLoadingEpisodeId(episodeId);

        try {
            log.debug(' Fetching episode from Supabase...');
            const { data: episode, error } = await supabase
                .from('podcast_episodes')
                .select('*')
                .eq('id', episodeId)
                .single();

            if (error) {
                log.error(' Supabase error:', error);
                alert('Erro ao carregar episódio: ' + error.message);
                return; // Stay on dashboard
            }

            if (!episode) {
                log.error(' Episode not found');
                alert('Episódio não encontrado.');
                return; // Stay on dashboard
            }

            log.debug(' Episode loaded:', episode.id, episode.guest_name);

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

            // Update ALL episode state atomically using unified state
            log.debug(' Updating episode state atomically');
            setEpisodeState({
                episodeId,
                projectId: episodeId,
                dossier,
                guestData
            });

            log.debug(' Setting view to workspace');
            setView('workspace');
        } catch (error) {
            log.error(' Error loading episode:', error);
            alert('Erro ao carregar episódio. Tente novamente.');
            // Don't change view - stay on dashboard
        } finally {
            // Clear loading state regardless of success/failure
            setIsLoadingEpisode(false);
            setLoadingEpisodeId(null);
            // Clear transition flag after a short delay to ensure state is settled
            setTimeout(() => {
                isTransitioningRef.current = false;
                log.debug(' Transition complete');
            }, 100);
        }
    };

    // Dashboard -> Create New Episode -> Workspace (NEW FLOW)
    const handleCreateEpisode = async () => {
        log.debug(' handleCreateEpisode called', { currentShowId, userId, view });

        // Set transition flag IMMEDIATELY to prevent guard from interfering during async operations
        isTransitioningRef.current = true;

        try {
            // Validate currentShowId
            if (!currentShowId) {
                log.error(' No currentShowId, showing error');
                alert('Erro: Nenhum podcast selecionado. Volte e selecione um podcast.');
                return;
            }

            // If userId is null, try to re-fetch it
            let currentUserId = userId;
            if (!currentUserId) {
                log.debug(' userId is null, attempting to re-fetch...');
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    log.debug(' User re-fetched successfully:', user.id);
                    setUserId(user.id);
                    currentUserId = user.id;
                } else {
                    log.error(' Failed to get user, showing error');
                    alert('Sessão expirada. Por favor, faça login novamente.');
                    return;
                }
            }

            // Create empty episode
            log.debug(' Creating empty episode...');
            const { data: newEpisode, error } = await supabase
                .from('podcast_episodes')
                .insert({
                    show_id: currentShowId,
                    user_id: currentUserId,
                    status: 'draft',
                    title: 'Novo Episódio',
                    guest_name: '',
                    episode_theme: '',
                })
                .select()
                .single();

            if (error) {
                log.error(' Failed to create episode:', error);
                alert('Erro ao criar episódio: ' + error.message);
                return;
            }

            log.debug(' Episode created:', newEpisode.id);

            // Update episode state
            setEpisodeState({
                episodeId: newEpisode.id,
                projectId: newEpisode.id,
                dossier: null,
                guestData: null,
            });

            // Navigate to workspace
            log.debug(' Setting view to workspace');
            setView('workspace');
        } catch (error) {
            log.error(' Error creating episode:', error);
            alert('Erro ao criar episódio. Tente novamente.');
        } finally {
            // Clear transition flag after state is settled
            setTimeout(() => {
                isTransitioningRef.current = false;
                log.debug(' Transition to workspace complete');
            }, 100);
        }
    };

    // Wizard -> Pre-Production
    const handleWizardComplete = async (episode: any) => {
        log.debug(' handleWizardComplete called', { episode });

        // Set transition flag
        isTransitioningRef.current = true;

        // Prepare guest data from episode
        const guestData: GuestData = {
            name: episode.guest_name,
            fullName: episode.guest_name,
            title: episode.guest_type === 'public-figure' ? episode.guest_reference : undefined,
            theme: episode.episode_theme,
            season: episode.season?.toString(),
            location: episode.location,
            scheduledDate: episode.scheduled_date,
            scheduledTime: episode.scheduled_time
        };

        // Update unified state atomically
        setEpisodeState({
            episodeId: episode.id,
            projectId: episode.id,
            dossier: null, // No dossier yet, will be generated in preproduction
            guestData
        });

        // Navigate to workspace instead of preproduction
        log.debug(' Navigating to workspace with episode:', episode.id);
        setView('workspace');

        // Clear transition flag after state is settled
        setTimeout(() => {
            isTransitioningRef.current = false;
            log.debug(' Transition to workspace complete');
        }, 100);
    };

    // Pre-Production -> Production
    const handleGoToProduction = (dossier: Dossier, projectId: string, topics: Topic[]) => {
        log.debug(' handleGoToProduction called', { projectId });

        // Set transition flag
        isTransitioningRef.current = true;

        // Update unified state with dossier
        setEpisodeState(prev => ({
            ...prev,
            dossier,
            projectId
        }));
        setCurrentTopics(topics);
        setView('production');

        // Clear transition flag
        setTimeout(() => {
            isTransitioningRef.current = false;
        }, 100);
    };

    // Production -> Post-Production
    const handleFinishProduction = (duration: number) => {
        setRecordingDuration(duration); // FIX: Store recording duration
        setView('postproduction');
    };

    // Legacy handlers (for compatibility)
    const handleDossierReady = (dossier: Dossier, projectId: string) => {
        setEpisodeState(prev => ({
            ...prev,
            dossier,
            projectId
        }));
        setView('studio');
    };

    const handleGoToStudio = (projectId: string) => {
        setEpisodeState(prev => ({
            ...prev,
            projectId
        }));
        setView('studio');
    };

    // ================== BACK NAVIGATION ==================

    const handleBackToLibrary = () => {
        setView('library');
        setCurrentShowId(null);
        setCurrentShowTitle('');
        // Reset unified episode state
        setEpisodeState({
            episodeId: null,
            projectId: null,
            dossier: null,
            guestData: null
        });
    };

    const handleBackToDashboard = () => {
        setView('dashboard');
        // Reset unified episode state
        setEpisodeState({
            episodeId: null,
            projectId: null,
            dossier: null,
            guestData: null
        });
    };

    const handleBackToPreProduction = () => {
        setView('preproduction');
    };

    const handleBackToPreparation = () => {
        setView('preparation');
        setEpisodeState(prev => ({
            ...prev,
            dossier: null
        }));
    };

    // ================== VIEW RENDERS ==================
    // CRITICAL: Priority order matters! Wizard and PreProduction must be checked FIRST
    // to prevent visual redirect when currentShowId temporarily becomes null
    log.debug(' Rendering, view:', view, { currentShowId, userId, currentGuestData: !!currentGuestData, currentProjectId });

    // 0. PRIORITY: Workspace (NEW unified interface)
    // CRITICAL: Workspace has highest priority - render it BEFORE any currentShowId checks
    // This prevents redirects when currentShowId temporarily becomes null during transitions
    if (view === 'workspace') {
        log.debug(' Rendering Workspace view', {
            currentEpisodeId,
            currentShowId,
            isTransitioning: isTransitioningRef.current
        });

        // During transition, show loading without checking dependencies
        // This prevents flash of Library view when state is being updated
        if (isTransitioningRef.current) {
            return (
                <div className="flex items-center justify-center h-screen bg-ceramic-base">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-ceramic-text-secondary text-sm">Carregando workspace...</p>
                    </div>
                </div>
            );
        }

        // Only show loading if we genuinely don't have the required data
        if (!currentEpisodeId || !currentShowId) {
            log.debug(' Workspace waiting for data', { currentEpisodeId, currentShowId });
            return (
                <div className="flex items-center justify-center h-screen bg-ceramic-base">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-ceramic-text-secondary text-sm">Carregando workspace...</p>
                    </div>
                </div>
            );
        }

        return (
            <PodcastWorkspace
                episodeId={currentEpisodeId}
                showId={currentShowId}
                showTitle={currentShowTitle}
                onBack={handleBackToDashboard}
            />
        );
    }

    // 1. PRIORITY: Guest Identification Wizard (checked FIRST!)
    // The wizard has absolute priority - if view is 'wizard', render it regardless of other state
    if (view === 'wizard') {
        log.debug(' Rendering Wizard view', { userId, currentShowId, wizardLoadingTimeout });

        // Show loading while dependencies are being resolved
        if (!userId || !currentShowId) {
            log.debug(' Wizard loading - waiting for dependencies', { userId: !!userId, currentShowId: !!currentShowId });

            // If timeout reached, show retry option
            if (wizardLoadingTimeout) {
                return (
                    <StudioLayout
                        title="Novo Episódio"
                        status="draft"
                        onExit={handleBackToDashboard}
                        variant="scrollable"
                        isStudioMode={false}
                    >
                        <div className="flex items-center justify-center h-64">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                                    <span className="text-3xl">⚠️</span>
                                </div>
                                <div>
                                    <p className="text-ceramic-text-primary font-bold mb-1">
                                        Não foi possível carregar
                                    </p>
                                    <p className="text-ceramic-text-secondary text-sm mb-4">
                                        {!userId ? 'Verificando sessão do usuário...' : 'Aguardando dados do podcast...'}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleBackToDashboard}
                                        className="px-6 py-3 rounded-xl bg-ceramic-cool text-ceramic-text-primary font-bold hover:bg-ceramic-cool/80 transition-all"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setWizardLoadingTimeout(false);
                                            // Try to re-fetch user
                                            const { data: { user } } = await supabase.auth.getUser();
                                            if (user) {
                                                setUserId(user.id);
                                            }
                                        }}
                                        className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all"
                                    >
                                        Tentar novamente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </StudioLayout>
                );
            }

            // Normal loading state
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

    // 2. PRIORITY: Pre-Production Hub (checked early to prevent redirect)
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

    // 3. PRIORITY: Production Mode
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

    // 4. PRIORITY: Post-Production Hub
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

    // ================== SECONDARY VIEWS (checked AFTER priority views) ==================

    // Dashboard - only render if view is explicitly 'dashboard'
    if (view === 'dashboard') {
        log.debug(' Rendering Dashboard view', { currentShowId });

        // Show loading while showId is being resolved (but don't redirect!)
        if (!currentShowId) {
            log.debug(' Dashboard loading - waiting for showId');
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

    // Library - default view when no other view matches
    if (view === 'library') {
        log.debug(' Rendering Library view');
        return (
            <PodcastLibrary
                onSelectShow={handleSelectShow}
                onCreateNew={() => {}} // Handled internally by PodcastLibrary modal
                userEmail={userEmail}
                onLogout={onLogout}
            />
        );
    }

    // Fallback - should rarely be reached
    log.warn(' Falling through to fallback! view:', view, { currentShowId, userId, currentGuestData: !!currentGuestData, currentProjectId, currentDossier: !!currentDossier });
    return (
        <div className="flex items-center justify-center h-screen bg-[#F0EFE9]">
            <p className="text-[#5C554B]">Carregando...</p>
        </div>
    );
};

export default PodcastCopilotView;
