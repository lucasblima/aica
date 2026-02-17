/**
 * ArticleEditor - Simple textarea-based article editor with AI assist
 *
 * MVP editor with word count, collapsible outline reference,
 * and a floating AI assistant button.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
} from 'lucide-react';

interface OutlineSection {
  heading: string;
  subpoints: string[];
  targetWords: number;
}

interface ArticleEditorProps {
  content: string;
  onChange: (content: string) => void;
  outline: OutlineSection[];
  onAIAssist: (instruction: string) => Promise<string>;
  isAssisting: boolean;
}

export default function ArticleEditor({
  content,
  onChange,
  outline,
  onAIAssist,
  isAssisting,
}: ArticleEditorProps) {
  const [showOutline, setShowOutline] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const totalTargetWords = outline.reduce((sum, s) => sum + s.targetWords, 0);

  const handleContentChange = useCallback((value: string) => {
    onChange(value);
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('saved'), 1500);
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleAIAssist = async () => {
    if (!aiInstruction.trim() || isAssisting) return;
    const result = await onAIAssist(aiInstruction.trim());
    if (result) {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = content.substring(0, start);
        const after = content.substring(end);
        handleContentChange(before + result + after);
      } else {
        handleContentChange(content + '\n\n' + result);
      }
    }
    setAiInstruction('');
    setShowAssistant(false);
  };

  return (
    <div className="flex h-full">
      {/* Outline Reference Panel */}
      <AnimatePresence>
        {showOutline && outline.length > 0 && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-ceramic-border bg-ceramic-cool overflow-hidden flex-shrink-0"
          >
            <div className="p-3 w-[260px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ceramic-text-secondary">
                  Outline
                </h3>
                <button
                  onClick={() => setShowOutline(false)}
                  className="p-1 rounded text-ceramic-text-secondary hover:bg-ceramic-border/50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {outline.map((section, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-medium text-ceramic-text-primary">
                      {i + 1}. {section.heading || 'Sem titulo'}
                    </p>
                    {section.subpoints.length > 0 && (
                      <ul className="mt-0.5 ml-3 space-y-0.5">
                        {section.subpoints.map((sub, j) => (
                          <li key={j} className="text-ceramic-text-secondary">
                            - {sub}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-ceramic-text-secondary/60 mt-0.5">
                      ~{section.targetWords}p
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-ceramic-border bg-ceramic-base">
          <div className="flex items-center gap-2">
            {!showOutline && outline.length > 0 && (
              <button
                onClick={() => setShowOutline(true)}
                className="inline-flex items-center gap-1 text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                Outline
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-ceramic-text-secondary">
            {/* Save Status */}
            <span className="flex items-center gap-1">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando...
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3 h-3 text-ceramic-success" />
                  Salvo
                </>
              )}
            </span>
            {/* Word Count */}
            <span>
              {wordCount.toLocaleString('pt-BR')} palavras
              {totalTargetWords > 0 && (
                <span className="text-ceramic-text-secondary/60">
                  {' '}/ {totalTargetWords.toLocaleString('pt-BR')} alvo
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Comece a escrever seu artigo aqui..."
            className="w-full h-full resize-none p-6 bg-ceramic-base text-ceramic-text-primary text-sm leading-relaxed placeholder:text-ceramic-text-secondary/40 focus:outline-none"
            spellCheck
          />

          {/* Floating AI Assistant Button */}
          <div className="absolute bottom-4 right-4">
            <AnimatePresence>
              {showAssistant && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-12 right-0 w-72 rounded-xl border border-ceramic-border bg-ceramic-base shadow-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-ceramic-text-primary">
                      Assistente IA
                    </span>
                    <button
                      onClick={() => setShowAssistant(false)}
                      className="p-0.5 text-ceramic-text-secondary hover:text-ceramic-text-primary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={aiInstruction}
                    onChange={e => setAiInstruction(e.target.value)}
                    placeholder="Ex: Expanda o paragrafo sobre IA generativa..."
                    className="w-full h-20 resize-none rounded-lg border border-ceramic-border bg-ceramic-cool p-2 text-xs text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAIAssist();
                      }
                    }}
                  />
                  <button
                    onClick={handleAIAssist}
                    disabled={!aiInstruction.trim() || isAssisting}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAssisting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {isAssisting ? 'Gerando...' : 'Aplicar'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setShowAssistant(!showAssistant)}
              className="p-3 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors"
              aria-label="Assistente IA"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
