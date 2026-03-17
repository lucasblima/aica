/**
 * StudioBrandKitPage - Standalone page for managing Brand Kit
 *
 * Accessible from Studio Library quick links at /studio/brandkit.
 * Loads the user's existing brand kit (if any) and renders BrandKitEditor
 * with BrandKitPreview side-by-side.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { createNamespacedLogger } from '@/lib/logger';
import { CeramicLoadingState } from '@/components/ui';
import { HeaderGlobal } from '@/components/layout';

import { BrandKitEditor } from '../components/brandkit';
import { BrandKitPreview } from '../components/brandkit';
import type { StudioBrandKit } from '../types/studio';

const log = createNamespacedLogger('StudioBrandKitPage');

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

export default function StudioBrandKitPage() {
  const navigate = useNavigate();
  const [brandKit, setBrandKit] = useState<StudioBrandKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBrandKit = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('studio_brand_kits')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) setBrandKit(mapRowToKit(data));
      } catch (err) {
        log.error('Failed to load brand kit:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrandKit();
  }, []);

  const handleSaved = (kit: StudioBrandKit) => {
    setBrandKit(kit);
  };

  return (
    <div className="h-screen w-full bg-ceramic-base flex flex-col overflow-hidden">
      <HeaderGlobal
        title="Brand Kit"
        subtitle="IDENTIDADE VISUAL"
        onLogoClick={() => navigate('/studio')}
      />

      <main className="flex-1 overflow-y-auto px-6 pb-16 pt-4">
        {/* Back link */}
        <button
          onClick={() => navigate('/studio')}
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Biblioteca
        </button>

        {loading ? (
          <CeramicLoadingState module="studio" variant="card" lines={4} message="Carregando brand kit..." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
            {/* Editor */}
            <BrandKitEditor
              brandKit={brandKit}
              onSaved={handleSaved}
            />

            {/* Preview */}
            {brandKit && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ceramic-text-secondary flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Pre-visualização
                </h3>
                <BrandKitPreview brandKit={brandKit} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
