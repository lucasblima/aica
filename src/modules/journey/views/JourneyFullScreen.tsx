/**
 * JourneyFullScreen Component
 * Full-screen view with 3 zones: Momento Presente, Atividades (Unified Timeline), Insights & Patterns
 */

import React, { useState, useEffect } from 'react'
import { createNamespacedLogger } from '@/lib/logger'
import { motion, AnimatePresence } from 'framer-motion'

const log = createNamespacedLogger('JourneyFullScreen')
import { useNavigate } from 'react-router-dom'
import { QuickCapture } from '../components/capture/QuickCapture'
import { UnifiedTimelineView } from '../components/timeline'
import { WeeklySummaryCard } from '../components/insights/WeeklySummaryCard'
import { DailyQuestionCard } from '../components/insights/DailyQuestionCard'
import { PatternDashboard } from '../components/insights/PatternDashboard'
import { ConsciousnessScore } from '../components/gamification/ConsciousnessScore'
import { JourneySearchPanel } from '../components/JourneySearchPanel'
import { PostCaptureInsight } from '../components/insights/PostCaptureInsight'
import { useMoments } from '../hooks/useMoments'
import { useCurrentWeeklySummary } from '../hooks/useWeeklySummary'
import { useDailyQuestion } from '../hooks/useDailyQuestion'
import { useConsciousnessPoints, useCPAnimation } from '../hooks/useConsciousnessPoints'
import { useJourneyFileSearch } from '../hooks/useJourneyFileSearch'
import { useUnifiedTimeline } from '../hooks/useUnifiedTimeline'
import { generatePostCaptureInsight } from '../services/aiAnalysisService'
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/solid'
import { CreateMomentInput } from '../types/moment'
import confetti from 'canvas-confetti'
import { useAuth } from '../../../hooks/useAuth'
import { useTourAutoStart } from '../../../hooks/useTourAutoStart'
import { SettingsMenu, HelpButton } from '@/components'

// ── Skeleton Components ──────────────────────────────────────────

function ConsciousnessScoreSkeleton() {
  return (
    <div className="ceramic-card p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 bg-[#E0DDD5] rounded-full" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-[#E0DDD5] rounded mb-2" />
          <div className="h-3 w-16 bg-[#E0DDD5] rounded" />
        </div>
      </div>
      <div className="h-3 w-full bg-[#E0DDD5] rounded mb-4" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 bg-[#E0DDD5] rounded" />
        ))}
      </div>
    </div>
  )
}

function DailyQuestionSkeleton() {
  return (
    <div className="ceramic-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-[#E0DDD5] rounded-full" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-[#E0DDD5] rounded mb-2" />
          <div className="h-3 w-16 bg-[#E0DDD5] rounded" />
        </div>
        <div className="h-6 w-14 bg-[#E0DDD5] rounded-full" />
      </div>
      <div className="h-5 w-full bg-[#E0DDD5] rounded" />
      <div className="h-5 w-3/4 bg-[#E0DDD5] rounded" />
      <div className="h-24 w-full bg-[#E0DDD5] rounded" />
      <div className="flex gap-3">
        <div className="h-10 w-24 bg-[#E0DDD5] rounded-full" />
        <div className="h-10 w-20 bg-[#E0DDD5] rounded-full" />
      </div>
    </div>
  )
}

function WeeklySummarySkeleton() {
  return (
    <div className="ceramic-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-6 w-6 bg-[#E0DDD5] rounded" />
        <div className="h-5 w-40 bg-[#E0DDD5] rounded" />
      </div>
      <div className="h-4 w-full bg-[#E0DDD5] rounded" />
      <div className="h-4 w-5/6 bg-[#E0DDD5] rounded" />
      <div className="h-4 w-2/3 bg-[#E0DDD5] rounded" />
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-[#E0DDD5] rounded" />
        ))}
      </div>
    </div>
  )
}

function InsightsEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ceramic-tile p-12 text-center"
    >
      <ChartBarIcon className="h-12 w-12 text-[#C4A574] mx-auto mb-3" />
      <h3 className="text-base font-semibold text-[#5C554B] mb-2">
        Sem resumo semanal disponível ainda
      </h3>
      <p className="text-sm text-[#948D82] max-w-sm mx-auto">
        Registre alguns momentos e responda perguntas durante a semana. Seus insights e padrões aparecerão aqui.
      </p>
    </motion.div>
  )
}

// ── Tab animation variants ──────────────────────────────────────

const tabContentVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

interface JourneyFullScreenProps {
  onBack?: () => void;
}

