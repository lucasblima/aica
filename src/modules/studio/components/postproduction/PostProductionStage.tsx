import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, BookOpen, Quote, Scissors } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioTranscription, StudioShowNotes, StudioClip } from '../../types/studio';
import TranscriptionPanel from './TranscriptionPanel';
import ShowNotesPanel from './ShowNotesPanel';
import QuoteExtractorPanel from './QuoteExtractorPanel';
import ClipSuggestionPanel from './ClipSuggestionPanel';

interface PostProductionStageProps {
  projectId: string;
  episodeId: string;
}

type TabId = 'transcricao' | 'shownotes' | 'quotes' | 'clips';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'transcricao', label: 'Transcricao', icon: FileText },
  { id: 'shownotes', label: 'Show Notes', icon: BookOpen },
  { id: 'quotes', label: 'Quotes', icon: Quote },
  { id: 'clips', label: 'Clips', icon: Scissors },
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

  // Fetch existing data on mount
  useEffect(() => {
    async function loadExistingData() {
      setIsLoading(true);
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
      } catch {
        // Silently handle — panels will show empty states
      } finally {
        setIsLoading(false);
      }
    }

    loadExistingData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
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
      </div>
    </div>
  );
}
