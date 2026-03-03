import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePodcastWorkspace } from '../../context/PodcastWorkspaceContext';
import { useSuggestionCards } from '../../hooks/useSuggestionCards';
import { useResearchChat } from '../../hooks/useResearchChat';
import { SuggestionCarousel } from './SuggestionCarousel';
import { DossierEditor } from './DossierEditor';
import { ResearchToolbar } from './ResearchToolbar';
import { ResearchChatSheet } from './ResearchChatSheet';
import { AIThinkingState } from '@/components/ui';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ResearchCanvas');

export function ResearchCanvas() {
  const { state, actions } = usePodcastWorkspace();
  const { research } = state;
  const [showAddSource, setShowAddSource] = useState(false);

  const {
    cards, insertedCards, isAnalyzing, hasDossier,
    startGapAnalysis, expandCard, collapseCard, discardCard,
    editCardText, insertCard, enrichCardContent,
  } = useSuggestionCards();

  const chat = useResearchChat();

  const handleGenerateDossier = useCallback(async () => {
    if (research.dossier) {
      await actions.regenerateDossier();
    } else {
      await actions.generateDossier();
    }
  }, [research.dossier, actions]);

  const handleDeepResearch = useCallback(async () => {
    await actions.deepResearch('standard');
  }, [actions]);

  const handleInsertFromChat = useCallback((text: string, targetSection: string) => {
    if (!research.dossier) return;
    // Create a temporary card and insert it
    const tempCardId = `chat_${Date.now()}`;
    actions.insertCardToDossier(tempCardId);
    // Directly update dossier content based on target section
    const currentBio = research.dossier.biography || '';
    if (targetSection === 'bio' || targetSection === 'ficha') {
      actions.hydrate({
        research: {
          ...research,
          dossier: { ...research.dossier, biography: `${currentBio}\n\n${text}` },
        },
      });
    } else if (targetSection === 'noticias') {
      actions.hydrate({
        research: {
          ...research,
          dossier: {
            ...research.dossier,
            controversies: [...(research.dossier.controversies || []), text],
          },
        },
      });
    }
  }, [research, actions]);

  // Dossier generation loading state
  if (research.isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <AIThinkingState message="Gerando dossie do convidado..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <ResearchToolbar
        onGenerateDossier={handleGenerateDossier}
        onDeepResearch={handleDeepResearch}
        onAnalyzeGaps={startGapAnalysis}
        onToggleChat={() => chat.toggleChat()}
        onAddSource={() => setShowAddSource(true)}
        isGenerating={research.isGenerating}
        isAnalyzing={isAnalyzing}
        hasDossier={hasDossier}
        chatOpen={chat.isOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left side: Carousel + Dossier (full width or 60%) */}
        <div className={`flex flex-col min-h-0 transition-all duration-300 ${chat.isOpen ? 'w-[60%]' : 'w-full'}`}>
          {/* Suggestion Carousel (hidden when chat is open for space) */}
          <AnimatePresence>
            {!chat.isOpen && (cards.length > 0 || insertedCards.length > 0 || isAnalyzing) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 pt-2"
              >
                <SuggestionCarousel
                  cards={cards}
                  insertedCards={insertedCards}
                  isAnalyzing={isAnalyzing}
                  onExpand={expandCard}
                  onCollapse={collapseCard}
                  onInsert={insertCard}
                  onDiscard={discardCard}
                  onEdit={editCardText}
                  onEnrich={enrichCardContent}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dossier Editor */}
          <DossierEditor />
        </div>

        {/* Right side: Chat Sheet (40%) */}
        <AnimatePresence>
          {chat.isOpen && (
            <motion.div
              className="w-[40%] flex-shrink-0"
              initial={{ width: 0 }}
              animate={{ width: '40%' }}
              exit={{ width: 0 }}
            >
              <ResearchChatSheet
                messages={chat.messages}
                isLoading={chat.isLoading}
                error={chat.error}
                onSendMessage={chat.sendMessage}
                onClose={() => chat.toggleChat(false)}
                onInsertSuggestion={handleInsertFromChat}
                onClearChat={chat.clearChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
