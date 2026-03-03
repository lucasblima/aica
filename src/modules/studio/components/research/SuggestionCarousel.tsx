import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { SuggestionCard } from './SuggestionCard';
import type { SuggestionCard as CardType } from '../../types/research';

interface SuggestionCarouselProps {
  cards: CardType[];
  insertedCards: CardType[];
  isAnalyzing: boolean;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onInsert: (id: string) => void;
  onDiscard: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onEnrich: (card: CardType) => void;
}

export function SuggestionCarousel({
  cards, insertedCards, isAnalyzing,
  onExpand, onCollapse, onInsert, onDiscard, onEdit, onEnrich,
}: SuggestionCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  // Check if any card is expanded
  const expandedCard = cards.find(c => c.status === 'expanded');

  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center gap-3 py-6 px-4 bg-ceramic-cool/50 rounded-xl">
        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        <span className="text-sm text-ceramic-text-secondary">Analisando lacunas no dossie...</span>
      </div>
    );
  }

  if (cards.length === 0 && insertedCards.length === 0) return null;

  // If a card is expanded, show it full-width
  if (expandedCard) {
    return (
      <div className="px-1">
        <AnimatePresence mode="wait">
          <SuggestionCard
            key={expandedCard.id}
            card={expandedCard}
            onExpand={onExpand}
            onCollapse={onCollapse}
            onInsert={onInsert}
            onDiscard={onDiscard}
            onEdit={onEdit}
            onEnrich={onEnrich}
          />
        </AnimatePresence>
      </div>
    );
  }

  // Collapsed carousel
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-ceramic-text-primary">
            Sugestoes de Pesquisa
          </span>
          <span className="text-xs text-ceramic-text-secondary">
            {insertedCards.length}/{cards.length + insertedCards.length} inseridas
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')} className="p-1 rounded-full hover:bg-ceramic-cool">
            <ChevronLeft className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
          <button onClick={() => scroll('right')} className="p-1 rounded-full hover:bg-ceramic-cool">
            <ChevronRight className="w-4 h-4 text-ceramic-text-secondary" />
          </button>
        </div>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-ceramic-border scrollbar-track-transparent"
      >
        {cards.map(card => (
          <SuggestionCard
            key={card.id}
            card={card}
            onExpand={onExpand}
            onCollapse={onCollapse}
            onInsert={onInsert}
            onDiscard={onDiscard}
            onEdit={onEdit}
            onEnrich={onEnrich}
          />
        ))}
        {insertedCards.map(card => (
          <SuggestionCard
            key={card.id}
            card={card}
            onExpand={onExpand}
            onCollapse={onCollapse}
            onInsert={onInsert}
            onDiscard={onDiscard}
            onEdit={onEdit}
            onEnrich={onEnrich}
          />
        ))}
      </div>
    </div>
  );
}
