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
    if (score >= 80) return 'from-ceramic-success to-ceramic-success/80'
    if (score >= 60) return 'from-ceramic-info to-ceramic-info/80'
    if (score >= 40) return 'from-amber-400 to-amber-600'
    if (score >= 20) return 'from-ceramic-warning to-ceramic-warning/80'
    return 'from-ceramic-error to-ceramic-error/80'
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
          <div className="flex items-center justify-between p-5 border-b border-ceramic-text-secondary/10 bg-gradient-to-r from-ceramic-accent/10 to-ceramic-warning/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ceramic-accent/10 rounded-xl">
                <Sparkles className="w-5 h-5 text-ceramic-accent" />
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
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-ceramic-accent/5 to-ceramic-warning/5 rounded-xl">
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
                    sentiment.overall === 'positive' ? 'text-ceramic-success' :
                    sentiment.overall === 'negative' ? 'text-ceramic-error' :
                    'text-ceramic-text-secondary'
                  }`} />
                  <h4 className="font-bold text-ceramic-text-primary">Sentimento</h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-ceramic-success/10 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-ceramic-success">
                      {sentiment.breakdown.positive}%
                    </div>
                    <div className="text-xs text-ceramic-success">Positivo</div>
                  </div>
                  <div className="bg-ceramic-base rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-ceramic-text-secondary">
                      {sentiment.breakdown.neutral}%
                    </div>
                    <div className="text-xs text-ceramic-text-primary">Neutro</div>
                  </div>
                  <div className="bg-ceramic-error/10 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-ceramic-error">
                      {sentiment.breakdown.negative}%
                    </div>
                    <div className="text-xs text-ceramic-error">Negativo</div>
                  </div>
                </div>
              </div>
            )}

            {/* Topics */}
            {topics.length > 0 && (
              <div className="ceramic-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-ceramic-accent" />
                  <h4 className="font-bold text-ceramic-text-primary">Tópicos Comuns</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topics.slice(0, 8).map((topic, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                        topic.sentiment === 'pos'
                          ? 'bg-ceramic-success/10 text-ceramic-success'
                          : topic.sentiment === 'neg'
                          ? 'bg-ceramic-error/10 text-ceramic-error'
                          : 'bg-ceramic-cool text-ceramic-text-primary'
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
                  <Target className="w-5 h-5 text-ceramic-accent" />
                  <h4 className="font-bold text-ceramic-text-primary">Ações Sugeridas</h4>
                </div>
                <ul className="space-y-2">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold mt-0.5 ${
                        item.priority === 'high'
                          ? 'bg-ceramic-error/10 text-ceramic-error'
                          : item.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-ceramic-cool text-ceramic-text-primary'
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
                      <Heart className="w-4 h-4 text-ceramic-accent flex-shrink-0 mt-0.5" />
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
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-ceramic-accent to-ceramic-warning text-white font-bold hover:from-ceramic-accent/90 hover:to-ceramic-warning/90 transition-all"
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
