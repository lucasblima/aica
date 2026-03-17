/**
 * ArticleSEOPanel - SEO score, suggestions, meta description, and tags
 *
 * Displays SEO analysis results with actionable suggestions, meta description
 * editing, and tag management. Supports manual and auto-analysis via
 * the studio-seo-analyze Edge Function.
 */

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Plus,
  X,
  Tag,
  Loader2,
  AlertCircle,
  BarChart3,
  BookOpen,
  Link2,
} from 'lucide-react';
import type { SEOReadability, SEOHeaderStructure } from '../../types/studio';

interface ArticleSEOPanelProps {
  seoScore?: number;
  seoSuggestions: string[];
  seoDescription: string;
  tags: string[];
  onDescriptionChange: (desc: string) => void;
  onTagsChange: (tags: string[]) => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  analyzeError?: string | null;
  autoAnalyze?: boolean;
  onAutoAnalyzeChange?: (enabled: boolean) => void;
  readability?: SEOReadability | null;
  keywordDensity?: Record<string, number> | null;
  headerStructure?: SEOHeaderStructure | null;
  internalLinkSuggestions?: string[];
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let color: string;
  if (score < 40) color = 'text-ceramic-error';
  else if (score < 70) color = 'text-amber-500';
  else color = 'text-ceramic-success';

  let strokeColor: string;
  if (score < 40) strokeColor = 'stroke-ceramic-error';
  else if (score < 70) strokeColor = 'stroke-amber-500';
  else strokeColor = 'stroke-ceramic-success';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-ceramic-border"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={strokeColor}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <span className={`absolute text-xl font-bold ${color}`}>
        {score}
      </span>
    </div>
  );
}

