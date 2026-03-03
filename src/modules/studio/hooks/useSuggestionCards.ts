import { useCallback, useMemo } from 'react';
import { usePodcastWorkspace } from '../context/PodcastWorkspaceContext';
import { enrichCard } from '../services/podcastAIService';
import type { SuggestionCard, SuggestionCardStatus } from '../types';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useSuggestionCards');

export function useSuggestionCards() {
  const { state, actions } = usePodcastWorkspace();
  const { suggestionCards, isAnalyzingGaps, dossier } = state.research;

  // Filter cards by status
  const pendingCards = useMemo(
    () => suggestionCards.filter(c => c.status === 'pending' || c.status === 'expanded'),
    [suggestionCards]
  );

  const insertedCards = useMemo(
    () => suggestionCards.filter(c => c.status === 'inserted'),
    [suggestionCards]
  );

  // Trigger gap analysis
  const startGapAnalysis = useCallback(async () => {
    if (!dossier || isAnalyzingGaps) return;
    await actions.analyzeGaps();
  }, [dossier, isAnalyzingGaps, actions]);

  // Expand a card (shows full preview)
  const expandCard = useCallback((cardId: string) => {
    actions.updateCardStatus(cardId, 'expanded');
  }, [actions]);

  // Collapse a card back
  const collapseCard = useCallback((cardId: string) => {
    actions.updateCardStatus(cardId, 'pending');
  }, [actions]);

  // Discard a card
  const discardCard = useCallback((cardId: string) => {
    actions.updateCardStatus(cardId, 'discarded');
  }, [actions]);

  // Edit card text before insertion
  const editCardText = useCallback((cardId: string, newText: string) => {
    actions.updateCardText(cardId, newText);
  }, [actions]);

  // Insert card content into dossier
  const insertCard = useCallback((cardId: string) => {
    actions.insertCardToDossier(cardId);
  }, [actions]);

  // Enrich a card with more detailed content (calls Edge Function)
  const enrichCardContent = useCallback(async (card: SuggestionCard) => {
    try {
      const result = await enrichCard({
        cardType: card.type,
        cardTitle: card.title,
        guestName: state.setup.guestName,
        theme: state.setup.theme,
        existingDossier: dossier?.biography || '',
        fileSearchStoreId: state.research.fileSearchStoreId || undefined,
      });
      if (result.success && result.data) {
        actions.updateCardText(card.id, result.data.enrichedText);
      }
    } catch (error) {
      log.error('Error enriching card:', error);
    }
  }, [state.setup.guestName, state.setup.theme, dossier, state.research.fileSearchStoreId, actions]);

  return {
    cards: pendingCards,
    insertedCards,
    allCards: suggestionCards,
    isAnalyzing: isAnalyzingGaps,
    hasDossier: !!dossier,
    startGapAnalysis,
    expandCard,
    collapseCard,
    discardCard,
    editCardText,
    insertCard,
    enrichCardContent,
  };
}
