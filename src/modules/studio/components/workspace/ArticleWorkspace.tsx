/**
 * ArticleWorkspace - 4-stage workflow for article creation
 *
 * Stages: Pesquisa -> Outline -> Rascunho -> Revisao
 * Uses emerald accent to differentiate from podcast (amber) and video (blue).
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  ListOrdered,
  PenTool,
  CheckCircle,
} from 'lucide-react';
import type { StudioProject } from '../../types/studio';
import { ArticleOutlinePanel } from '../article';
import { ArticleEditor } from '../article';
import { ArticleSEOPanel } from '../article';
import { supabase } from '@/services/supabaseClient';

interface ArticleWorkspaceProps {
  project: StudioProject;
  onBack: () => void;
}

type ArticleStage = 'pesquisa' | 'outline' | 'rascunho' | 'revisao';

interface OutlineSection {
  heading: string;
  subpoints: string[];
  targetWords: number;
}

const STAGES: { key: ArticleStage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'pesquisa', label: 'Pesquisa', icon: Search },
  { key: 'outline', label: 'Outline', icon: ListOrdered },
  { key: 'rascunho', label: 'Rascunho', icon: PenTool },
  { key: 'revisao', label: 'Revisao', icon: CheckCircle },
];

export default function ArticleWorkspace({ project, onBack }: ArticleWorkspaceProps) {
  const [currentStage, setCurrentStage] = useState<ArticleStage>('pesquisa');
  const [researchNotes, setResearchNotes] = useState('');
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [content, setContent] = useState('');
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);
  const [seoScore, setSeoScore] = useState<number | undefined>(undefined);
  const [seoSuggestions, setSeoSuggestions] = useState<string[]>([]);
  const [seoDescription, setSeoDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const currentStageIndex = STAGES.findIndex(s => s.key === currentStage);

  const handleGenerateOutline = useCallback(async (theme: string) => {
    setIsGeneratingOutline(true);
    try {
      const { data, error } = await supabase.functions.invoke('studio-write-assist', {
        body: {
          projectId: project.id,
          action: 'generate_outline',
          theme,
          notes: researchNotes,
        },
      });
      if (error) throw error;
      if (data?.outline) {
        setOutline(data.outline);
      }
    } catch (err) {
      console.error('Error generating outline:', err);
    } finally {
      setIsGeneratingOutline(false);
    }
  }, [project.id, researchNotes]);

  const handleAIAssist = useCallback(async (instruction: string): Promise<string> => {
    setIsAssisting(true);
    try {
      const { data, error } = await supabase.functions.invoke('studio-write-assist', {
        body: {
          projectId: project.id,
          action: 'assist',
          instruction,
          content,
          outline,
        },
      });
      if (error) throw error;
      return data?.result || '';
    } catch (err) {
      console.error('Error with AI assist:', err);
      return '';
    } finally {
      setIsAssisting(false);
    }
  }, [project.id, content, outline]);

  return (
    <div className="flex flex-col h-screen bg-ceramic-base">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ceramic-border bg-ceramic-base">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors"
          aria-label="Voltar para biblioteca"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-ceramic-text-primary truncate">
            {project.title}
          </h1>
          <p className="text-xs text-ceramic-text-secondary">Artigo</p>
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="flex items-center px-4 py-2 border-b border-ceramic-border bg-ceramic-cool/50 overflow-x-auto">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.key === currentStage;
          const isPast = index < currentStageIndex;

          return (
            <React.Fragment key={stage.key}>
              {index > 0 && (
                <div className={`flex-shrink-0 w-8 h-px mx-1 ${
                  isPast ? 'bg-emerald-400' : 'bg-ceramic-border'
                }`} />
              )}
              <button
                onClick={() => setCurrentStage(stage.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500 text-white'
                    : isPast
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-ceramic-text-secondary hover:bg-ceramic-cool'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {stage.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Stage Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {currentStage === 'pesquisa' && (
              <div className="flex flex-col h-full p-6">
                <h2 className="text-lg font-bold text-ceramic-text-primary mb-1">
                  Pesquisa
                </h2>
                <p className="text-sm text-ceramic-text-secondary mb-4">
                  Anote ideias, referencias e pontos-chave para o artigo.
                </p>
                <textarea
                  value={researchNotes}
                  onChange={e => setResearchNotes(e.target.value)}
                  placeholder="Cole links, anote ideias, pontos principais do tema..."
                  className="flex-1 w-full resize-none rounded-xl border border-ceramic-border bg-ceramic-base p-4 text-sm text-ceramic-text-primary leading-relaxed placeholder:text-ceramic-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setCurrentStage('outline')}
                    className="px-5 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Proximo: Outline
                  </button>
                </div>
              </div>
            )}

            {currentStage === 'outline' && (
              <ArticleOutlinePanel
                outline={outline}
                onOutlineChange={setOutline}
                onGenerateOutline={handleGenerateOutline}
                isGenerating={isGeneratingOutline}
              />
            )}

            {currentStage === 'rascunho' && (
              <ArticleEditor
                content={content}
                onChange={setContent}
                outline={outline}
                onAIAssist={handleAIAssist}
                isAssisting={isAssisting}
              />
            )}

            {currentStage === 'revisao' && (
              <div className="flex h-full">
                {/* Preview */}
                <div className="flex-1 overflow-y-auto p-6 border-r border-ceramic-border">
                  <h2 className="text-lg font-bold text-ceramic-text-primary mb-4">
                    Pre-visualizacao
                  </h2>
                  {content ? (
                    <div className="prose prose-sm max-w-none text-ceramic-text-primary">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {content}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ceramic-text-secondary italic">
                      Nenhum conteudo escrito ainda. Volte a etapa "Rascunho" para escrever.
                    </p>
                  )}
                </div>
                {/* SEO Panel */}
                <div className="w-80 flex-shrink-0 overflow-hidden">
                  <ArticleSEOPanel
                    seoScore={seoScore}
                    seoSuggestions={seoSuggestions}
                    seoDescription={seoDescription}
                    tags={tags}
                    onDescriptionChange={setSeoDescription}
                    onTagsChange={setTags}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
