/**
 * ArticleOutlinePanel - AI-powered outline generation and editing
 *
 * Displays a structured article outline with numbered headings, subpoints,
 * and per-section word targets. Supports AI outline generation from a theme.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListOrdered,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GripVertical,
} from 'lucide-react';

interface OutlineSection {
  heading: string;
  subpoints: string[];
  targetWords: number;
}

interface ArticleOutlinePanelProps {
  outline: OutlineSection[];
  onOutlineChange: (outline: OutlineSection[]) => void;
  onGenerateOutline: (theme: string) => Promise<void>;
  isGenerating: boolean;
}

export default function ArticleOutlinePanel({
  outline,
  onOutlineChange,
  onGenerateOutline,
  isGenerating,
}: ArticleOutlinePanelProps) {
  const [theme, setTheme] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleGenerateOutline = async () => {
    if (!theme.trim() || isGenerating) return;
    await onGenerateOutline(theme.trim());
  };

  const addSection = () => {
    onOutlineChange([
      ...outline,
      { heading: '', subpoints: [], targetWords: 300 },
    ]);
    setExpandedSections(prev => new Set(prev).add(outline.length));
  };

  const removeSection = (index: number) => {
    onOutlineChange(outline.filter((_, i) => i !== index));
    setExpandedSections(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  };

  const updateHeading = (index: number, heading: string) => {
    const updated = [...outline];
    updated[index] = { ...updated[index], heading };
    onOutlineChange(updated);
  };

  const updateTargetWords = (index: number, targetWords: number) => {
    const updated = [...outline];
    updated[index] = { ...updated[index], targetWords };
    onOutlineChange(updated);
  };

  const addSubpoint = (sectionIndex: number) => {
    const updated = [...outline];
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      subpoints: [...updated[sectionIndex].subpoints, ''],
    };
    onOutlineChange(updated);
  };

  const updateSubpoint = (sectionIndex: number, subIndex: number, value: string) => {
    const updated = [...outline];
    const subpoints = [...updated[sectionIndex].subpoints];
    subpoints[subIndex] = value;
    updated[sectionIndex] = { ...updated[sectionIndex], subpoints };
    onOutlineChange(updated);
  };

  const removeSubpoint = (sectionIndex: number, subIndex: number) => {
    const updated = [...outline];
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      subpoints: updated[sectionIndex].subpoints.filter((_, i) => i !== subIndex),
    };
    onOutlineChange(updated);
  };

  const totalWords = outline.reduce((sum, s) => sum + s.targetWords, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Generate Outline Section */}
      <div className="p-4 border-b border-ceramic-border">
        <label className="block text-sm font-medium text-ceramic-text-secondary mb-2">
          Tema do artigo
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            placeholder="Ex: Impacto da IA na educação brasileira"
            className="flex-1 px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-base text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
            onKeyDown={e => e.key === 'Enter' && handleGenerateOutline()}
          />
          <button
            onClick={handleGenerateOutline}
            disabled={!theme.trim() || isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Gerando...' : 'Gerar Outline'}
          </button>
        </div>
      </div>

      {/* Outline List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {outline.map((section, index) => {
            const isExpanded = expandedSections.has(index);
            return (
              <motion.div
                key={index}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-ceramic-border bg-ceramic-base"
              >
                {/* Section Header */}
                <div className="flex items-center gap-2 p-3">
                  <GripVertical className="w-4 h-4 text-ceramic-text-secondary/40 flex-shrink-0 cursor-grab" />
                  <button
                    onClick={() => toggleSection(index)}
                    className="flex-shrink-0 text-ceramic-text-secondary hover:text-ceramic-text-primary"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />
                    }
                  </button>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={section.heading}
                    onChange={e => updateHeading(index, e.target.value)}
                    placeholder="Título da seção"
                    className="flex-1 bg-transparent text-sm font-medium text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none"
                  />
                  <span className="text-xs text-ceramic-text-secondary flex-shrink-0">
                    ~{section.targetWords}p
                  </span>
                  <button
                    onClick={() => removeSection(index)}
                    className="p-1 rounded text-ceramic-text-secondary/50 hover:text-ceramic-error hover:bg-ceramic-error/10 transition-colors"
                    aria-label={`Remover seção ${index + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2 border-t border-ceramic-border/50 pt-2">
                        {/* Word Target */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-ceramic-text-secondary">Palavras alvo:</label>
                          <input
                            type="number"
                            value={section.targetWords}
                            onChange={e => updateTargetWords(index, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 rounded border border-ceramic-border bg-ceramic-cool text-xs text-ceramic-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                            min={0}
                            step={50}
                          />
                        </div>

                        {/* Subpoints */}
                        {section.subpoints.map((sub, subIdx) => (
                          <div key={subIdx} className="flex items-center gap-2 pl-4">
                            <span className="text-xs text-ceramic-text-secondary/60">-</span>
                            <input
                              type="text"
                              value={sub}
                              onChange={e => updateSubpoint(index, subIdx, e.target.value)}
                              placeholder="Subponto"
                              className="flex-1 bg-transparent text-xs text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none"
                            />
                            <button
                              onClick={() => removeSubpoint(index, subIdx)}
                              className="p-0.5 text-ceramic-text-secondary/40 hover:text-ceramic-error"
                              aria-label="Remover subponto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => addSubpoint(index)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 pl-4"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar subponto
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {outline.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListOrdered className="w-10 h-10 text-ceramic-text-secondary/30 mb-3" />
            <p className="text-sm text-ceramic-text-secondary">
              Nenhuma seção no outline ainda.
            </p>
            <p className="text-xs text-ceramic-text-secondary/60 mt-1">
              Use o campo acima para gerar automaticamente ou adicione manualmente.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-ceramic-border flex items-center justify-between">
        <button
          onClick={addSection}
          className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Adicionar seção
        </button>
        <span className="text-xs text-ceramic-text-secondary">
          {outline.length} secoes | ~{totalWords.toLocaleString('pt-BR')} palavras
        </span>
      </div>
    </div>
  );
}
