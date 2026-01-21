/**
 * FinanceSearchPanel - Busca semântica em extratos e transações financeiras
 *
 * Permite buscar semanticamente no conteúdo dos statements usando File Search (Gemini).
 * Inclui busca por categorias, merchants, anomalias e perguntas sobre gastos.
 */

import React, { useState } from 'react';
import { createNamespacedLogger } from '@/lib/logger';
import { motion, AnimatePresence } from 'framer-motion';

const log = createNamespacedLogger('FinanceSearchPanel');
import {
  Search,
  Loader2,
  FileSearch,
  AlertCircle,
  X,
  Sparkles,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Store,
  Tag,
} from 'lucide-react';
import type { FileSearchResult } from '../../../types/fileSearch';

export interface FinanceSearchPanelProps {
  /** Callback para busca livre */
  onSearch: (query: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por categoria */
  onSearchCategory?: (category: string) => Promise<FileSearchResult[]>;
  /** Callback para busca por merchant */
  onSearchMerchant?: (merchant: string) => Promise<FileSearchResult[]>;
  /** Callback para busca de anomalias */
  onSearchAnomalies?: () => Promise<FileSearchResult[]>;
  /** Callback para busca de padrões */
  onSearchPatterns?: (pattern: string) => Promise<FileSearchResult[]>;
  /** Resultados da busca */
  results: FileSearchResult[];
  /** Estado de loading */
  isSearching?: boolean;
  /** Se há statements indexados */
  hasStatements?: boolean;
  /** Placeholder customizado */
  placeholder?: string;
  /** Callback ao limpar busca */
  onClear?: () => void;
}

type SearchMode = 'free' | 'category' | 'merchant' | 'anomalies' | 'patterns';

// Categorias comuns de gastos
const COMMON_CATEGORIES = [
  { value: 'alimentação', label: 'Alimentação', icon: '🍽️' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'moradia', label: 'Moradia', icon: '🏠' },
  { value: 'saúde', label: 'Saúde', icon: '🏥' },
  { value: 'educação', label: 'Educação', icon: '📚' },
  { value: 'lazer', label: 'Lazer', icon: '🎉' },
  { value: 'compras', label: 'Compras', icon: '🛒' },
  { value: 'salário', label: 'Salário', icon: '💰' },
];

export const FinanceSearchPanel: React.FC<FinanceSearchPanelProps> = ({
  onSearch,
  onSearchCategory,
  onSearchMerchant,
  onSearchAnomalies,
  onSearchPatterns,
  results,
  isSearching = false,
  hasStatements = true,
  placeholder = 'Buscar em extratos financeiros...',
  onClear,
}) => {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('free');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() && searchMode !== 'anomalies') return;
    if (!hasStatements) {
      setError('Nenhum extrato indexado. Faça upload de um extrato primeiro.');
      return;
    }

    try {
      setError(null);
      setShowResults(true);

      // Executar busca baseada no modo
      switch (searchMode) {
        case 'category':
          if (onSearchCategory) await onSearchCategory(query.trim());
          else await onSearch(`Encontre transações da categoria: ${query.trim()}`);
          break;
        case 'merchant':
          if (onSearchMerchant) await onSearchMerchant(query.trim());
          else await onSearch(`Encontre transações com: ${query.trim()}`);
          break;
        case 'anomalies':
          if (onSearchAnomalies) await onSearchAnomalies();
          else await onSearch('Encontre transações anômalas ou suspeitas');
          break;
        case 'patterns':
          if (onSearchPatterns) await onSearchPatterns(query.trim());
          else await onSearch(`Identifique padrões de despesa: ${query.trim()}`);
          break;
        case 'free':
        default:
          await onSearch(query.trim());
          break;
      }
    } catch (err) {
      log.error('[FinanceSearchPanel] Search error:', err);
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
      case 'category': return <Tag className="w-4 h-4" />;
      case 'merchant': return <Store className="w-4 h-4" />;
      case 'anomalies': return <AlertTriangle className="w-4 h-4" />;
      case 'patterns': return <TrendingUp className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSearchMode('free')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'free'
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Busca Livre
        </button>
        <button
          onClick={() => setSearchMode('category')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'category'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Por Categoria
        </button>
        <button
          onClick={() => setSearchMode('merchant')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'merchant'
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Por Merchant
        </button>
        <button
          onClick={() => setSearchMode('anomalies')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'anomalies'
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Anomalias
        </button>
        <button
          onClick={() => setSearchMode('patterns')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
            searchMode === 'patterns'
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Padrões
        </button>
      </div>

      {/* Category Quick Select (only for category mode) */}
      <AnimatePresence>
        {searchMode === 'category' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-4 md:grid-cols-8 gap-2"
          >
            {COMMON_CATEGORIES.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => {
                  setQuery(value);
                  // Auto-search when clicking category
                  if (onSearchCategory) {
                    setShowResults(true);
                    onSearchCategory(value);
                  }
                }}
                className="p-2 rounded-lg border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-center"
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-medium text-gray-700">{label}</div>
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
              searchMode === 'category'
                ? 'Ex: alimentação, transporte...'
                : searchMode === 'merchant'
                ? 'Ex: Uber, iFood...'
                : searchMode === 'anomalies'
                ? 'Clique em "Buscar" para encontrar anomalias'
                : searchMode === 'patterns'
                ? 'Ex: gastos recorrentes, despesas altas...'
                : placeholder
            }
            disabled={isSearching || !hasStatements || (searchMode === 'anomalies')}
            className={`
              w-full pl-12 pr-24 py-4
              bg-white
              border-2 border-gray-200
              rounded-2xl
              text-base
              placeholder:text-gray-400
              transition-all duration-200
              focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10
              disabled:bg-gray-50 disabled:cursor-not-allowed
              shadow-sm hover:shadow-md
            `}
          />

          {/* Actions - Right */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && searchMode !== 'anomalies' && (
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
              disabled={isSearching || (!query.trim() && searchMode !== 'anomalies') || !hasStatements}
              className={`
                px-4 py-2
                bg-gradient-to-br from-emerald-500 to-green-600
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

      {/* Error/Warnings */}
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

        {!hasStatements && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-700 font-medium">Nenhum extrato indexado</p>
              <p className="text-sm text-amber-600 mt-1">
                Faça upload de um extrato bancário para habilitar a busca semântica.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {results.length} {results.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
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
                  className="p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all duration-200"
                >
                  {/* Content */}
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-4 h-4 text-emerald-500 mt-1 flex-shrink-0" />
                    <p className="text-sm text-gray-700 leading-relaxed flex-1">
                      {result.text}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {result.document_name || 'Extrato'}
                      </span>
                    </div>
                    {result.score !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
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
              ))}
            </div>
          </motion.div>
        )}

        {showResults && results.length === 0 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center"
          >
            <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 font-medium">Nenhum resultado encontrado</p>
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
          className="p-8 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl"
        >
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <div className="text-center">
              <p className="text-sm text-emerald-700 font-medium">Buscando nos extratos...</p>
              <p className="text-xs text-emerald-600 mt-1">
                Analisando transações com IA
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
 */
interface QuickSearchExamplesProps {
  onSelectExample: (example: string) => void;
  examples?: string[];
}

export const FinanceQuickSearchExamples: React.FC<QuickSearchExamplesProps> = ({
  onSelectExample,
  examples = [
    'Quanto gastei com alimentação este mês?',
    'Quais foram minhas maiores despesas?',
    'Mostre transações recorrentes',
    'Identifique gastos suspeitos',
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
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200"
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
