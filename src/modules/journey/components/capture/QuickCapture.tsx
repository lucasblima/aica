/**
 * QuickCapture Component
 * Minimalist moment capture with real-time AI analysis
 *
 * Philosophy: "Peça o mínimo, entregue o máximo"
 * - 1 field (auto-focused)
 * - Real-time AI suggestions
 * - Instant insights post-save
 * - Optional advanced features (expandable)
 */

import React, { useState, useEffect, useRef } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { motion, AnimatePresence } from 'framer-motion';

const log = createNamespacedLogger('QuickCapture');
import {
  SparklesIcon,
  LightBulbIcon,
  MicrophoneIcon,
  TagIcon,
} from '@heroicons/react/24/solid';
import { CreateMomentInput } from '../../types/moment';
import { analyzeContentRealtime } from '../../services/aiAnalysisService';
import { AudioRecorder } from './AudioRecorder';
import { TagInput } from './TagInput';

interface QuickCaptureProps {
  onSubmit: (moment: CreateMomentInput) => Promise<void>;
  onCancel?: () => void;
}

interface AISuggestion {
  type: 'reflection' | 'question' | 'pattern';
  message: string;
  icon?: string;
}

export function QuickCapture({ onSubmit, onCancel }: QuickCaptureProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Advanced features (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Real-time AI analysis (debounced 3s)
  useEffect(() => {
    if (content.trim().length < 20) {
      setAiSuggestion(null);
      return;
    }

    // Clear previous timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Set new timeout
    analysisTimeoutRef.current = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const suggestion = await analyzeContentRealtime(content);
        setAiSuggestion(suggestion);
      } catch (error) {
        log.error('Error analyzing content:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 3000);

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      textareaRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        type: audioBlob ? 'both' : 'text',
        content: content.trim(),
        audio_blob: audioBlob || undefined,
        tags,
      });

      // Reset form
      setContent('');
      setAudioBlob(null);
      setTags([]);
      setShowAdvanced(false);
      setAiSuggestion(null);
    } catch (error) {
      log.error('Error submitting moment:', error);
      alert('Erro ao salvar momento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="ceramic-card p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="ceramic-concave p-2 rounded-lg">
            <SparklesIcon className="h-5 w-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-bold text-ceramic-text-primary">
            💭 O que está te movendo agora?
          </h3>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-ceramic-text-tertiary">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            Analisando...
          </div>
        )}
      </div>

      {/* Main Text Area - Auto-focused */}
      <div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Comece a escrever... A IA vai te ajudar a refletir."
          rows={6}
          className="w-full px-4 py-3 border-2 border-ceramic-text-secondary/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none resize-none transition-all text-base"
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-ceramic-text-tertiary">
            {content.length} caracteres • ⌘/Ctrl + Enter para salvar
          </p>
        </div>
      </div>

      {/* AI Suggestion (appears after 3s of no typing) */}
      <AnimatePresence>
        {aiSuggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="ceramic-tray rounded-lg p-4 border-2 border-purple-500/20 bg-purple-500/5"
          >
            <div className="flex items-start gap-3">
              <LightBulbIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">
                  {aiSuggestion.type === 'reflection' && '💭 Reflexão sugerida'}
                  {aiSuggestion.type === 'question' && '🤔 Pergunta para aprofundar'}
                  {aiSuggestion.type === 'pattern' && '📊 Padrão identificado'}
                </p>
                <p className="text-sm text-ceramic-text-secondary">
                  {aiSuggestion.message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Features Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-ceramic-text-secondary/10">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          {showAdvanced ? (
            <>
              <span>− Menos opções</span>
            </>
          ) : (
            <>
              <MicrophoneIcon className="w-4 h-4" />
              <TagIcon className="w-4 h-4" />
              <span>+ Adicionar áudio/tags</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="ceramic-concave px-4 py-2 text-sm font-medium text-ceramic-text-primary hover:scale-95 active:scale-90 transition-all"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="ceramic-convex px-6 py-2 text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-600 text-white hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Salvar (+5 CP)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Features (Collapsed by default) */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 pt-4 border-t border-ceramic-text-secondary/10"
          >
            {/* Audio Recorder */}
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                <MicrophoneIcon className="w-4 h-4 inline mr-1" />
                Áudio (opcional)
              </label>
              <AudioRecorder
                onRecordingComplete={(blob) => setAudioBlob(blob)}
                maxDuration={180}
              />
              {audioBlob && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✓ Áudio gravado ({(audioBlob.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
                <TagIcon className="w-4 h-4 inline mr-1" />
                Tags (opcional)
              </label>
              <TagInput value={tags} onChange={setTags} maxTags={5} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Footer */}
      <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
        <SparklesIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
        <p className="text-xs text-purple-900 dark:text-purple-300">
          Seu momento será indexado com IA para descobrir padrões e insights.
        </p>
      </div>
    </motion.form>
  );
}
