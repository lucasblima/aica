/**
 * PautaGeneratorPanel Component
 *
 * Painel de geracao de pautas estilo NotebookLM com:
 * - Input de tema/topico
 * - Adicao de fontes personalizadas
 * - Geracao com IA usando Deep Research
 * - Preview e edicao do conteudo gerado
 * - Feedback de progresso em tempo real
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  FileText,
  Link as LinkIcon,
  Upload,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wand2,
  BookOpen,
  MessageCircle,
  Target,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  PlusCircle,
  Clock,
  Zap
} from 'lucide-react'
import {
  pautaGeneratorService,
  type GeneratedPauta,
  type PautaSource,
  type PautaStyle,
  type PautaQuestion
} from '../services/pautaGeneratorService'
import { pautaPersistenceService } from '../services/pautaPersistenceService'
import type { Dossier, Topic, TopicCategory } from '../types'
import { supabase } from '@/services/supabaseClient'

// =====================================================
// TYPES
// =====================================================

interface PautaGeneratorPanelProps {
  guestName: string
  initialTheme?: string
  projectId?: string
  onPautaGenerated: (
    dossier: Dossier,
    topics: Topic[],
    categories: TopicCategory[]
  ) => void
  onClose?: () => void
}

interface SourceItem {
  id: string
  type: 'url' | 'text' | 'file'
  content: string
  title?: string
}

// =====================================================
// COMPONENT
// =====================================================

export const PautaGeneratorPanel: React.FC<PautaGeneratorPanelProps> = ({
  guestName,
  initialTheme = '',
  projectId,
  onPautaGenerated,
  onClose
}) => {
  // Form state
  const [theme, setTheme] = useState(initialTheme)
  const [additionalContext, setAdditionalContext] = useState('')
  const [duration, setDuration] = useState(60)
  const [style, setStyle] = useState<PautaStyle>({
    tone: 'casual',
    depth: 'medium'
  })

  // Sources state
  const [sources, setSources] = useState<SourceItem[]>([])
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceText, setNewSourceText] = useState('')
  const [showSourcesSection, setShowSourcesSection] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [generatedPauta, setGeneratedPauta] = useState<GeneratedPauta | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [activePreviewTab, setActivePreviewTab] = useState<'outline' | 'questions' | 'sources'>('outline')

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleAddUrlSource = () => {
    if (!newSourceUrl.trim()) return

    const newSource: SourceItem = {
      id: `source-${Date.now()}`,
      type: 'url',
      content: newSourceUrl.trim(),
      title: new URL(newSourceUrl.trim()).hostname
    }

    setSources(prev => [...prev, newSource])
    setNewSourceUrl('')
  }

  const handleAddTextSource = () => {
    if (!newSourceText.trim()) return

    const newSource: SourceItem = {
      id: `source-${Date.now()}`,
      type: 'text',
      content: newSourceText.trim(),
      title: `Texto ${sources.filter(s => s.type === 'text').length + 1}`
    }

    setSources(prev => [...prev, newSource])
    setNewSourceText('')
  }

  const handleRemoveSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id))
  }

  const handleGenerate = useCallback(async () => {
    if (!guestName.trim()) {
      setError('Nome do convidado e obrigatorio')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress(0)
    setProgressMessage('Iniciando pesquisa...')

    try {
      const pautaSources: PautaSource[] = sources.map(s => ({
        type: s.type,
        content: s.content,
        title: s.title
      }))

      const pauta = await pautaGeneratorService.generateCompletePauta(
        {
          guestName,
          theme: theme || undefined,
          context: additionalContext || undefined,
          sources: pautaSources.length > 0 ? pautaSources : undefined,
          style,
          duration
        },
        (step, prog) => {
          setProgressMessage(step)
          setProgress(prog)
        }
      )

      setGeneratedPauta(pauta)
      setShowPreview(true)
    } catch (err) {
      console.error('Pauta generation failed:', err)
      setError(err instanceof Error ? err.message : 'Erro ao gerar pauta')
    } finally {
      setIsGenerating(false)
    }
  }, [guestName, theme, additionalContext, sources, style, duration])

  const handleApplyPauta = async () => {
    if (!generatedPauta || !projectId) return

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Usuário não autenticado')
        return
      }

      // Save pauta to database
      const saveResult = await pautaPersistenceService.savePauta(
        projectId,
        user.id,
        generatedPauta,
        guestName,
        theme || generatedPauta.outline.title,
        additionalContext,
        style.tone,
        style.depth,
        style.focusAreas
      )

      if (!saveResult.success) {
        console.error('Failed to save pauta:', saveResult.error)
        // Continue mesmo se falhar - nao bloqueia aplicacao
      }

      // Convert to Dossier format
      const dossier = pautaGeneratorService.pautaToDossier(
        generatedPauta,
        guestName,
        theme || generatedPauta.outline.title
      )

      // Convert questions to topics
      const { topics, categories } = pautaGeneratorService.questionsToTopics(
        generatedPauta.questions,
        projectId || ''
      )

      // Add ice breakers as topics
      const iceBreakersAsTopics: Topic[] = generatedPauta.iceBreakers.map((ib, idx) => ({
        id: `ice-${Date.now()}-${idx}`,
        text: ib,
        completed: false,
        order: idx,
        archived: false,
        categoryId: 'quebra-gelo'
      }))

      // Ensure quebra-gelo category exists
      if (!categories.find(c => c.id === 'quebra-gelo')) {
        categories.push({
          id: 'quebra-gelo',
          name: 'Quebra-Gelo',
          color: '#06B6D4',
          episode_id: projectId || ''
        })
      }

      onPautaGenerated(dossier, [...topics, ...iceBreakersAsTopics], categories)
    } catch (err) {
      console.error('Error applying pauta:', err)
      setError(err instanceof Error ? err.message : 'Erro ao aplicar pauta')
    }
  }

  const handleRegenerate = () => {
    setGeneratedPauta(null)
    setShowPreview(false)
    handleGenerate()
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[#E5E3DC] overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-[#E5E3DC] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-ceramic-text-primary">
              Gerador de Pauta com IA
            </h2>
            <p className="text-xs text-ceramic-text-secondary">
              Estilo NotebookLM - Deep Research
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5 text-ceramic-text-secondary" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Theme Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-ceramic-text-secondary flex items-center gap-2">
            <Target className="w-4 h-4" />
            Tema da Entrevista
          </label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder={`Ex: A trajetoria de ${guestName}, Projetos atuais...`}
            className="w-full px-4 py-3 rounded-xl bg-[#F7F6F4] text-ceramic-text-primary placeholder-ceramic-text-tertiary border border-[#E5E3DC] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
          />
        </div>

        {/* Additional Context */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-ceramic-text-secondary flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Contexto Adicional (opcional)
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Adicione informacoes especificas, angulos que deseja explorar, ou perguntas que nao podem faltar..."
            className="w-full px-4 py-3 rounded-xl bg-[#F7F6F4] text-ceramic-text-primary placeholder-ceramic-text-tertiary border border-[#E5E3DC] focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all resize-none h-20"
          />
        </div>

        {/* Style Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-ceramic-text-secondary">
              Tom da Entrevista
            </label>
            <select
              value={style.tone}
              onChange={(e) => setStyle(prev => ({ ...prev, tone: e.target.value as PautaStyle['tone'] }))}
              className="w-full px-3 py-2 rounded-xl bg-[#F7F6F4] text-ceramic-text-primary border border-[#E5E3DC] focus:border-amber-400 outline-none"
            >
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="investigativo">Investigativo</option>
              <option value="humano">Humano/Emocional</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-ceramic-text-secondary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duracao (min)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              min={15}
              max={180}
              className="w-full px-3 py-2 rounded-xl bg-[#F7F6F4] text-ceramic-text-primary border border-[#E5E3DC] focus:border-amber-400 outline-none"
            />
          </div>
        </div>

        {/* Sources Section */}
        <div className="border border-[#E5E3DC] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSourcesSection(!showSourcesSection)}
            className="w-full p-3 flex items-center justify-between bg-[#F7F6F4] hover:bg-[#EBE9E4] transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-ceramic-text-secondary">
              <BookOpen className="w-4 h-4" />
              Fontes Personalizadas
              {sources.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">
                  {sources.length}
                </span>
              )}
            </span>
            {showSourcesSection ? (
              <ChevronUp className="w-4 h-4 text-ceramic-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
            )}
          </button>

          <AnimatePresence>
            {showSourcesSection && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-3 bg-white">
                  {/* URL Source */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-tertiary" />
                      <input
                        type="url"
                        value={newSourceUrl}
                        onChange={(e) => setNewSourceUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddUrlSource()}
                        placeholder="https://exemplo.com/artigo"
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#F7F6F4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary border border-[#E5E3DC] focus:border-amber-400 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleAddUrlSource}
                      disabled={!newSourceUrl.trim()}
                      className="px-3 py-2 rounded-lg bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Text Source */}
                  <div className="space-y-2">
                    <textarea
                      value={newSourceText}
                      onChange={(e) => setNewSourceText(e.target.value)}
                      placeholder="Cole aqui texto de documentos, entrevistas anteriores, etc..."
                      className="w-full px-3 py-2 rounded-lg bg-[#F7F6F4] text-sm text-ceramic-text-primary placeholder-ceramic-text-tertiary border border-[#E5E3DC] focus:border-amber-400 outline-none resize-none h-16"
                    />
                    {newSourceText.trim() && (
                      <button
                        onClick={handleAddTextSource}
                        className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Adicionar texto como fonte
                      </button>
                    )}
                  </div>

                  {/* Source List */}
                  {sources.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#E5E3DC]">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#F7F6F4] group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {source.type === 'url' ? (
                              <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : source.type === 'text' ? (
                              <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <Upload className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-ceramic-text-primary truncate">
                              {source.title || source.content.substring(0, 50)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveSource(source.id)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Progress Indicator */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-ceramic-text-secondary flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  {progressMessage}
                </span>
                <span className="text-amber-600 font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-[#F7F6F4] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate Button */}
        {!showPreview && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !guestName.trim()}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando Pauta...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Gerar Pauta com IA
              </>
            )}
          </button>
        )}

        {/* Preview Section */}
        <AnimatePresence>
          {showPreview && generatedPauta && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 border-t border-[#E5E3DC] pt-4"
            >
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-ceramic-text-primary">
                    Pauta Gerada
                  </span>
                  <span className="text-xs text-ceramic-text-tertiary">
                    Confianca: {generatedPauta.confidenceScore}%
                  </span>
                </div>
                <button
                  onClick={handleRegenerate}
                  className="p-2 rounded-lg hover:bg-[#F7F6F4] transition-colors"
                  title="Regenerar"
                >
                  <RefreshCw className="w-4 h-4 text-ceramic-text-secondary" />
                </button>
              </div>

              {/* Preview Tabs */}
              <div className="flex gap-1 p-1 bg-[#F7F6F4] rounded-lg">
                {[
                  { id: 'outline', label: 'Estrutura', icon: FileText },
                  { id: 'questions', label: `Perguntas (${generatedPauta.questions.length})`, icon: MessageCircle },
                  { id: 'sources', label: `Fontes (${generatedPauta.sources?.length || 0})`, icon: BookOpen }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePreviewTab(tab.id as any)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                      activePreviewTab === tab.id
                        ? 'bg-white text-ceramic-text-primary shadow-sm'
                        : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Preview Content */}
              <div className="bg-[#F7F6F4] rounded-xl p-4 max-h-64 overflow-y-auto">
                {activePreviewTab === 'outline' && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-ceramic-text-primary">
                      {generatedPauta.outline.title}
                    </h3>

                    <div className="space-y-2">
                      {/* Introduction */}
                      <div className="p-2 rounded-lg bg-white border border-[#E5E3DC]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-green-600">
                            {generatedPauta.outline.introduction.title}
                          </span>
                          <span className="text-xs text-ceramic-text-tertiary">
                            {generatedPauta.outline.introduction.duration} min
                          </span>
                        </div>
                        <p className="text-xs text-ceramic-text-secondary">
                          {generatedPauta.outline.introduction.description}
                        </p>
                      </div>

                      {/* Main Sections */}
                      {generatedPauta.outline.mainSections.map((section, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-white border border-[#E5E3DC]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-blue-600">
                              {section.title}
                            </span>
                            <span className="text-xs text-ceramic-text-tertiary">
                              {section.duration} min
                            </span>
                          </div>
                          <p className="text-xs text-ceramic-text-secondary">
                            {section.description}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {section.keyPoints.slice(0, 3).map((point, pidx) => (
                              <span
                                key={pidx}
                                className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                              >
                                {point}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Conclusion */}
                      <div className="p-2 rounded-lg bg-white border border-[#E5E3DC]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-amber-600">
                            {generatedPauta.outline.conclusion.title}
                          </span>
                          <span className="text-xs text-ceramic-text-tertiary">
                            {generatedPauta.outline.conclusion.duration} min
                          </span>
                        </div>
                        <p className="text-xs text-ceramic-text-secondary">
                          {generatedPauta.outline.conclusion.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'questions' && (
                  <div className="space-y-2">
                    {generatedPauta.questions.slice(0, 10).map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-2 rounded-lg bg-white border border-[#E5E3DC]"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            q.category === 'abertura' ? 'bg-green-100 text-green-700' :
                            q.category === 'desenvolvimento' ? 'bg-blue-100 text-blue-700' :
                            q.category === 'aprofundamento' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {q.category}
                          </span>
                          <p className="text-sm text-ceramic-text-primary flex-1">
                            {q.text}
                          </p>
                        </div>
                        {q.followUps && q.followUps.length > 0 && (
                          <div className="mt-1 ml-6 text-xs text-ceramic-text-tertiary">
                            Follow-ups: {q.followUps.join(' | ')}
                          </div>
                        )}
                      </div>
                    ))}
                    {generatedPauta.questions.length > 10 && (
                      <p className="text-xs text-center text-ceramic-text-tertiary">
                        +{generatedPauta.questions.length - 10} perguntas adicionais
                      </p>
                    )}
                  </div>
                )}

                {activePreviewTab === 'sources' && (
                  <div className="space-y-2">
                    {generatedPauta.sources && generatedPauta.sources.length > 0 ? (
                      generatedPauta.sources.map((source) => (
                        <div
                          key={source.id}
                          className="p-2 rounded-lg bg-white border border-[#E5E3DC]"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-ceramic-text-primary">
                              [{source.id}] {source.title}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              source.reliability === 'high' ? 'bg-green-100 text-green-700' :
                              source.reliability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {source.reliability}
                            </span>
                          </div>
                          <p className="text-xs text-ceramic-text-secondary">
                            {source.snippet}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-ceramic-text-secondary text-center py-4">
                        Nenhuma fonte externa encontrada
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#E5E3DC] text-ceramic-text-secondary font-medium hover:bg-[#F7F6F4] transition-colors"
                >
                  Editar Parametros
                </button>
                <button
                  onClick={handleApplyPauta}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Aplicar Pauta
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default PautaGeneratorPanel
