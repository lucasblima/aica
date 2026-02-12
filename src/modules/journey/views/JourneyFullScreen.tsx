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
  SparklesIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  FireIcon,
} from '@heroicons/react/24/solid'
import { CreateMomentInput } from '../types/moment'
import { LEVEL_COLORS, getProgressToNextLevel } from '../types/consciousnessPoints'
import confetti from 'canvas-confetti'
import { useAuth } from '../../../hooks/useAuth'
import { useTourAutoStart } from '../../../hooks/useTourAutoStart'
import { SettingsMenu, HelpButton } from '@/components'
import { CeramicFilterTab } from '@/components/ui'

// ── Skeleton Components ──────────────────────────────────────────

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

function DailyQuestionRetryState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-gradient-to-br from-white to-amber-50 border-2 border-amber-200 rounded-xl p-6 text-center">
      <SparklesIcon className="h-8 w-8 text-amber-500 mx-auto mb-3" />
      <h3 className="text-base font-semibold text-[#5C554B] mb-1">
        Não foi possível gerar perguntas agora
      </h3>
      <p className="text-sm text-[#948D82] mb-4">
        Tente novamente em alguns instantes.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-all"
      >
        Tentar novamente
      </button>
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
  const { question, isLoading: isLoadingQuestion, answer: answerQuestion, skip: skipQuestion, refresh: refreshQuestion } = useDailyQuestion()
  const { stats, refresh: refreshStats } = useConsciousnessPoints()
  const { showAnimation, pointsEarned, leveledUp, newLevel, qualityFeedback, triggerAnimation } = useCPAnimation()
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

      // Trigger CP animation with real level-up data from RPC
      triggerAnimation(
        result.cp_earned,
        result.leveled_up,
        result.leveled_up
          ? { level: result.new_level || stats?.level || 1, name: result.level_name || stats?.level_name || 'Observador' }
          : undefined,
        result.quality_feedback
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
      // Use result + existing moments to avoid race condition (moments state may not include the new one yet)
      const newMomentEntry = { content: result.content || input.content || '', tags: result.tags || [], created_at: result.created_at }
      const recentMoments = [newMomentEntry, ...moments.slice(0, 6).map(m => ({
        content: m.content || '',
        tags: m.tags || [],
        created_at: m.created_at
      }))]

      generatePostCaptureInsight(input.content || '', recentMoments)
        .then((insight) => {
          if (insight && insight.message) {
            setCurrentInsight(insight)
            setShowInsight(true)
          }
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
        result.cp_earned,
        result.leveled_up,
        result.leveled_up
          ? { level: stats?.level || 1, name: stats?.level_name || 'Observador' }
          : undefined,
        result.quality_feedback
      )

      if (result.leveled_up) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      }

      refreshStats()

      // Fetch next question after delay to show success feedback.
      // Safe because getDailyQuestion now returns null (not a re-served answered question)
      // when no unanswered questions exist, so no infinite loop.
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
      triggerAnimation(result.cp_earned, false, undefined, result.quality_feedback)

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
          <div className="flex items-center justify-between">
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

            {/* CP Stats with progress */}
            {stats ? (() => {
              const progress = getProgressToNextLevel(stats.total_points)
              return (
                <div className="flex items-center gap-4" data-tour="consciousness-points">
                  {/* Level badge */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: LEVEL_COLORS[stats.level] }}
                    title={stats.level_name}
                  >
                    {stats.level}
                  </div>

                  {/* Points + progress bar */}
                  <div className="flex flex-col min-w-[120px]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-ceramic-text-primary leading-none">
                        {stats.total_points.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-ceramic-text-secondary">CP</span>
                      <span className="text-[10px] text-ceramic-text-secondary/60 ml-1">
                        {stats.level_name}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1 h-1.5 w-full bg-ceramic-cool/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: LEVEL_COLORS[stats.level] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.progress_percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    {progress.next_level && (
                      <span className="text-[10px] text-ceramic-text-secondary/50 mt-0.5 leading-none">
                        {progress.points_to_next} para nível {progress.next_level}
                      </span>
                    )}
                  </div>

                  {/* Streak */}
                  {stats.current_streak > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-ceramic-warning/10 rounded-full shrink-0">
                      <FireIcon className="h-3.5 w-3.5 text-ceramic-warning" />
                      <span className="text-xs font-bold text-ceramic-warning">{stats.current_streak}</span>
                    </div>
                  )}
                </div>
              )
            })() : (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-[#E0DDD5] rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <div className="h-4 w-20 bg-[#E0DDD5] rounded" />
                  <div className="h-1.5 w-28 bg-[#E0DDD5] rounded-full" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <HelpButton tourKey="journey-first-visit" />
              <SettingsMenu userEmail={user?.email} />
            </div>
          </div>
        </div>
      </div>

      {/* Main content - single column */}
      <div className="max-w-4xl mx-auto p-6 space-y-4 pb-40">
        {/* Tabs */}
        <div className="flex gap-2">
          <CeramicFilterTab
            icon={<ClockIcon className="h-4 w-4" />}
            label="Atividades"
            isActive={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
          />
          <CeramicFilterTab
            icon={<ChartBarIcon className="h-4 w-4" />}
            label="Insights"
            isActive={activeTab === 'insights'}
            onClick={() => setActiveTab('insights')}
          />
          <CeramicFilterTab
            icon={<MagnifyingGlassIcon className="h-4 w-4" />}
            label="Busca"
            isActive={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
          />
        </div>

        {/* QuickCapture */}
        <QuickCapture onSubmit={handleCreateMoment} compact />

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
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Daily Question */}
              <div>
                {isLoadingQuestion ? (
                  <DailyQuestionSkeleton />
                ) : question ? (
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
                  <DailyQuestionRetryState onRetry={refreshQuestion} />
                )}
              </div>

              {/* Timeline masonry */}
              <div>
                <UnifiedTimelineView userId={user?.id} layout="masonry" />
              </div>
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
                Level Up! {newLevel ? newLevel.name : ''}
              </div>
            )}
            {qualityFeedback && (
              <div className="text-sm text-[#948D82] mt-2 max-w-xs mx-auto">
                {qualityFeedback}
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
            pointsEarned={pointsEarned || 11}
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
