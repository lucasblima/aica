import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CalendarPlus, Loader2, RefreshCw, Palette } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { CeramicLoadingState } from '@/components/ui';
import { PlatformCard } from './PlatformCard';
import { BrandKitPreview } from '../brandkit';
import type { StudioBrandKit } from '@/modules/studio/types';

const log = createNamespacedLogger('DistributionPanel');

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

// ============================================================================
// HELPERS
// ============================================================================

function mapRowToKit(row: Record<string, unknown>): StudioBrandKit {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    brandName: row.brand_name as string,
    logoUrl: (row.logo_url as string) || undefined,
    colorPrimary: (row.color_primary as string) || '#f59e0b',
    colorSecondary: (row.color_secondary as string) || '#d97706',
    fontHeading: (row.font_heading as string) || 'Inter',
    fontBody: (row.font_body as string) || 'Inter',
    toneOfVoice: (row.tone_of_voice as string) || undefined,
    introAudioUrl: (row.intro_audio_url as string) || undefined,
    outroAudioUrl: (row.outro_audio_url as string) || undefined,
    createdAt: new Date(row.created_at as string),
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DistributionPanel: React.FC<DistributionPanelProps> = ({ projectId, content }) => {
  const [captions, setCaptions] = useState<CaptionData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Brand kit state
  const [brandKits, setBrandKits] = useState<StudioBrandKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [loadingKits, setLoadingKits] = useState(true);

  const selectedKit = brandKits.find(k => k.id === selectedKitId) || null;

  // Fetch user's brand kits on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchBrandKits() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data, error: fetchErr } = await supabase
          .from('studio_brand_kits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchErr) throw fetchErr;
        if (cancelled) return;

        const kits = (data || []).map(mapRowToKit);
        setBrandKits(kits);
        // Auto-select the first kit if available
        if (kits.length > 0) {
          setSelectedKitId(kits[0].id);
        }
      } catch (err) {
        log.error('Failed to fetch brand kits:', err);
      } finally {
        if (!cancelled) setLoadingKits(false);
      }
    }
    fetchBrandKits();
    return () => { cancelled = true; };
  }, []);

  const handleGenerateAll = async () => {
    try {
      setGenerating(true);
      setError(null);

      const body: Record<string, unknown> = {
        content,
        platforms: ALL_PLATFORMS,
      };

      // Include brand kit context if selected
      if (selectedKit) {
        body.brandKit = {
          brandName: selectedKit.brandName,
          toneOfVoice: selectedKit.toneOfVoice,
          colorPrimary: selectedKit.colorPrimary,
          colorSecondary: selectedKit.colorSecondary,
        };
      }

      const { data, error: fnError } = await supabase.functions.invoke('studio-generate-captions', {
        body,
      });

      if (fnError) throw fnError;

      const captionsData = data?.data || data?.captions || data || {};

      const generated: CaptionData[] = ALL_PLATFORMS.map(platform => {
        const result = captionsData[platform] || {};
        return {
          platform,
          caption: result.caption || '',
          hashtags: result.hashtags || [],
          status: 'draft',
        };
      });
      setCaptions(generated);
    } catch (err) {
      log.error('Caption generation failed:', err);
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
      log.error('Schedule failed:', err);
      setError('Falha ao agendar conteudo. Tente novamente.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Brand Kit Selector */}
      {!loadingKits && brandKits.length > 0 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-ceramic-text-primary">
            <Palette className="w-4 h-4" />
            Brand Kit
          </label>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedKitId(null)}
              className={`
                flex-shrink-0 px-3 py-2 rounded-lg border text-sm transition-all
                ${selectedKitId === null
                  ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500/30'
                  : 'border-ceramic-border text-ceramic-text-secondary hover:border-amber-400'
                }
              `}
            >
              Sem brand kit
            </button>
            {brandKits.map(kit => (
              <div key={kit.id} className="flex-shrink-0 w-56">
                <BrandKitPreview
                  brandKit={kit}
                  compact
                  selected={selectedKitId === kit.id}
                  onClick={() => setSelectedKitId(kit.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="p-3 rounded-xl bg-ceramic-error/10 border border-ceramic-error/30 flex items-center justify-between">
          <span className="text-sm text-ceramic-error">{error}</span>
          <button
            onClick={() => { setError(null); handleGenerateAll(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ceramic-error hover:bg-ceramic-error/10 rounded-lg transition-colors flex-shrink-0 ml-3"
            aria-label="Tentar gerar captions novamente"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading State for Caption Generation */}
      {generating && captions.length === 0 && (
        <div className="py-4">
          <CeramicLoadingState module="studio" variant="list" lines={4} message="Gerando captions para todas as plataformas..." />
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
