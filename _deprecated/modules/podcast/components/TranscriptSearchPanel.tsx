/**
 * TranscriptSearchPanel - Busca semântica em transcrições de episódios
 *
 * Permite buscar semanticamente no conteúdo das transcrições usando File Search (Gemini).
 * Inclui busca por tópicos, citações, sentimentos e busca livre.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Loader2,
  FileSearch,
  AlertCircle,
  X,
  Sparkles,
  Laugh,
  Heart,
  Zap,
  MessageSquare,
  Quote,
  Hash,
} from 'lucide-react';
import type { FileSearchResult } from '../../../types/fileSearch';

export interface TranscriptSearchPanelProps {
  /** Callback para busca livre */
  onSearch: (query: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por tópico */
  onSearchTopic?: (topic: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por citação */
  onSearchQuote?: (phrase: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por sentimento */
  onSearchSentiment?: (sentiment: 'funny' | 'emotional' | 'controversial' | 'inspiring') => Promise<FileSearchResult[]>;
  /** Resultados da busca */
  results: FileSearchResult[];
  /** Estado de loading */
  isSearching?: boolean;
  /** Se há transcrições indexadas */
  hasTranscriptions?: boolean;
  /** Placeholder customizado */
  placeholder?: string;
  /** Callback ao limpar busca */
  onClear?: () => void;
}

type SearchMode = 'free' | 'topic' | 'quote' | 'sentiment';

export const TranscriptSearchPanel: React.FC<TranscriptSearchPanelProps> = ({
  onSearch,
  onSearchTopic,
  onSearchQuote,
  onSearchSentiment,
  results,
  isSearching = false,
  hasTranscriptions = true,
  placeholder = 'Buscar na transcrição...',
  onClear,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('free');
  const [selectedSentiment, setSelectedSentiment] = useState<'funny' | 'emotional' | 'controversial' | 'inspiring'>('funny');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() && searchMode !== 'sentiment') return;
    if (!hasTranscriptions) {
      setError('Nenhuma transcrição indexada. Gere uma transcrição primeiro.');
      return;
    }

    try {
      setError(null);
      setShowResults(true);

      // Executar busca baseada no modo
      switch (searchMode) {
        case 'topic':
          if (onSearchTopic) await onSearchTopic(query.trim());
          else await onSearch(`Encontre momentos sobre o tema: ${query.trim()}`);
          break;
        case 'quote':
          if (onSearchQuote) await onSearchQuote(query.trim());
          else await onSearch(`Encontre citações similares a: "${query.trim()}"`);
          break;
        case 'sentiment':
          if (onSearchSentiment) await onSearchSentiment(selectedSentiment);
          else await onSearch(`Encontre momentos ${selectedSentiment} na conversa`);
          break;
        case 'free':
        default:
          await onSearch(query.trim());
          break;
      }
    } catch (err) {
      console.error('[TranscriptSearchPanel] Search error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar');
    }
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    setError(null);
    setSearchMode('free');
    onClear?.();
  };

  const getModeIcon = (mode: SearchMode) => {
    switch (mode) {
      case 'topic': return <Hash className="w-4 h-4" />;
      case 'quote': return <Quote className="w-4 h-4" />;
      case 'sentiment': return <Heart className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSentimentIcon = (sentiment: 'funny' | 'emotional' | 'controversial' | 'inspiring') => {
    switch (sentiment) {
      case 'funny': return <Laugh className="w-4 h-4" />;
      case 'emotional': return <Heart className="w-4 h-4" />;
      case 'controversial': return <Zap className="w-4 h-4" />;
      case 'inspiring': return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSearchMode('free')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'free'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Busca Livre
        </button>
        <button
          onClick={() => setSearchMode('topic')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'topic'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          Por Tópico
        </button>
        <button
          onClick={() => setSearchMode('quote')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'quote'
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Quote className="w-3.5 h-3.5" />
          Citações
        </button>
        <button
          onClick={() => setSearchMode('sentiment')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'sentiment'
              ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          Por Sentimento
        </button>
      </div>

      {/* Sentiment Selector (only for sentiment mode) */}
      <AnimatePresence>
        {searchMode === 'sentiment' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
          >
            {[
              { value: 'funny' as const, label: 'Engraçados', icon: Laugh, color: 'from-yellow-400 to-orange-500' },
              { value: 'emotional' as const, label: 'Emocionantes', icon: Heart, color: 'from-red-400 to-pink-500' },
              { value: 'controversial' as const, label: 'Polêmicos', icon: Zap, color: 'from-orange-500 to-red-600' },
              { value: 'inspiring' as const, label: 'Inspiradores', icon: Sparkles, color: 'from-purple-400 to-indigo-500' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setSelectedSentiment(value)}
                className={`p-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedSentiment === value
                    ? `bg-gradient-to-br ${color} text-white shadow-lg scale-105`
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Input */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          {/* Icon - Left */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              getModeIcon(searchMode)
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchMode === 'topic'
                ? 'Ex: inteligência artificial, política...'
                : searchMode === 'quote'
                ? 'Ex: O futuro é imprevisível...'
                : searchMode === 'sentiment'
                ? 'Clique em "Buscar" para encontrar momentos'
                : placeholder
            }
            disabled={isSearching || !hasTranscriptions || (searchMode === 'sentiment')}
            className={`
              w-full pl-12 pr-24 py-4
              bg-white
              border-2 border-gray-200
              rounded-2xl
              text-base
              placeholder:text-gray-400
              transition-all duration-200
              focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10
              disabled:bg-gray-50 disabled:cursor-not-allowed
              shadow-sm hover:shadow-md
            `}
          />

          {/* Actions - Right */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && searchMode !== 'sentiment' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}

            <motion.button
              type="submit"
              disabled={isSearching || (!query.trim() && searchMode !== 'sentiment') || !hasTranscriptions}
              className={`
                px-4 py-2
                bg-gradient-to-br from-blue-500 to-blue-600
                text-white font-medium text-sm
                rounded-xl
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:shadow-lg hover:scale-105
                active:scale-95
                flex items-center gap-2
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-4 h-4" />
              Buscar
            </motion.button>
          </div>
        </div>
      </form>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">Erro na busca</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Transcriptions Warning */}
      {!hasTranscriptions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-700 font-medium">Nenhuma transcrição indexada</p>
            <p className="text-sm text-amber-600 mt-1">
              Gere uma transcrição do episódio para habilitar a busca semântica.
            </p>
          </div>
        </motion.div>
      )}

      {/* Search Results */}
      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {results.length} {results.length === 1 ? 'momento encontrado' : 'momentos encontrados'}
                </h3>
              </div>
              <button
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Limpar
              </button>
            </div>

            {/* Results List */}
            <div className="space-y-2">
              {results.map((result, index) => (
                <motion.div
                  key={`${result.document_name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Content */}
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">
                      {result.text}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {result.document_name || 'Transcrição'}
                      </span>
                    </div>
                    {result.score !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            style={{ width: `${result.score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          {Math.round(result.score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}</div>
          </motion.div>
        )}

        {showResults && results.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center"
          >
            <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">Nenhum momento encontrado</p>
            <p className="text-xs text-gray-500 mt-1">
              Tente reformular sua busca ou usar termos diferentes
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="text-sm text-blue-700 font-medium">Buscando na transcrição...</p>
              <p className="text-xs text-blue-600 mt-1">
                Analisando momentos relevantes com IA
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Quick Search Examples Component
 *
 * Mostra exemplos de buscas que podem ser feitas
 */
interface QuickSearchExamplesProps {
  onSelectExample: (example: string) => void;
  examples?: string[];
}

export const TranscriptQuickSearchExamples: React.FC<QuickSearchExamplesProps> = ({
  onSelectExample,
  examples = [
    'Quando falaram sobre inteligência artificial?',
    'O que o convidado disse sobre política?',
    'Momentos engraçados da conversa',
    'Citações inspiradoras',
  ],
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-2">
        <Sparkles className="w-4 h-4 text-gray-400" />
        <h4 className="text-xs font-medium text-gray-600">Experimente perguntar:</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <motion.button
            key={index}
            onClick={() => onSelectExample(example)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {example}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
