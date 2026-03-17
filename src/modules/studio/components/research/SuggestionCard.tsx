import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Briefcase, Zap, BookOpen, Globe,
  MessageCircle, Newspaper, Search, Check, X, Edit3, Plus,
} from 'lucide-react';
import type { SuggestionCard as SuggestionCardType } from '../../types/research';
import { CARD_TYPE_CONFIG } from '../../types/research';

const ICON_MAP: Record<string, React.FC<any>> = {
  GraduationCap, Briefcase, Zap, BookOpen, Globe,
  MessageCircle, Newspaper, Search,
};

interface SuggestionCardProps {
  card: SuggestionCardType;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onInsert: (id: string) => void;
  onDiscard: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onEnrich: (card: SuggestionCardType) => void;
}

export function SuggestionCard({ card, onExpand, onCollapse, onInsert, onDiscard, onEdit, onEnrich }: SuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(card.fullText);
  const config = CARD_TYPE_CONFIG[card.type];
  const IconComponent = ICON_MAP[config.icon] || Search;

  if (card.status === 'inserted') {
    return (
      <div className="flex-shrink-0 w-40 p-3 rounded-xl bg-ceramic-success/10 border border-ceramic-success/30">
        <div className="flex items-center gap-2 mb-1">
          <Check className="w-4 h-4 text-ceramic-success" />
          <span className="text-xs font-medium text-ceramic-success">Inserido</span>
        </div>
        <p className="text-xs text-ceramic-text-secondary line-clamp-2">{card.title}</p>
      </div>
    );
  }

  if (card.status === 'expanded') {
    return (
      <motion.div
        layoutId={`card-${card.id}`}
        className="w-full p-4 rounded-xl bg-ceramic-base border-2 border-amber-400 shadow-lg"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${config.color}`} />
            <h4 className="font-semibold text-ceramic-text-primary">{card.title}</h4>
          </div>
          <button onClick={() => onCollapse(card.id)} className="p-1 hover:bg-ceramic-cool rounded-lg">
            <X className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>

        {/* Preview / Edit area */}
        <div className="mb-3 p-3 rounded-lg bg-ceramic-info/10 border-l-4 border-ceramic-info">
          {isEditing ? (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full min-h-[100px] p-2 text-sm bg-ceramic-base border border-ceramic-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          ) : (
            <p className="text-sm text-ceramic-text-primary whitespace-pre-wrap">{card.fullText}</p>
          )}
          <p className="mt-1 text-xs text-ceramic-text-secondary">
            Seção: {card.targetSection === 'bio' ? 'Biografia' : card.targetSection === 'ficha' ? 'Ficha Técnica' : 'Noticias'}
          </p>
        </div>

        {/* Sources */}
        {card.sources && card.sources.length > 0 && (
          <div className="mb-3 text-xs text-ceramic-text-secondary">
            <span className="font-medium">Fontes:</span>{' '}
            {card.sources.slice(0, 3).map((s, i) => (
              <span key={i}>{i > 0 ? ', ' : ''}{s.title || 'Fonte'}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => { if (isEditing) { onEdit(card.id, editText); setIsEditing(false); } else { onInsert(card.id); } }}
            className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isEditing ? 'Salvar e Inserir' : 'Inserir'}
          </button>
          <button
            onClick={() => { if (isEditing) { setIsEditing(false); setEditText(card.fullText); } else { setIsEditing(true); } }}
            className="py-2 px-3 rounded-lg bg-ceramic-cool hover:bg-ceramic-border text-ceramic-text-secondary text-sm flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>
          <button
            onClick={() => onDiscard(card.id)}
            className="py-2 px-3 rounded-lg hover:bg-ceramic-error/10 text-ceramic-text-secondary hover:text-ceramic-error text-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // COLLAPSED state (default in carousel)
  return (
    <motion.button
      layoutId={`card-${card.id}`}
      onClick={() => { onEnrich(card); onExpand(card.id); }}
      className="flex-shrink-0 w-48 p-3 rounded-xl bg-ceramic-base border border-ceramic-border hover:border-amber-400 hover:shadow-md cursor-pointer transition-all text-left"
    >
      <div className="flex items-center gap-2 mb-2">
        <IconComponent className={`w-4 h-4 ${config.color}`} />
        <span className="text-xs font-semibold text-ceramic-text-primary truncate">{card.title}</span>
      </div>
      <p className="text-xs text-ceramic-text-secondary line-clamp-2 mb-2">{card.previewText}</p>
      <div className="h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full"
          style={{ width: `${card.relevanceScore}%` }}
        />
      </div>
    </motion.button>
  );
}
