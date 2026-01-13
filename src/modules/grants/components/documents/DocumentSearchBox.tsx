/**
 * Document Search Box Component
 * Issue #116 - Embeddings and Semantic Search (RAG)
 *
 * Provides semantic search interface for processed documents
 *
 * @module modules/grants/components/documents/DocumentSearchBox
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentSearch, type UseDocumentSearchOptions } from '../../hooks/useDocumentProcessing';
import type { SemanticSearchResult } from '../../services/documentProcessingService';

// =============================================================================
// TYPES
// =============================================================================

export interface DocumentSearchBoxProps {
  /** Callback when a search result is selected */
  onResultSelect?: (result: SemanticSearchResult) => void;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Organization ID filter */
  organizationId?: string;
  /** Project ID filter */
  projectId?: string;
  /** Default search limit */
  defaultLimit?: number;
  /** Default similarity threshold */
  defaultThreshold?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Show search results inline */
  showResults?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// DOCUMENT TYPE LABELS
// =============================================================================

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  projeto_rouanet: 'Projeto Rouanet',
  proac: 'ProAC',
  estatuto: 'Estatuto',
  relatorio: 'Relatório',
  apresentacao: 'Apresentação',
  contrato: 'Contrato',
  edital: 'Edital',
  proposta: 'Proposta',
  ata: 'Ata',
  outros: 'Outros',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function DocumentSearchBox({
  onResultSelect,
  placeholder = 'Pesquisar documentos...',
  organizationId,
  projectId,
  defaultLimit = 10,
  defaultThreshold = 0.7,
  debounceMs = 300,
  showResults = true,
  className = '',
}: DocumentSearchBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchOptions: UseDocumentSearchOptions = {
    organizationId,
    projectId,
    defaultLimit,
    defaultThreshold,
  };

  const {
    results,
    isSearching,
    error,
    lastQuery,
    searchTimeMs,
    search,
    clear,
  } = useDocumentSearch(searchOptions);

  // Debounced search
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Clear results if input is empty
      if (!value.trim()) {
        clear();
        return;
      }

      // Debounce the search
      debounceRef.current = setTimeout(() => {
        search(value);
      }, debounceMs);
    },
    [search, clear, debounceMs]
  );

  // Handle result selection
  const handleResultClick = useCallback(
    (result: SemanticSearchResult) => {
      onResultSelect?.(result);
      setIsFocused(false);
    },
    [onResultSelect]
  );

  // Clear on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInputValue('');
        clear();
        setIsFocused(false);
        inputRef.current?.blur();
      }
    },
    [clear]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasResults = results.length > 0;
  const showDropdown = isFocused && showResults && (hasResults || isSearching || error);

  return (
    <div className={`document-search-box ${className}`} style={{ position: 'relative' }}>
      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          ...(isFocused && {
            borderColor: 'rgba(124, 58, 237, 0.5)',
            background: 'rgba(255, 255, 255, 0.08)',
          }),
        }}
      >
        {/* Search Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.5, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'inherit',
            fontSize: '14px',
          }}
        />

        {/* Loading Indicator */}
        {isSearching && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ opacity: 0.5 }}
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
            </svg>
          </motion.div>
        )}

        {/* Clear Button */}
        {inputValue && !isSearching && (
          <button
            onClick={() => {
              setInputValue('');
              clear();
              inputRef.current?.focus();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              background: 'rgba(30, 30, 30, 0.98)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 1000,
            }}
          >
            {/* Error State */}
            {error && (
              <div
                style={{
                  padding: '16px',
                  color: '#ef4444',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {error.message}
              </div>
            )}

            {/* Loading State */}
            {isSearching && !hasResults && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px',
                }}
              >
                Buscando documentos...
              </div>
            )}

            {/* Results List */}
            {hasResults && (
              <>
                {/* Results Header */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>
                    {results.length} resultado{results.length !== 1 ? 's' : ''} para "{lastQuery}"
                  </span>
                  {searchTimeMs && <span>{searchTimeMs}ms</span>}
                </div>

                {/* Results */}
                {results.map((result, index) => (
                  <motion.div
                    key={`${result.document_id}-${result.chunk_id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultClick(result)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Result Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '6px',
                      }}
                    >
                      {/* Document Icon */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ opacity: 0.7 }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>

                      {/* Document Name */}
                      <span
                        style={{
                          fontWeight: 500,
                          fontSize: '14px',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {result.document_name}
                      </span>

                      {/* Similarity Badge */}
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: getSimilarityColor(result.similarity),
                          color: 'white',
                          fontWeight: 500,
                        }}
                      >
                        {Math.round(result.similarity * 100)}%
                      </span>
                    </div>

                    {/* Document Type Badge */}
                    {result.detected_type && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(124, 58, 237, 0.2)',
                          color: 'rgba(167, 139, 250, 1)',
                          marginBottom: '8px',
                        }}
                      >
                        {DOCUMENT_TYPE_LABELS[result.detected_type] || result.detected_type}
                      </span>
                    )}

                    {/* Chunk Preview */}
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        lineHeight: 1.5,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {result.chunk_text.substring(0, 300)}
                      {result.chunk_text.length > 300 && '...'}
                    </p>
                  </motion.div>
                ))}
              </>
            )}

            {/* No Results */}
            {!isSearching && !error && lastQuery && !hasResults && (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px',
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{ opacity: 0.3, margin: '0 auto 12px' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                  <path d="M8 11h6" />
                </svg>
                <p style={{ margin: 0 }}>Nenhum documento encontrado</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>
                  Tente usar termos diferentes
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.9) return 'rgba(34, 197, 94, 0.8)'; // Green
  if (similarity >= 0.8) return 'rgba(124, 58, 237, 0.8)'; // Purple
  if (similarity >= 0.7) return 'rgba(59, 130, 246, 0.8)'; // Blue
  return 'rgba(156, 163, 175, 0.8)'; // Gray
}

export default DocumentSearchBox;
