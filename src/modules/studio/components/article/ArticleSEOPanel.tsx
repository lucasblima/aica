/**
 * ArticleSEOPanel - SEO score, suggestions, meta description, and tags
 *
 * Displays SEO analysis results with actionable suggestions, meta description
 * editing, and tag management.
 */

import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Circle,
  Plus,
  X,
  Tag,
} from 'lucide-react';

interface ArticleSEOPanelProps {
  seoScore?: number;
  seoSuggestions: string[];
  seoDescription: string;
  tags: string[];
  onDescriptionChange: (desc: string) => void;
  onTagsChange: (tags: string[]) => void;
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
      {/* SEO Score */}
      <div className="flex items-center gap-6">
        <ScoreCircle score={seoScore ?? 0} />
        <div>
          <h3 className="text-lg font-bold text-ceramic-text-primary">
            Score SEO
          </h3>
          <p className="text-sm text-ceramic-text-secondary mt-1">
            {seoScore == null
              ? 'Analise SEO nao executada ainda.'
              : seoScore >= 70
                ? 'Bom! O artigo esta otimizado.'
                : seoScore >= 40
                  ? 'Regular. Veja as sugestoes abaixo.'
                  : 'Precisa de melhorias. Siga as sugestoes.'
            }
          </p>
        </div>
      </div>

      {/* Suggestions */}
      {seoSuggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-ceramic-text-primary mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
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
                >
                  {isChecked ? (
                    <CheckCircle2 className="w-4 h-4 text-ceramic-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-ceramic-text-secondary/40 flex-shrink-0 mt-0.5" />
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

      {/* Meta Description */}
      <div>
        <h4 className="text-sm font-bold text-ceramic-text-primary mb-2">
          Meta descricao
        </h4>
        <div className="relative">
          <textarea
            value={seoDescription}
            onChange={e => {
              if (e.target.value.length <= 160) {
                onDescriptionChange(e.target.value);
              }
            }}
            placeholder="Descricao para mecanismos de busca (max 160 caracteres)"
            className="w-full h-24 resize-none rounded-lg border border-ceramic-border bg-ceramic-base p-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
          <Tag className="w-4 h-4" />
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
          />
          <button
            onClick={addTag}
            disabled={!newTag.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-ceramic-border text-sm text-ceramic-text-primary hover:bg-ceramic-cool transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
