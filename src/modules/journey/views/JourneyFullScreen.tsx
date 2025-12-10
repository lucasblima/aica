/**
 * JourneyFullScreen Component
 * Full-screen view with 3 zones: Momento Presente, Timeline Viva, Insights & Patterns
 */

import React, { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { QuickCapture } from '../components/capture/QuickCapture'
import { MomentCard } from '../components/timeline/MomentCard'
import { WeeklySummaryCard } from '../components/insights/WeeklySummaryCard'
import { DailyQuestionCard } from '../components/insights/DailyQuestionCard'
import { ConsciousnessScore } from '../components/gamification/ConsciousnessScore'
import { JourneySearchPanel } from '../components/JourneySearchPanel'
import { PostCaptureInsight } from '../components/insights/PostCaptureInsight'
import { useMoments } from '../hooks/useMoments'
import { useCurrentWeeklySummary } from '../hooks/useWeeklySummary'
import { useDailyQuestion } from '../hooks/useDailyQuestion'
import { useConsciousnessPoints, useCPAnimation } from '../hooks/useConsciousnessPoints'
import { useJourneyFileSearch } from '../hooks/useJourneyFileSearch'
import { generatePostCaptureInsight } from '../services/aiAnalysisService'
import {
  PlusIcon,
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'
import { CreateMomentInput } from '../types/moment'
import confetti from 'canvas-confetti'
import { useAuth } from '../../../hooks/useAuth'

export function JourneyFullScreen() {
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
  const { moments, create: createMoment, delete: deleteMoment, loadMore, hasMore, isLoading } = useMoments()
  const { summary, addReflection } = useCurrentWeeklySummary()
  const { question, answer: answerQuestion, skip: skipQuestion } = useDailyQuestion()
  const { stats, refresh: refreshStats } = useConsciousnessPoints()
  const { showAnimation, pointsEarned, leveledUp, triggerAnimation } = useCPAnimation()

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
  } = useJourneyFileSearch({ userId: user?.id, autoLoad: true })

  const hasIndexedMoments = documents.length > 0

  // Handle moment creation
  const handleCreateMoment = async (input: CreateMomentInput) => {
    try {
      const result = await createMoment(input)

      // Generate post-capture insight
      const recentMoments = moments.slice(0, 7).map(m => ({
        content: m.content || '',
        tags: m.tags || [],
        created_at: m.created_at
      }))

      const insight = await generatePostCaptureInsight(
        input.content || '',
        recentMoments
      )

      setCurrentInsight(insight)
      setShowInsight(true)

      // Trigger CP animation
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

      setShowCapture(false)
      refreshStats()
    } catch (error) {
      console.error('Error creating moment:', error)
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
    } catch (error) {
      console.error('Error answering question:', error)
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
      console.error('Error adding reflection:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Minha Jornada</h1>
            </div>

            <button
              onClick={() => setShowCapture(!showCapture)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                showCapture
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {showCapture ? (
                <>
                  <XMarkIcon className="h-5 w-5" />
                  <span>Cancelar</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  <span>Novo Momento</span>
                </>
              )}
            </button>
          </div>

          {/* CP Score */}
          {stats && (
            <div className="max-w-md">
              <ConsciousnessScore stats={stats} size="sm" showDetails={false} />
            </div>
          )}
        </div>
      </div>

      {/* Main content - 3 zones */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  {/* CP Score detailed */}
                  {stats && (
                    <ConsciousnessScore stats={stats} size="md" showDetails={true} />
                  )}

                  {/* Daily Question */}
                  {question && (
                    <DailyQuestionCard
                      question={question}
                      onAnswer={handleAnswerQuestion}
                      onSkip={skipQuestion}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Zone 2 & 3: Timeline + Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'timeline'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClockIcon className="h-5 w-5" />
                <span>Timeline Viva</span>
              </button>

              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'insights'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ChartBarIcon className="h-5 w-5" />
                <span>Insights & Patterns</span>
              </button>

              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'search'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Busca</span>
              </button>
            </div>

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {moments.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">
                      Você ainda não registrou nenhum momento.
                    </p>
                    <button
                      onClick={() => setShowCapture(true)}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
                    >
                      Registrar Primeiro Momento
                    </button>
                  </div>
                )}

                {moments.map(moment => (
                  <MomentCard
                    key={moment.id}
                    moment={moment}
                    onDelete={deleteMoment}
                  />
                ))}

                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
                  >
                    {isLoading ? 'Carregando...' : 'Carregar mais'}
                  </button>
                )}
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-6">
                {/* Weekly Summary */}
                {summary ? (
                  <WeeklySummaryCard
                    summary={summary}
                    onAddReflection={handleAddReflection}
                  />
                ) : (
                  <div className="text-center py-12">
                    <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      Sem resumo semanal disponível ainda.
                    </p>
                    <p className="text-sm text-gray-500">
                      Registre alguns momentos durante a semana para gerar insights.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CP Animation */}
      {showAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center animate-bounce">
            <SparklesIcon className="h-16 w-16 text-yellow-500 mx-auto mb-3" />
            <div className="text-4xl font-bold text-gray-900 mb-2">
              +{pointsEarned} CP
            </div>
            {leveledUp && (
              <div className="text-lg font-medium text-purple-600">
                Level Up! 🎉
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
