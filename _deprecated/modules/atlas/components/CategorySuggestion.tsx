import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { TaskCategory } from '../types/plane';

interface CategorySuggestionProps {
  category: TaskCategory | null;
  isLoading: boolean;
  onAccept: (category: TaskCategory) => void;
  onReject: () => void;
}

/**
 * Component that displays AI-suggested task category
 * Shows a badge with accept/reject buttons for user to confirm or dismiss
 *
 * @example
 * ```tsx
 * <CategorySuggestion
 *   category={suggestedCategory}
 *   isLoading={isLoading}
 *   onAccept={(cat) => setCategory(cat)}
 *   onReject={() => clearSuggestion()}
 * />
 * ```
 */
export const CategorySuggestion: React.FC<CategorySuggestionProps> = ({
  category,
  isLoading,
  onAccept,
  onReject
}) => {
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 backdrop-blur-sm rounded-lg border border-blue-200/50 animate-pulse">
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        <span className="text-sm text-blue-700 font-medium">
          Categorizando com IA...
        </span>
      </div>
    );
  }

  // Don't render if no category suggested
  if (!category) return null;

  // Map categories to colors
  const categoryColors: Record<TaskCategory, { bg: string; border: string; text: string }> = {
    'Trabalho': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    'Pessoal': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    'Saúde': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    'Educação': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    'Finanças': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    'Outros': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' }
  };

  const colors = categoryColors[category];

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${colors.bg} backdrop-blur-sm rounded-lg border ${colors.border} transition-all duration-200 hover:shadow-sm`}
    >
      <span className={`text-sm ${colors.text} font-medium flex items-center gap-1.5`}>
        <span className="opacity-70">Categoria sugerida:</span>
        <span className="font-semibold">{category}</span>
      </span>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => onAccept(category)}
          className="p-1 hover:bg-white/60 rounded transition-colors"
          title="Aceitar sugestão"
          aria-label="Aceitar categoria sugerida"
        >
          <Check className="w-4 h-4 text-green-600" />
        </button>
        <button
          onClick={onReject}
          className="p-1 hover:bg-white/60 rounded transition-colors"
          title="Rejeitar sugestão"
          aria-label="Rejeitar categoria sugerida"
        >
          <X className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
};