export default function ArticleSEOPanel({
  seoScore,
  seoSuggestions,
  seoDescription,
  tags,
  onDescriptionChange,
  onTagsChange,
  onAnalyze,
  isAnalyzing = false,
  analyzeError = null,
  autoAnalyze = false,
  onAutoAnalyzeChange,
  readability,
  keywordDensity,
  headerStructure,
  internalLinkSuggestions,
}: ArticleSEOPanelProps) {
  const [newTag, setNewTag] = useState('');
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<number>>(new Set());

  const toggleSuggestion = (index: number) => {
    setCheckedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* SEO Score + Analyze Button */}
      <div className="flex items-center gap-6">
        <ScoreCircle score={seoScore ?? 0} />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-ceramic-text-primary">
            Score SEO
          </h3>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            {seoScore == null
              ? 'Análise SEO não executada ainda.'
              : seoScore >= 70
                ? 'Bom! O artigo esta otimizado.'
                : seoScore >= 40
                  ? 'Regular. Veja as sugestoes abaixo.'
                  : 'Precisa de melhorias. Siga as sugestoes.'
            }
          </p>
          {onAnalyze && (
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Analisar SEO do artigo"
            >
              {isAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {isAnalyzing ? 'Analisando...' : 'Analisar SEO'}
            </button>
          )}
        </div>
      </div>

      {/* Auto-analyze checkbox */}
      {onAutoAnalyzeChange && (
        <label className="flex items-center gap-2 text-xs text-ceramic-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoAnalyze}
            onChange={e => onAutoAnalyzeChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-ceramic-border text-emerald-500 focus:ring-emerald-500/30"
          />
          <span>Auto-análise (analisa ao editar, com atraso de 5s)</span>
        </label>
      )}

      {/* Analysis Error */}
      {analyzeError && (
        <div className="p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-ceramic-error">{analyzeError}</p>
        </div>
      )}

      {/* Readability Section */}
      {readability && (
        <div>
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Legibilidade
          </h4>
          <div className="p-3 rounded-lg border border-ceramic-border bg-ceramic-base">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-semibold ${
                readability.level === 'facil' ? 'text-ceramic-success' :
                readability.level === 'medio' ? 'text-amber-500' :
                'text-ceramic-error'
              }`}>
                {readability.level === 'facil' ? 'Facil' :
                 readability.level === 'medio' ? 'Medio' :
                 'Dificil'} ({readability.score}/100)
              </span>
            </div>
            <p className="text-xs text-ceramic-text-secondary">{readability.details}</p>
          </div>
        </div>
      )}

      {/* Keyword Density */}
      {keywordDensity && Object.keys(keywordDensity).length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            Densidade de palavras-chave
          </h4>
          <div className="space-y-1.5">
            {Object.entries(keywordDensity)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([keyword, density]) => (
                <div key={keyword} className="flex items-center gap-2">
                  <span className="text-xs text-ceramic-text-primary font-medium truncate flex-1 min-w-0">
                    {keyword}
                  </span>
                  <div className="w-20 h-1.5 bg-ceramic-cool rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, density * 20)}%` }}
                    />
                  </div>
                  <span className="text-xs text-ceramic-text-secondary flex-shrink-0 w-10 text-right">
                    {typeof density === 'number' ? density.toFixed(1) : density}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Header Structure */}
      {headerStructure && (
        <div>
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-2">
            Estrutura de cabecalhos
          </h4>
          <div className="flex gap-3 mb-2">
            {['h1', 'h2', 'h3'].map(h => (
              <div key={h} className="text-center px-3 py-1.5 rounded-lg bg-ceramic-cool">
                <span className="text-xs font-bold text-ceramic-text-primary uppercase">{h}</span>
                <p className="text-sm font-semibold text-ceramic-text-primary">
                  {headerStructure[h as 'h1' | 'h2' | 'h3']}
                </p>
              </div>
            ))}
          </div>
          {headerStructure.suggestions.length > 0 && (
            <ul className="space-y-1">
              {headerStructure.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-ceramic-text-secondary flex items-start gap-1">
                  <span className="text-ceramic-warning mt-0.5">-</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Suggestions */}
      {seoSuggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" aria-hidden="true" />
            Sugestoes de otimizacao
          </h4>
          <div className="space-y-2">
            {seoSuggestions.map((suggestion, index) => {
              const isChecked = checkedSuggestions.has(index);
              return (
                <button
                  key={index}
                  onClick={() => toggleSuggestion(index)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                    isChecked
                      ? 'border-ceramic-success/30 bg-ceramic-success/5'
                      : 'border-ceramic-border bg-ceramic-base hover:bg-ceramic-cool'
                  }`}
                  aria-label={`${isChecked ? 'Desmarcar' : 'Marcar'} sugestão: ${suggestion}`}
                >
                  {isChecked ? (
                    <CheckCircle2 className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <Circle className="w-4 h-4 text-ceramic-text-secondary/40 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span className={`text-sm ${isChecked ? 'line-through text-ceramic-text-secondary' : 'text-ceramic-text-primary'}`}>
                    {suggestion}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Internal Link Suggestions */}
      {internalLinkSuggestions && internalLinkSuggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4" aria-hidden="true" />
            Sugestoes de links internos
          </h4>
          <ul className="space-y-1">
            {internalLinkSuggestions.map((suggestion, i) => (
              <li key={i} className="text-xs text-ceramic-text-secondary flex items-start gap-1.5">
                <Link2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta Description */}
      <div>
        <h4 className="text-sm font-bold text-ceramic-text-primary mb-2">
          Meta descrição
        </h4>
        <div className="relative">
          <textarea
            value={seoDescription}
            onChange={e => {
              if (e.target.value.length <= 160) {
                onDescriptionChange(e.target.value);
              }
            }}
            placeholder="Descrição para mecanismos de busca (max 160 caracteres)"
            className="w-full h-24 resize-none rounded-lg border border-ceramic-border bg-ceramic-base p-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            aria-label="Meta descrição para SEO"
          />
          <span className={`absolute bottom-2 right-2 text-xs ${
            seoDescription.length > 150 ? 'text-ceramic-error' : 'text-ceramic-text-secondary/60'
          }`}>
            {seoDescription.length}/160
          </span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <h4 className="text-sm font-bold text-ceramic-text-primary mb-2 flex items-center gap-2">
          <Tag className="w-4 h-4" aria-hidden="true" />
          Tags
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-emerald-900"
                aria-label={`Remover tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <span className="text-xs text-ceramic-text-secondary/60">
              Nenhuma tag adicionada.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="Nova tag"
            className="flex-1 px-3 py-1.5 rounded-lg border border-ceramic-border bg-ceramic-base text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            onKeyDown={e => e.key === 'Enter' && addTag()}
            aria-label="Nova tag"
          />
          <button
            onClick={addTag}
            disabled={!newTag.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-ceramic-border text-sm text-ceramic-text-primary hover:bg-ceramic-cool transition-colors disabled:opacity-50"
            aria-label="Adicionar tag"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
