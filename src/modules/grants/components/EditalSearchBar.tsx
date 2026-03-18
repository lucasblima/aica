/**
 * EditalSearchBar - Busca semântica em documentos de editais usando Gemini File Search
 *
 * Permite aos usuários fazer perguntas em linguagem natural sobre o conteúdo
 * dos editais indexados (PDFs, documentos, etc.)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, FileSearch, AlertCircle, X, Sparkles } from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Editalsearchbar');

/** Search result displayed in the EditalSearchBar */
interface EditalSearchResult {
  /** Text content from the search result */
  content?: string;
  text?: string;
  /** Source document name */
  document_name?: string;
  /** Relevance score (0-1) */
  score?: number;
  /** Citations from the search */
  citations?: string[];
}

export interface EditalSearchBarProps {
  /** Callback quando busca é realizada */
  onSearch: (query: string) => Promise<EditalSearchResult[]>;
  /** Resultados da busca */
  results: EditalSearchResult[];
  /** Estado de loading */
  isSearching?: boolean;
  /** Se há documentos indexados */
  hasDocuments?: boolean;
  /** Placeholder customizado */
  placeholder?: string;
  /** Callback ao limpar busca */
  onClear?: () => void;
}

export const EditalSearchBar: React.FC<EditalSearchBarProps> = ({
  onSearch,
  results,
  isSearching = false,
  hasDocuments = true,
  placeholder = 'Pergunte algo sobre o edital...',
  onClear,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;
    if (!hasDocuments) {
      setError('Nenhum documento indexado. Faça upload de um PDF primeiro.');
      return;
    }

    try {
      setError(null);
      setShowResults(true);
      await onSearch(query.trim());
    } catch (err) {
      log.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar');
    }
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    setError(null);
    onClear?.();
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          {/* Icon - Left */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-text-secondary">
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileSearch className="w-5 h-5" />
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={isSearching || !hasDocuments}
            className={`
              w-full pl-12 pr-24 py-4
              bg-ceramic-base
              border-2 border-ceramic-border
              rounded-2xl
              text-base
              placeholder:text-ceramic-text-secondary
              transition-all duration-200
              focus:outline-none focus:border-ceramic-success focus:ring-4 focus:ring-ceramic-success/10
              disabled:bg-ceramic-base disabled:cursor-not-allowed
              shadow-sm hover:shadow-md
            `}
          />

          {/* Actions - Right */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={handleClear}
                className="p-2 text-ceramic-text-secondary hover:text-ceramic-text-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}

            <motion.button
              type="submit"
              disabled={isSearching || !query.trim() || !hasDocuments}
              className={`
                px-4 py-2
                bg-gradient-to-br from-ceramic-success to-ceramic-success/80
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
            className="flex items-start gap-3 p-4 bg-ceramic-error-bg border border-ceramic-border rounded-xl"
          >
            <AlertCircle className="w-5 h-5 text-ceramic-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-ceramic-error font-medium">Erro na busca</p>
              <p className="text-sm text-ceramic-error mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-ceramic-error hover:text-ceramic-error/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Documents Warning */}
      {!hasDocuments && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-ceramic-warning/10 border border-ceramic-border rounded-xl"
        >
          <AlertCircle className="w-5 h-5 text-ceramic-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-ceramic-warning font-medium">Nenhum documento indexado</p>
            <p className="text-sm text-ceramic-warning mt-1">
              Faça upload do PDF do edital para habilitar a busca semântica.
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
                <Sparkles className="w-4 h-4 text-ceramic-success" />
                <h3 className="text-sm font-semibold text-ceramic-text-primary">
                  {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
                </h3>
              </div>
              <button
                onClick={handleClear}
                className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
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
                  className="p-4 bg-ceramic-base border border-ceramic-border rounded-xl hover:border-ceramic-success/30 hover:shadow-md transition-all duration-200"
                >
                  {/* Content */}
                  <p className="text-sm text-ceramic-text-primary leading-relaxed">
                    {result.text}
                  </p>

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-ceramic-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                      <span className="text-xs text-ceramic-text-secondary">
                        {result.document_name || 'Documento'}
                      </span>
                    </div>
                    {result.score !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-ceramic-base rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-ceramic-success to-ceramic-success/80 rounded-full"
                            style={{ width: `${result.score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-ceramic-text-secondary font-medium">
                          {Math.round(result.score * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {showResults && results.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-ceramic-base border border-ceramic-border rounded-xl text-center"
          >
            <FileSearch className="w-12 h-12 text-ceramic-text-secondary mx-auto mb-3" />
            <p className="text-sm text-ceramic-text-secondary font-medium">Nenhum resultado encontrado</p>
            <p className="text-xs text-ceramic-text-secondary mt-1">
              Tente reformular sua pergunta ou usar termos diferentes
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 bg-ceramic-info-bg border border-ceramic-border rounded-xl"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-ceramic-info animate-spin" />
            <div className="text-center">
              <p className="text-sm text-ceramic-info font-medium">Buscando no edital...</p>
              <p className="text-xs text-ceramic-info mt-1">
                Analisando documentos com IA
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
 * Mostra exemplos de perguntas que podem ser feitas
 */
interface QuickSearchExamplesProps {
  onSelectExample: (example: string) => void;
  examples?: string[];
}

export const QuickSearchExamples: React.FC<QuickSearchExamplesProps> = ({
  onSelectExample,
  examples = [
    'Quais são os critérios de avaliação?',
    'Qual é o prazo de submissão?',
    'Quais documentos são obrigatórios?',
    'Como elaborar o orçamento?',
  ],
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-2">
        <Sparkles className="w-4 h-4 text-ceramic-text-secondary" />
        <h4 className="text-xs font-medium text-ceramic-text-secondary">Experimente perguntar:</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {examples.map((example, index) => (
          <motion.button
            key={index}
            onClick={() => onSelectExample(example)}
            className="px-3 py-1.5 bg-ceramic-base border border-ceramic-border rounded-lg text-xs text-ceramic-text-secondary hover:border-ceramic-success/30 hover:text-ceramic-success hover:bg-ceramic-success/10 transition-all duration-200"
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
