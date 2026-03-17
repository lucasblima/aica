import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, BookOpen, Quote, Scissors, RefreshCw, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { CeramicLoadingState } from '@/components/ui';
import type { StudioTranscription, StudioShowNotes, StudioClip } from '../../types/studio';
import TranscriptionPanel from './TranscriptionPanel';
import ShowNotesPanel from './ShowNotesPanel';
import QuoteExtractorPanel from './QuoteExtractorPanel';
import ClipSuggestionPanel from './ClipSuggestionPanel';
import { TeamPanel } from '../collaboration';
import { CommentThread } from '../collaboration';

interface PostProductionStageProps {
  projectId: string;
  episodeId: string;
}

type TabId = 'transcricao' | 'shownotes' | 'quotes' | 'clips' | 'equipe' | 'comentarios';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'transcricao', label: 'Transcricao', icon: FileText },
  { id: 'shownotes', label: 'Show Notes', icon: BookOpen },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'clips', label: 'Clips', icon: Scissors },
  { id: 'equipe', label: 'Equipe', icon: Users },
  { id: 'comentarios', label: 'Comentarios', icon: MessageSquare },
];

export default function PostProductionStage({
  projectId,
  episodeId,
}: PostProductionStageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('transcricao');
  const [transcription, setTranscription] = useState<StudioTranscription | null>(null);
  const [showNotes, setShowNotes] = useState<StudioShowNotes | null>(null);
  const [clips, setClips] = useState<StudioClip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch existing data on mount
  const loadExistingData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
        const [transcRes, notesRes, clipsRes] = await Promise.all([
          supabase
            .from('studio_transcriptions')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('studio_show_notes')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('studio_clips')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
        ]);

        if (transcRes.data) {
          setTranscription({
            id: transcRes.data.id,
            userId: transcRes.data.user_id,
            projectId: transcRes.data.project_id,
            content: transcRes.data.content,
            language: transcRes.data.language,
            durationSeconds: transcRes.data.duration_seconds,
            speakers: transcRes.data.speakers || [],
            chapters: transcRes.data.chapters || [],
            wordCount: transcRes.data.word_count,
            createdAt: new Date(transcRes.data.created_at),
          });
        }

        if (notesRes.data) {
          setShowNotes({
            id: notesRes.data.id,
            userId: notesRes.data.user_id,
            projectId: notesRes.data.project_id,
            summary: notesRes.data.summary,
            highlights: notesRes.data.highlights || [],
            keyQuotes: notesRes.data.key_quotes || [],
            seoDescription: notesRes.data.seo_description,
            tags: notesRes.data.tags || [],
            createdAt: new Date(notesRes.data.created_at),
          });
        }

        if (clipsRes.data && clipsRes.data.length > 0) {
          setClips(
            clipsRes.data.map((c: any) => ({
              id: c.id,
              userId: c.user_id,
              projectId: c.project_id,
              title: c.title,
              startTimeSeconds: c.start_time_seconds,
              endTimeSeconds: c.end_time_seconds,
              transcriptSegment: c.transcript_segment,
              platform: c.platform,
              status: c.status,
              caption: c.caption || '',
              hashtags: c.hashtags || [],
              thumbnailUrl: c.thumbnail_url,
              createdAt: new Date(c.created_at),
            }))
          );
        }
      } catch (err: any) {
        setLoadError(err.message || 'Erro ao carregar dados de pos-produção');
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    loadExistingData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="p-6">
        <CeramicLoadingState module="studio" variant="card" lines={4} message="Carregando pos-produção..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <p className="text-sm text-ceramic-error mb-4">{loadError}</p>
        <button
          onClick={loadExistingData}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          aria-label="Tentar carregar dados novamente"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2 border-b border-ceramic-border overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative
                ${isActive
                  ? 'text-amber-600'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary hover:bg-ceramic-cool'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="postprod-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'transcricao' && (
          <TranscriptionPanel
            projectId={projectId}
            transcription={transcription}
            onTranscriptionGenerated={setTranscription}
          />
        )}
        {activeTab === 'shownotes' && (
          <ShowNotesPanel
            projectId={projectId}
            showNotes={showNotes}
            transcription={transcription}
            onShowNotesGenerated={setShowNotes}
          />
        )}
        {activeTab === 'quotes' && (
          <QuoteExtractorPanel
            projectId={projectId}
            transcription={transcription}
          />
        )}
        {activeTab === 'clips' && (
          <ClipSuggestionPanel
            projectId={projectId}
            transcription={transcription}
            clips={clips}
            onClipsGenerated={setClips}
          />
        )}
        {activeTab === 'equipe' && (
          <TeamPanel projectId={projectId} />
        )}
        {activeTab === 'comentarios' && (
          <CommentThread projectId={projectId} />
        )}
      </div>
    </div>
  );
}
