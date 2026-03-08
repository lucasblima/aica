import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Trash2,
  Save,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  Calendar,
} from 'lucide-react';
import { createNamespacedLogger } from '@/lib/logger';
import { useTransactions } from '../hooks/useTransactions';
import type { FinanceTransaction, TransactionFilters } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS, formatCurrency } from '../constants';

const log = createNamespacedLogger('TransactionListView');

// =====================================================
// TransactionListView — Full Transaction Browser
// =====================================================

interface TransactionListViewProps {
  userId: string;
  onClose?: () => void;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  userId,
  onClose,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    category: string;
    description: string;
    notes: string;
  }>({ category: '', description: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Debounce search input (400ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setSearchTerm(searchInput.trim()), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // All categories that exist in CATEGORY_LABELS (superset of TRANSACTION_CATEGORIES)
  const allCategories = useMemo(() =>
    Object.keys(CATEGORY_LABELS).sort((a, b) =>
      (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b)
    ),
    []
  );

  const filters: TransactionFilters = useMemo(() => {
    const f: TransactionFilters = {};
    if (searchTerm) f.searchTerm = searchTerm;
    if (typeFilter !== 'all') f.type = typeFilter;
    if (categoryFilter) f.category = categoryFilter;
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    return f;
  }, [searchTerm, typeFilter, categoryFilter, startDate, endDate]);

  const {
    transactions,
    loading,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(userId, filters);

  const handleExpand = useCallback(
    (tx: FinanceTransaction) => {
      if (expandedId === tx.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(tx.id);
      setEditData({
        category: tx.category,
        description: tx.description,
        notes: tx.notes || '',
      });
    },
    [expandedId]
  );

  const handleSave = useCallback(
    async (id: string) => {
      try {
        setSaving(true);
        await updateTransaction(id, {
          category: editData.category,
          description: editData.description,
          notes: editData.notes || undefined,
        });
        setExpandedId(null);
      } catch (err) {
        log.error('Failed to save transaction', err);
      } finally {
        setSaving(false);
      }
    },
    [editData, updateTransaction]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id);
        setDeleteConfirmId(null);
        setExpandedId(null);
      } catch (err) {
        log.error('Failed to delete transaction', err);
      }
    },
    [deleteTransaction]
  );

  // ── Loading skeleton ──
  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="ceramic-card p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ceramic-cool rounded-lg" />
              <div>
                <div className="h-4 bg-ceramic-cool rounded w-40 mb-2" />
                <div className="h-3 bg-ceramic-cool rounded w-20" />
              </div>
            </div>
            <div className="h-5 bg-ceramic-cool rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  // ── Error state ──
  if (error && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="ceramic-inset p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-ceramic-error" />
        </div>
        <p className="text-ceramic-text-primary font-medium mb-1">
          Erro ao carregar transações
        </p>
        <p className="text-ceramic-text-secondary text-sm mb-4">{error}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-ceramic-text-primary">Transações</h2>
          {totalCount > 0 && (
            <p className="text-xs text-ceramic-text-secondary">
              {totalCount} transação{totalCount !== 1 ? 'es' : ''} encontrada
              {totalCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ceramic-inset p-2 rounded-lg hover:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        )}
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg ceramic-inset text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Type filters */}
        {(['all', 'income', 'expense'] as const).map((type) => {
          const labels = { all: 'Todas', income: 'Receitas', expense: 'Despesas' };
          const isActive = typeFilter === type;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-amber-500 text-white'
                  : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
            >
              {labels[type]}
            </button>
          );
        })}

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter
                ? 'bg-amber-500 text-white'
                : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
            }`}
          >
            <Filter className="w-3 h-3" />
            {categoryFilter ? CATEGORY_LABELS[categoryFilter] || categoryFilter : 'Categoria'}
            <ChevronDown className="w-3 h-3" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 w-48 max-h-64 overflow-y-auto ceramic-card p-1 shadow-lg rounded-lg">
              <button
                onClick={() => {
                  setCategoryFilter('');
                  setShowCategoryDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-ceramic-cool transition-colors text-ceramic-text-secondary"
              >
                Todas as categorias
              </button>
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setShowCategoryDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                    categoryFilter === cat
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'hover:bg-ceramic-cool text-ceramic-text-primary'
                  }`}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range toggle */}
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            startDate || endDate
              ? 'bg-amber-500 text-white'
              : 'ceramic-inset text-ceramic-text-secondary hover:text-ceramic-text-primary'
          }`}
        >
          <Calendar className="w-3 h-3" />
          {startDate || endDate ? 'Período' : 'Período'}
        </button>

        {/* Clear filters */}
        {(typeFilter !== 'all' || categoryFilter || searchInput || startDate || endDate) && (
          <button
            onClick={() => {
              setTypeFilter('all');
              setCategoryFilter('');
              setSearchInput('');
              setSearchTerm('');
              setStartDate('');
              setEndDate('');
              setShowDateFilter(false);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-ceramic-error hover:bg-ceramic-error/10 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Date range filter ── */}
      {showDateFilter && (
        <div className="flex items-center gap-2 mb-4 ceramic-inset p-3 rounded-lg">
          <span className="text-xs text-ceramic-text-secondary whitespace-nowrap">De:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 text-xs ceramic-card px-2 py-1.5 rounded text-ceramic-text-primary bg-transparent"
          />
          <span className="text-xs text-ceramic-text-secondary whitespace-nowrap">Até:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 text-xs ceramic-card px-2 py-1.5 rounded text-ceramic-text-primary bg-transparent"
          />
        </div>
      )}

      {/* ── Transaction list ── */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && transactions.length === 0 ? (
          renderSkeleton()
        ) : transactions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="ceramic-inset p-4 rounded-full mb-4">
              <Receipt className="w-8 h-8 text-ceramic-text-secondary" />
            </div>
            <p className="text-ceramic-text-primary font-medium mb-1">
              Nenhuma transação encontrada
            </p>
            <p className="text-ceramic-text-secondary text-sm text-center">
              {searchTerm || typeFilter !== 'all' || categoryFilter
                ? 'Tente ajustar os filtros para encontrar transações.'
                : 'Importe um extrato para começar.'}
            </p>
          </div>
        ) : (
          <>
            {transactions.map((tx) => {
              const isExpanded = expandedId === tx.id;
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="ceramic-card overflow-hidden transition-all duration-200"
                >
                  {/* ── Row ── */}
                  <button
                    onClick={() => handleExpand(tx)}
                    className="w-full flex items-center justify-between p-3 hover:bg-ceramic-cool/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                          isIncome ? 'bg-emerald-50' : 'bg-red-50'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ceramic-text-primary truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-ceramic-text-secondary">
                            {formatDate(tx.transaction_date)}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.other
                            }`}
                          >
                            {CATEGORY_LABELS[tx.category] || tx.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-sm font-bold ${
                          isIncome ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(Math.abs(tx.amount))}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-ceramic-text-secondary" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ceramic-text-secondary" />
                      )}
                    </div>
                  </button>

                  {/* ── Expanded edit panel ── */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-ceramic-border space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Date (read-only) */}
                        <div>
                          <label className="text-xs text-ceramic-text-secondary block mb-1">
                            Data
                          </label>
                          <p className="text-sm text-ceramic-text-primary ceramic-inset px-3 py-2 rounded-lg">
                            {formatFullDate(tx.transaction_date)}
                          </p>
                        </div>

                        {/* Category dropdown */}
                        <div>
                          <label className="text-xs text-ceramic-text-secondary block mb-1">
                            Categoria
                          </label>
                          <select
                            value={editData.category}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, category: e.target.value }))
                            }
                            className="w-full text-sm ceramic-inset px-3 py-2 rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-transparent"
                          >
                            {TRANSACTION_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {CATEGORY_LABELS[cat] || cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-xs text-ceramic-text-secondary block mb-1">
                          Descrição
                        </label>
                        <input
                          type="text"
                          value={editData.description}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className="w-full text-sm ceramic-inset px-3 py-2 rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs text-ceramic-text-secondary block mb-1">
                          Notas
                        </label>
                        <textarea
                          value={editData.notes}
                          onChange={(e) =>
                            setEditData((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          rows={2}
                          className="w-full text-sm ceramic-inset px-3 py-2 rounded-lg text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                          placeholder="Adicionar nota..."
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div>
                          {deleteConfirmId === tx.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-ceramic-error">Tem certeza?</span>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="text-xs bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                              >
                                Sim, excluir
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(tx.id)}
                              className="flex items-center gap-1.5 text-xs text-ceramic-error hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedId(null)}
                            className="flex items-center gap-1.5 text-xs ceramic-inset px-3 py-1.5 rounded-lg text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSave(tx.id)}
                            disabled={saving}
                            className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Load more ── */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="flex items-center gap-2 ceramic-inset px-4 py-2 rounded-lg text-sm text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronsRight className="w-4 h-4" />
                  )}
                  Carregar mais
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
