import React from 'react';
import { Sparkles, Search, MessageCircle, Plus, Loader2, RefreshCw } from 'lucide-react';

interface ResearchToolbarProps {
  onGenerateDossier: () => void;
  onDeepResearch: () => void;
  onAnalyzeGaps: () => void;
  onToggleChat: () => void;
  onAddSource: () => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
  hasDossier: boolean;
  chatOpen: boolean;
}

export function ResearchToolbar({
  onGenerateDossier, onDeepResearch, onAnalyzeGaps, onToggleChat, onAddSource,
  isGenerating, isAnalyzing, hasDossier, chatOpen,
}: ResearchToolbarProps) {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <div className="flex items-center gap-2">
        {/* Generate / Regenerate Dossier */}
        <button
          onClick={onGenerateDossier}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasDossier ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {hasDossier ? 'Regerar' : 'Gerar Dossie'}
        </button>

        {/* Deep Research */}
        {hasDossier && (
          <button
            onClick={onDeepResearch}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary text-sm font-medium transition-colors"
          >
            <Search className="w-4 h-4" />
            Pesquisa Profunda
          </button>
        )}

        {/* Analyze Gaps */}
        {hasDossier && (
          <button
            onClick={onAnalyzeGaps}
            disabled={isAnalyzing || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Sugestoes IA
          </button>
        )}

        {/* Add Source */}
        <button
          onClick={onAddSource}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Fonte
        </button>
      </div>

      {/* Chat Toggle */}
      {hasDossier && (
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            chatOpen
              ? 'bg-amber-500 text-white'
              : 'bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Converse com Aica
        </button>
      )}
    </div>
  );
}