export function JourneyFullScreen({ onBack }: JourneyFullScreenProps) {
  // TODO: Re-enable tour when Journey module is fully functional
  // useTourAutoStart('journey-first-visit');

  // Debug: Log when component mounts
  React.useEffect(() => {
    log.debug('[JourneyFullScreen] Component mounted');
    return () => {
      log.debug('[JourneyFullScreen] Component unmounting');
    };
  }, []);

  const navigate = useNavigate()
  const [showCapture, setShowCapture] = useState(false)
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights' | 'search'>('timeline')
  const [showInsight, setShowInsight] = useState(false)
  const [currentInsight, setCurrentInsight] = useState<{
    message: string;
    relatedMoments: number;
    theme?: string;
    action?: 'view_similar' | 'view_patterns';
  } | null>(null)

  const { user } = useAuth()
  const { moments, create: createMoment } = useMoments()
  const { summary, isLoading: isLoadingSummary, addReflection, refresh: refreshSummary } = useCurrentWeeklySummary()
  const { question, answer: answerQuestion, skip: skipQuestion, refresh: refreshQuestion } = useDailyQuestion()
  const { stats, refresh: refreshStats } = useConsciousnessPoints()
  const { showAnimation, pointsEarned, leveledUp, triggerAnimation } = useCPAnimation()
  const { refresh: refreshTimeline } = useUnifiedTimeline(user?.id)

  // File Search integration
  const {
    searchInMoments,
    findByEmotion,
    findByTag,
    findGrowthMoments,
    findInsights,
    searchResults,
    isSearching,
    documents,
    clearSearchResults,
    indexMoment,
    isIndexing,
    initialize: initializeFileSearch,
  } = useJourneyFileSearch({ userId: user?.id, autoLoad: false })

  const hasIndexedMoments = documents.length > 0

  // Lazy load: fetch weekly summary only when insights tab is selected
  useEffect(() => {
    if (activeTab === 'insights' && !summary && !isLoadingSummary) {
      refreshSummary()
    }
  }, [activeTab, summary, isLoadingSummary, refreshSummary])

  // Lazy load: initialize File Search only when search tab is selected
  useEffect(() => {
    if (activeTab === 'search') {
      initializeFileSearch().catch((err) => {
        log.warn('File search initialization failed (non-critical):', err)
      })
    }
  }, [activeTab, initializeFileSearch])

  // Handle moment creation
  const handleCreateMoment = async (input: CreateMomentInput) => {
    try {
      const result = await createMoment(input)

      // Close capture modal IMMEDIATELY (don't wait for background tasks)
      setShowCapture(false)

      // Trigger CP animation immediately
      triggerAnimation(
        5,
        result.leveled_up,
        result.leveled_up
          ? { level: stats?.level || 1, name: stats?.level_name || 'Observador' }
          : undefined
      )

      // Fire confetti on level up
      if (result.leveled_up) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }

      // BACKGROUND TASKS (non-blocking, fire-and-forget)

      // Auto-index moment for File Search
      if (result && result.content && result.content.length >= 10) {
        indexMoment(result).catch((err) => {
          log.warn('Failed to index moment for File Search:', err)
        })
      }

      // Generate post-capture insight (async, don't wait)
      const recentMoments = moments.slice(0, 7).map(m => ({
        content: m.content || '',
        tags: m.tags || [],
        created_at: m.created_at
      }))

      generatePostCaptureInsight(input.content || '', recentMoments)
        .then((insight) => {
          setCurrentInsight(insight)
          setShowInsight(true)
        })
        .catch((error) => {
          log.warn('Failed to generate post-capture insight (non-critical):', error)
        })

      // Refresh stats and timeline in background
      Promise.allSettled([
        refreshStats(),
        refreshTimeline()
      ]).catch((error) => {
        log.warn('Background refresh failed (non-critical):', error)
      })

    } catch (error) {
      log.error('Error creating moment:', error)
    }
  }

  // Handle question answer
  const handleAnswerQuestion = async (questionId: string, responseText: string) => {
    try {
      const result = await answerQuestion(responseText)

      // Trigger CP animation
      triggerAnimation(
        10,
        result.leveled_up,
        result.leveled_up
          ? { level: stats?.level || 1, name: stats?.level_name || 'Observador' }
          : undefined
      )

      if (result.leveled_up) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }

      refreshStats()

      // Fetch next question after a short delay to show success feedback
      setTimeout(() => {
        refreshQuestion()
      }, 2000)
    } catch (error) {
      log.error('Error answering question:', error)
      // Re-throw to let the card component handle UI state
      throw error
    }
  }

  // Handle weekly reflection
  const handleAddReflection = async (summaryId: string, reflection: string) => {
    try {
      const result = await addReflection(reflection)

      // Trigger CP animation
      triggerAnimation(20, false)

      refreshStats()
    } catch (error) {
      log.error('Error adding reflection:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#F0EFE9]">
      {/* Header - Digital Ceramic System */}
      <div className="ceramic-card rounded-none p-6 border-b border-[#A39E91]/10" data-tour="journey-header">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* Back Navigation Button */}
              <button
                onClick={() => onBack ? onBack() : navigate('/')}
                className="ceramic-card hover:ceramic-elevated p-2 rounded-full transition-all"
                aria-label="Voltar para página inicial"
              >
                <ArrowLeftIcon className="h-5 w-5 text-[#5C554B]" />
              </button>

              <SparklesIcon className="h-8 w-8 text-amber-600" />
              <h1 className="text-2xl font-semibold tracking-tight text-etched">Minha Jornada</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCapture(!showCapture)}
                data-tour="add-moment-button"
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${showCapture
                  ? 'ceramic-pressed text-[#5C554B]'
                  : 'ceramic-card hover:ceramic-elevated text-[#5C554B]'
                  }`}
              >
                {showCapture ? (
                  <>
                    <XMarkIcon className="h-5 w-5" />
                    <span>Cancelar</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-5 w-5 text-amber-600" />
                    <span>Novo Momento</span>
                  </>
                )}
              </button>

              {/* Help Button - Optional tour */}
              <HelpButton tourKey="journey-first-visit" />

              {/* Settings Menu - Discrete gear icon */}
              <SettingsMenu userEmail={user?.email} />
            </div>
          </div>

          {/* CP Score moved to sidebar - removed duplicate from header */}
        </div>
      </div>

      {/* Main content - 3 zones */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Zone 1: Momento Presente (Capture) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {showCapture ? (
                <QuickCapture
                  onSubmit={handleCreateMoment}
                  onCancel={() => setShowCapture(false)}
                />
              ) : (
                <div className="space-y-6">
                  {/* CP Score detailed - Consciousness Points */}
                  {stats ? (
                    <motion.div
                      data-tour="consciousness-points"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <ConsciousnessScore stats={stats} size="md" showDetails={true} />
                    </motion.div>
                  ) : (
                    <ConsciousnessScoreSkeleton />
                  )}

                  {/* Daily Question */}
                  {question ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                    >
                      <DailyQuestionCard
                        question={question}
                        onAnswer={handleAnswerQuestion}
                        onSkip={skipQuestion}
                      />
                    </motion.div>
                  ) : (
                    <DailyQuestionSkeleton />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Zone 2 & 3: Timeline + Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs - Ceramic Tray */}
            <div className="ceramic-tray p-2 flex gap-2">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all rounded-full ${activeTab === 'timeline'
                  ? 'ceramic-card text-amber-700'
                  : 'text-[#948D82] hover:text-[#5C554B]'
                  }`}
              >
                <ClockIcon className="h-5 w-5" />
                <span>Atividades</span>
              </button>

              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all rounded-full ${activeTab === 'insights'
                  ? 'ceramic-card text-amber-700'
                  : 'text-[#948D82] hover:text-[#5C554B]'
                  }`}
              >
                <ChartBarIcon className="h-5 w-5" />
                <span>Insights & Patterns</span>
              </button>

              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all rounded-full ${activeTab === 'search'
                  ? 'ceramic-card text-amber-700'
                  : 'text-[#948D82] hover:text-[#5C554B]'
                  }`}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Busca</span>
              </button>
            </div>

            {/* Tab Content with crossfade animation */}
            <AnimatePresence mode="wait">
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  variants={tabContentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <UnifiedTimelineView userId={user?.id} />
                </motion.div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <motion.div
                  key="insights"
                  variants={tabContentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {isLoadingSummary ? (
                    <WeeklySummarySkeleton />
                  ) : summary ? (
                    <WeeklySummaryCard
                      summary={summary}
                      onAddReflection={handleAddReflection}
                    />
                  ) : (
                    <InsightsEmptyState />
                  )}

                  {/* Pattern Dashboard */}
                  <PatternDashboard userId={user?.id} />
                </motion.div>
              )}

              {/* Search Tab */}
              {activeTab === 'search' && (
                <motion.div
                  key="search"
                  variants={tabContentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="ceramic-card p-6"
                >
                  <JourneySearchPanel
                    onSearch={async (query) => {
                      const results = await searchInMoments(query, 10);
                      return results;
                    }}
                    onSearchEmotion={async (emotion) => {
                      const results = await findByEmotion(emotion, 10);
                      return results;
                    }}
                    onSearchTag={async (tag) => {
                      const results = await findByTag(tag, 10);
                      return results;
                    }}
                    onSearchGrowth={async () => {
                      const results = await findGrowthMoments(10);
                      return results;
                    }}
                    onSearchInsights={async (question) => {
                      const results = await findInsights(question, 10);
                      return results;
                    }}
                    results={searchResults}
                    isSearching={isSearching}
                    hasMoments={hasIndexedMoments}
                    onClear={clearSearchResults}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* CP Animation */}
      {showAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="ceramic-card p-8 text-center animate-bounce">
            <SparklesIcon className="h-16 w-16 text-amber-500 mx-auto mb-3" />
            <div className="text-4xl font-bold text-[#5C554B] mb-2">
              +{pointsEarned} CP
            </div>
            {leveledUp && (
              <div className="text-lg font-medium text-amber-700">
                Level Up!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-Capture Insight Modal */}
      <AnimatePresence>
        {showInsight && currentInsight && (
          <PostCaptureInsight
            insight={currentInsight}
            pointsEarned={5}
            onViewSimilar={
              currentInsight.theme
                ? () => {
                  setActiveTab('search')
                  findByTag(currentInsight.theme!, 10)
                }
                : undefined
            }
            onViewPatterns={() => {
              setActiveTab('insights')
            }}
            onClose={() => {
              setShowInsight(false)
              setCurrentInsight(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
