import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CalendarPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { PlatformCard } from './PlatformCard';

const ALL_PLATFORMS = ['spotify', 'youtube', 'instagram', 'tiktok', 'linkedin', 'twitter', 'newsletter', 'blog'];

interface CaptionData {
  platform: string;
  caption: string;
  hashtags: string[];
  scheduledAt?: Date;
  status: string;
}

interface DistributionPanelProps {
  projectId: string;
  content: string;
}

export const DistributionPanel: React.FC<DistributionPanelProps> = ({ projectId, content }) => {
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAll = async () => {
    try {
      setGenerating(true);
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke('studio-generate-captions', {
        body: { content, platforms: ALL_PLATFORMS },
      });

      if (fnError) throw fnError;

      const generated: CaptionData[] = ALL_PLATFORMS.map(platform => {
        const result = data?.captions?.[platform] || {};
        return {
          platform,
          caption: result.caption || '',
          hashtags: result.hashtags || [],
          status: 'draft',
        };
      });
      setCaptions(generated);
    } catch (err) {
      console.error('Caption generation failed:', err);
      setError('Falha ao gerar captions. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCaptionChange = (platform: string, newCaption: string) => {
    setCaptions(prev => prev.map(c => c.platform === platform ? { ...c, caption: newCaption } : c));
  };

  const handleSchedule = (platform: string, date: Date) => {
    setCaptions(prev => prev.map(c =>
      c.platform === platform ? { ...c, scheduledAt: date, status: 'scheduled' } : c
    ));
  };

  const handleScheduleAll = async () => {
    try {
      setScheduling(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const toInsert = captions
        .filter(c => c.caption.trim())
        .map(c => ({
          user_id: user.id,
          project_id: projectId,
          platform: c.platform,
          scheduled_at: c.scheduledAt?.toISOString() || new Date().toISOString(),
          status: c.scheduledAt ? 'scheduled' : 'draft',
          caption: c.caption,
          hashtags: c.hashtags,
          metadata: {},
        }));

      if (toInsert.length === 0) return;

      const { error: insertError } = await supabase
        .from('studio_content_calendar')
        .insert(toInsert);

      if (insertError) throw insertError;

      setCaptions(prev => prev.map(c => ({ ...c, status: c.scheduledAt ? 'scheduled' : c.status })));
    } catch (err) {
      console.error('Schedule failed:', err);
      setError('Falha ao agendar conteudo. Tente novamente.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Button */}
      {captions.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <button
            onClick={handleGenerateAll}
            disabled={generating || !content.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Gerar Captions para Todas as Plataformas
              </>
            )}
          </button>
          {!content.trim() && (
            <p className="text-xs text-ceramic-text-secondary mt-2">Adicione conteudo base para gerar captions.</p>
          )}
        </motion.div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 text-sm text-ceramic-error">
          {error}
        </div>
      )}

      {/* Platform Cards Grid */}
      {captions.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {captions.map(c => (
              <PlatformCard
                key={c.platform}
                platform={c.platform}
                caption={c.caption}
                hashtags={c.hashtags}
                scheduledAt={c.scheduledAt}
                status={c.status}
                onCaptionChange={caption => handleCaptionChange(c.platform, caption)}
                onSchedule={date => handleSchedule(c.platform, date)}
              />
            ))}
          </div>

          {/* Schedule All */}
          <div className="flex justify-center">
            <button
              onClick={handleScheduleAll}
              disabled={scheduling}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {scheduling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-5 h-5" />
                  Agendar Tudo
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
