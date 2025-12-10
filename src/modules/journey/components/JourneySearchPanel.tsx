/**
 * JourneySearchPanel - Busca semântica em momentos e memórias
 *
 * Permite buscar semanticamente no conteúdo das memórias usando File Search (Gemini).
 * Inclui busca por emoções, tags, crescimento e insights.
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
  Heart,
  Hash,
  TrendingUp,
  Lightbulb,
  Calendar,
  Smile,
  Frown,
  Meh,
} from 'lucide-react';
import type { FileSearchResult } from '../../../types/fileSearch';

export interface JourneySearchPanelProps {
  /** Callback para busca livre */
  onSearch: (query: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por emoção */
  onSearchEmotion?: (emotion: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por tag */
  onSearchTag?: (tag: string) => Promise<FileSearchResult[]>;
  /** Callback para busca momentos de crescimento */
  onSearchGrowth?: () => Promise<FileSearchResult[]>;
  /** Callback para busca de insights */
  onSearchInsights?: (question: string) => Promise<FileSearchResult[]>;
  /** Resultados da busca */
  results: FileSearchResult[];
  /** Estado de loading */
  isSearching?: boolean;
  /** Se há momentos indexados */
  hasMoments?: boolean;
  /** Placeholder customizado */
  placeholder?: string;
  /** Callback ao limpar busca */
  onClear?: () => void;
}

type SearchMode = 'free' | 'emotion' | 'tag' | 'growth' | 'insights';

export const JourneySearchPanel: React.FC<JourneySearchPanelProps> = ({
  onSearch,
  onSearchEmotion,
  onSearchTag,
  onSearchGrowth,
  onSearchInsights,
  results,
  isSearching = false,
  hasMoments = true,
  placeholder = 'Buscar nas memórias...',
  onClear,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('free');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('feliz');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() && searchMode !== 'growth') return;
    if (!hasMoments) {
      setError('Nenhum momento indexado. Crie uma memória primeiro.');
      return;
    }

    try {
      setError(null);
      setShowResults(true);

      // Executar busca baseada no modo
      switch (searchMode) {
        case 'emotion':
          if (onSearchEmotion) await onSearchEmotion(selectedEmotion);
          else await onSearch(`Encontre momentos onde me senti ${selectedEmotion}`);
          break;
        case 'tag':
          if (onSearchTag) await onSearchTag(query.trim());
          else await onSearch(`Encontre momentos relacionados a ${query.trim()}`);
          break;
        case 'growth':
          if (onSearchGrowth) await onSearchGrowth();
          else await onSearch('Encontre momentos de aprendizado, crescimento pessoal, insights ou vitórias');
          break;
        case 'insights':
          if (onSearchInsights) await onSearchInsights(query.trim());
          else await onSearch(query.trim());
          break;
        case 'free':
        default:
          await onSearch(query.trim());
          break;
      }
    } catch (err) {
      console.error('[JourneySearchPanel] Search error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar');
    }
  };

  const handleClear = () => {
    setQuery('');
    setError(null);
    setShowResults(false);
    if (onClear) onClear();
  };

  const getModeIcon = () => {
    switch (searchMode) {
      case 'emotion':
        return <Heart className="w-5 h-5" />;
      case 'tag':
        return <Hash className="w-5 h-5" />;
      case 'growth':
        return <TrendingUp className="w-5 h-5" />;
      case 'insights':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <Search className="w-5 h-5" />;
    }
  };

  const getModeLabel = () => {
    switch (searchMode) {
      case 'emotion':
        return 'Por Emoção';
      case 'tag':
        return 'Por Tag';
      case 'growth':
        return 'Crescimento';
      case 'insights':
        return 'Insights';
      default:
        return 'Busca Livre';
    }
  };

  const commonEmotions = [
    { value: 'feliz', label: 'Feliz', icon: '😊' },
    { value: 'triste', label: 'Triste', icon: '😢' },
    { value: 'ansioso', label: 'Ansioso', icon: '😰' },
    { value: 'calmo', label: 'Calmo', icon: '😌' },
    { value: 'entusiasmado', label: 'Entusiasmado', icon: '🤩' },
    { value: 'frustrado', label: 'Frustrado', icon: '😤' },
    { value: 'grato', label: 'Grato', icon: '🙏' },
    { value: 'motivado', label: 'Motivado', icon: '💪' },
  ];

  if (!hasMoments) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">Nenhum momento indexado</h4>
            <p className="text-sm text-amber-700">
              Crie e salve memórias no Journey para habilitar a busca semântica.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSearchMode('free')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            searchMode === 'free'
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <Search className="w-4 h-4" />
          Busca Livre
        </button>

        <button
          onClick={() => setSearchMode('emotion')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            searchMode === 'emotion'
              ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <Heart className="w-4 h-4" />
          Por Emoção
        </button>

        <button
          onClick={() => setSearchMode('tag')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            searchMode === 'tag'
              ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <Hash className="w-4 h-4" />
          Por Tag
        </button>

        <button
          onClick={() => setSearchMode('growth')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            searchMode === 'growth'
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Crescimento
        </button>

        <button
          onClick={() => setSearchMode('insights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
            searchMode === 'insights'
              ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Insights
        </button>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        {searchMode === 'emotion' ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Selecione uma emoção:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {commonEmotions.map((emotion) => (
                <button
                  key={emotion.value}
                  type="button"
                  onClick={() => setSelectedEmotion(emotion.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedEmotion === emotion.value
                      ? 'border-pink-400 bg-pink-50 shadow-sm'
                      : 'border-gray-200 hover:border-pink-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{emotion.icon}</div>
                  <div className="text-sm font-medium text-gray-700">{emotion.label}</div>
                </button>
              ))}
            </div>
          </div>
        ) : searchMode === 'growth' ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Clique em <strong>Buscar</strong> para encontrar momentos de aprendizado, crescimento pessoal e vitórias.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {getModeIcon()}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchMode === 'tag'
                  ? 'Digite uma tag (ex: trabalho, saúde, família)...'
                  : searchMode === 'insights'
                  ? 'Faça uma pergunta sobre seus padrões...'
                  : placeholder
              }
              className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              disabled={isSearching}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSearching || (!query.trim() && searchMode !== 'growth' && searchMode !== 'emotion')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <FileSearch className="w-5 h-5" />
                Buscar
              </>
            )}
          </button>

          {showResults && (
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Mode Indicator */}
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Modo: <span className="font-semibold text-gray-700">{getModeLabel()}</span>
        </div>
      </form>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erro na busca</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-3"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">
                {results.length === 0 ? 'Nenhum resultado' : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
              </h4>
              {results.length > 0 && (
                <span className="text-sm text-gray-500">
                  Relevância decrescente
                </span>
              )}
            </div>

            {/* Results List */}
            {results.length > 0 ? (
              <div className="space-y-3">
                {results.flatMap((result, resultIndex) =>
                  result.citations.map((citation, citationIndex) => (
                    <motion.div
                      key={`${resultIndex}-${citationIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (resultIndex * result.citations.length + citationIndex) * 0.05 }}
                      className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      {/* Result Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">
                            {citation.title || 'Momento sem nome'}
                          </span>
                        </div>
                        {citation.score && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Sparkles className="w-3.5 h-3.5" />
                            {(citation.score * 100).toFixed(0)}% relevante
                          </div>
                        )}
                      </div>

                      {/* Result Content */}
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        {citation.text || citation.source || 'Sem conteúdo'}
                      </p>

                      {/* Citation Source */}
                      {citation.source && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <FileSearch className="w-3.5 h-3.5" />
                            {citation.source}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">Nenhum momento encontrado</p>
                <p className="text-sm text-gray-400">
                  Tente outra busca ou ajuste os filtros
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JourneySearchPanel;
