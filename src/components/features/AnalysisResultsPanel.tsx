/**
 * AnalysisResultsPanel Component
 *
 * Modal/panel displaying AI analysis results for a contact.
 * Shows:
 * - Health Score with visual indicator
 * - Sentiment breakdown
 * - Common topics
 * - Action items
 * - Recommendations
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageCircle,
  Target,
  Lightbulb,
  Heart,
  Sparkles
} from 'lucide-react'

interface AnalysisResultsPanelProps {
  isOpen: boolean
  onClose: () => void
  contactName: string
  healthScore: number
  sentiment?: {
    overall: 'positive' | 'neutral' | 'negative'
    score: number
    breakdown: { positive: number; neutral: number; negative: number }
  }
  topics: Array<{ name: string; frequency: number; sentiment: string }>
  actionItems: Array<{ text: string; priority: string; dueHint?: string }>
  insights?: {
    communicationStyle?: string
    recommendations?: string[]
  }
}

/**
 * Health Score Badge with color coding
 */
function HealthScoreBadge({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-green-600'
    if (score >= 60) return 'from-blue-400 to-blue-600'
    if (score >= 40) return 'from-amber-400 to-amber-600'
    if (score >= 20) return 'from-orange-400 to-orange-600'
    return 'from-red-400 to-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente'
    if (score >= 60) return 'Bom'
    if (score >= 40) return 'Moderado'
    if (score >= 20) return 'Atenção'
    return 'Crítico'
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getScoreColor(score)} flex items-center justify-center shadow-lg`}>
        <span className="text-2xl font-black text-white">{score}</span>
      </div>
      <span className="mt-2 text-sm font-bold text-ceramic-text-secondary">
        {getScoreLabel(score)}
      </span>
    </div>
  )
}

export function AnalysisResultsPanel({
  isOpen,
  onClose,
  contactName,
  healthScore,
  sentiment,
  topics,
  actionItems,
  insights
}: AnalysisResultsPanelProps) {
  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const SentimentIcon = sentiment?.overall === 'positive'
    ? TrendingUp
    : sentiment?.overall === 'negative'
    ? TrendingDown
    : Minus

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={handleKeyDown}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-ceramic-base w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl border border-ceramic-text-secondary/10 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-ceramic-text-secondary/10 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ceramic-text-primary">
                  Análise Aica
                </h2>
                <p className="text-sm text-ceramic-text-secondary">
                  {contactName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-text-secondary/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Health Score Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
              <div>
                <h3 className="text-lg font-bold text-ceramic-text-primary">
                  Saúde do Relacionamento
                </h3>
                <p className="text-sm text-ceramic-text-secondary">
                  Baseado na análise de conversas
                </p>
              </div>
              <HealthScoreBadge score={healthScore} />
            </div>

            {/* Sentiment Overview */}
            {sentiment && (
              <div className="ceramic-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <SentimentIcon className={`w-5 h-5 ${
                    sentiment.overall === 'positive' ? 'text-green-500' :
                    sentiment.overall === 'negative' ? 'text-red-500' :
                    'text-gray-500'
                  }`} />
                  <h4 className="font-bold text-ceramic-text-primary">Sentimento</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {sentiment.breakdown.positive}%
                    </div>
                    <div className="text-xs text-green-700">Positivo</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-gray-600">
                      {sentiment.breakdown.neutral}%
                    </div>
                    <div className="text-xs text-gray-700">Neutro</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-red-600">
                      {sentiment.breakdown.negative}%
                    </div>
                    <div className="text-xs text-red-700">Negativo</div>
                  </div>
                </div>
              </div>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <div className="ceramic-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  <h4 className="font-bold text-ceramic-text-primary">Tópicos Comuns</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics.slice(0, 8).map((topic, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        topic.sentiment === 'pos'
                          ? 'bg-green-100 text-green-700'
                          : topic.sentiment === 'neg'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {topic.name} ({topic.frequency})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {actionItems.length > 0 && (
              <div className="ceramic-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <h4 className="font-bold text-ceramic-text-primary">Ações Sugeridas</h4>
                </div>
                <ul className="space-y-2">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold mt-0.5 ${
                        item.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : item.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      <span className="text-sm text-ceramic-text-primary">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {insights?.recommendations && insights.recommendations.length > 0 && (
              <div className="ceramic-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-ceramic-text-primary">Recomendações</h4>
                </div>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ceramic-text-secondary">
                      <Heart className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Communication Style */}
            {insights?.communicationStyle && (
              <div className="ceramic-inset p-4 rounded-xl">
                <p className="text-sm text-ceramic-text-secondary">
                  <strong className="text-ceramic-text-primary">Estilo de comunicação:</strong>{' '}
                  {insights.communicationStyle}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-ceramic-text-secondary/10">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold hover:from-purple-600 hover:to-indigo-600 transition-all"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AnalysisResultsPanel
