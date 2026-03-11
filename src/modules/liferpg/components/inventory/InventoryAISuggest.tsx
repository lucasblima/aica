/**
 * InventoryAISuggest — AI-powered inventory recommendations panel.
 * Shows missing items, replacement suggestions, and organization tips.
 */

import React, { useState, useCallback } from 'react';
import {
  InventorySuggestService,
  type InventorySuggestions,
  type MissingItemSuggestion,
  type ReplaceItemSuggestion,
  type OrganizationTip,
} from '../../services/inventorySuggestService';

interface InventoryAISuggestProps {
  personaId: string;
  onAddSuggested?: (name: string, category: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-ceramic-error/10 text-ceramic-error',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baixa',
};

export const InventoryAISuggest: React.FC<InventoryAISuggestProps> = ({
  personaId,
  onAddSuggested,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<InventorySuggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await InventorySuggestService.getSuggestions(personaId);
      if (result.success && result.data) {
        setSuggestions(result.data);
      } else {
        setError(result.error || 'Falha ao gerar sugestoes');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  if (!suggestions && !loading && !error) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss border border-ceramic-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="sparkles">{'\u2728'}</span>
            <span className="text-sm font-medium text-ceramic-text-primary">Sugestoes IA</span>
          </div>
          <button
            onClick={handleAnalyze}
            className="text-xs py-1.5 px-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Analisar Inventario
          </button>
        </div>
        <p className="text-xs text-ceramic-text-secondary mt-1">
          A IA analisa seu inventario e sugere melhorias.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss border border-ceramic-border">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-ceramic-text-secondary">Analisando inventario com IA...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss border border-ceramic-error/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ceramic-error">{error}</span>
          <button
            onClick={handleAnalyze}
            className="text-xs py-1 px-3 rounded-lg bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-border transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!suggestions) return null;

  const hasMissing = suggestions.missing_items?.length > 0;
  const hasReplace = suggestions.replace_items?.length > 0;
  const hasOrg = suggestions.organization_tips?.length > 0;

  if (!hasMissing && !hasReplace && !hasOrg) {
    return (
      <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss border border-ceramic-success/20">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="check">{'\u2705'}</span>
          <span className="text-sm text-ceramic-success">Inventario em otimo estado! Sem sugestoes no momento.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss border border-ceramic-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="sparkles">{'\u2728'}</span>
          <span className="text-sm font-semibold text-ceramic-text-primary">Sugestoes IA</span>
        </div>
        <button
          onClick={handleAnalyze}
          className="text-[10px] py-1 px-2 rounded bg-ceramic-cool text-ceramic-text-secondary hover:bg-ceramic-border transition-colors"
        >
          Reanalisar
        </button>
      </div>

      {/* Missing Items Section */}
      {hasMissing && (
        <SectionWrapper
          title="Itens Faltando"
          icon={'\u{1F4E6}'}
          count={suggestions.missing_items.length}
          collapsed={collapsedSections['missing'] || false}
          onToggle={() => toggleSection('missing')}
        >
          {suggestions.missing_items.map((item: MissingItemSuggestion, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 bg-ceramic-cool rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-ceramic-text-primary">{item.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.low}`}>
                    {PRIORITY_LABELS[item.priority] || item.priority}
                  </span>
                </div>
                <p className="text-[10px] text-ceramic-text-secondary mt-0.5">{item.reason}</p>
                {item.category && (
                  <span className="text-[10px] text-ceramic-text-secondary italic">{item.category}</span>
                )}
              </div>
              {onAddSuggested && (
                <button
                  onClick={() => onAddSuggested(item.name, item.category)}
                  className="shrink-0 text-[10px] py-1 px-2 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  + Adicionar
                </button>
              )}
            </div>
          ))}
        </SectionWrapper>
      )}

      {/* Replace Items Section */}
      {hasReplace && (
        <SectionWrapper
          title="Substituir"
          icon={'\u{1F504}'}
          count={suggestions.replace_items.length}
          collapsed={collapsedSections['replace'] || false}
          onToggle={() => toggleSection('replace')}
        >
          {suggestions.replace_items.map((item: ReplaceItemSuggestion, idx: number) => (
            <div
              key={idx}
              className="p-2 bg-ceramic-cool rounded-lg"
            >
              <div className="text-xs font-medium text-ceramic-text-primary">{item.current_item}</div>
              <p className="text-[10px] text-ceramic-text-secondary mt-0.5">{item.reason}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Sugestao: {item.suggestion}</p>
            </div>
          ))}
        </SectionWrapper>
      )}

      {/* Organization Tips Section */}
      {hasOrg && (
        <SectionWrapper
          title="Organizacao"
          icon={'\u{1F4CB}'}
          count={suggestions.organization_tips.length}
          collapsed={collapsedSections['org'] || false}
          onToggle={() => toggleSection('org')}
        >
          {suggestions.organization_tips.map((tip: OrganizationTip, idx: number) => (
            <div
              key={idx}
              className="p-2 bg-ceramic-cool rounded-lg"
            >
              <p className="text-xs text-ceramic-text-primary">{tip.tip}</p>
              {tip.affected_items?.length > 0 && (
                <p className="text-[10px] text-ceramic-text-secondary mt-0.5">
                  Itens: {tip.affected_items.join(', ')}
                </p>
              )}
            </div>
          ))}
        </SectionWrapper>
      )}
    </div>
  );
};

// ============================================================================
// Collapsible section wrapper
// ============================================================================

interface SectionWrapperProps {
  title: string;
  icon: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  icon,
  count,
  collapsed,
  onToggle,
  children,
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 text-left py-1"
    >
      <span className="text-sm">{icon}</span>
      <span className="text-xs font-semibold text-ceramic-text-primary flex-1">
        {title} ({count})
      </span>
      <span className="text-xs text-ceramic-text-secondary">
        {collapsed ? '\u25B6' : '\u25BC'}
      </span>
    </button>
    {!collapsed && <div className="space-y-2 mt-1">{children}</div>}
  </div>
);
