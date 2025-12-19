/**
 * @deprecated Replaced by src/modules/studio/views/StudioWorkspace.tsx
 * Will be removed in version 2.0
 */

import React, { useState, useEffect } from 'react';
import { Dossier } from '../types';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useStudioData } from '../hooks/useStudioData';
import { TopicManager } from '../components/studio/TopicManager';
import { BioPanel } from '../components/studio/BioPanel';
import { LiveConsole } from '../components/studio/LiveConsole';
import { AudioConsole } from '../components/AudioConsole';
import { chatWithAica, suggestDynamicTopic } from '../services/geminiService';

interface Props {
  dossier: Dossier;
  projectId: string;
  onBack: () => void;
  className?: string;
}

const StudioMode: React.FC<Props> = ({ dossier, projectId, onBack, className }) => {
  // --- Hooks ---
  const {
    topics,
    categories,
    highlightedIds,
    localIceBreakers,
    isEditingProject,
    addTopic,
    toggleTopic,
    archiveTopic,
    handleDragEnd,
    updateIceBreakers,
    updateProjectInfo,
    setIsEditingProject
  } = useStudioData({ projectId, dossier });

  const {
    liveMode,
    connectionStatus,
    realtimeTranscript,
    audioLevel,
    startSession,
    stopSession,
    isLiveDisabled
  } = useGeminiLive({ dossier });

  // --- Local State ---
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSuggestingTopic, setIsSuggestingTopic] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // --- Handlers ---
  const handleSuggestTopic = async () => {
    setIsSuggestingTopic(true);
    try {
      const suggested = await suggestDynamicTopic(dossier, null);
      if (suggested) addTopic(suggested);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSuggestingTopic(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    setChatMessages(prev => [...prev, { role: 'user', text }]);
    setIsChatLoading(true);
    try {
      const context = `Convidado: ${dossier.guestName}. Tema: ${dossier.episodeTheme}. Bio: ${dossier.biography}`;
      const response = await chatWithAica(text, context);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full text-[#5C554B] font-sans overflow-hidden ${className || ''}`}>
      {/* Main Grid - Sem header duplicado, o StudioLayout fornece o header */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">

        {/* Left Column: Topics (3 cols) */}
        <div className="col-span-3 h-full overflow-hidden">
          <TopicManager
            topics={topics}
            categories={categories}
            highlightedIds={highlightedIds}
            iceBreakers={localIceBreakers}
            onAddTopic={addTopic}
            onToggleTopic={toggleTopic}
            onArchiveTopic={archiveTopic}
            onDragEnd={handleDragEnd}
            onUpdateIceBreakers={updateIceBreakers}
            onSuggestTopic={handleSuggestTopic}
            isSuggesting={isSuggestingTopic}
          />
        </div>

        {/* Center Column: Bio/Info (6 cols) */}
        <div className="col-span-6 h-full overflow-hidden">
          <BioPanel dossier={dossier} />
        </div>

        {/* Right Column: Live Console (3 cols) */}
        <div className="col-span-3 h-full overflow-hidden">
          <LiveConsole
            liveMode={liveMode}
            connectionStatus={connectionStatus}
            transcript={realtimeTranscript}
            audioLevel={audioLevel}
            onStartSession={startSession}
            onStopSession={stopSession}
            onSendMessage={handleSendMessage}
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            isLiveDisabled={isLiveDisabled}
          />
        </div>
      </div>

      {/* Audio Console (Floating) */}
      <AudioConsole
        isRecording={isRunning}
        onToggleRecording={() => setIsRunning(!isRunning)}
        recordingDuration={elapsedTime}
        isGuestConnected={connectionStatus === 'connected'}
      />
    </div>
  );
};

export default StudioMode;
