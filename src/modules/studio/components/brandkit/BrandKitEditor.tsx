import React, { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Palette, Type, Music, AlertCircle } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import type { StudioBrandKit } from '@/modules/studio/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const TONE_OPTIONS = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'casual', label: 'Casual' },
  { value: 'academico', label: 'Acad\u00eamico' },
  { value: 'humoristico', label: 'Humor\u00edstico' },
  { value: 'inspiracional', label: 'Inspiracional' },
];

// ============================================================================
// TYPES
// ============================================================================

interface BrandKitEditorProps {
  /** Existing brand kit to edit (null = create new) */
  brandKit?: StudioBrandKit | null;
  /** Called after successful save */
  onSaved?: (kit: StudioBrandKit) => void;
  /** Called when user cancels editing */
  onCancel?: () => void;
}

interface FormData {
  brandName: string;
  logoUrl: string;
  colorPrimary: string;
  colorSecondary: string;
  fontHeading: string;
  fontBody: string;
  toneOfVoice: string;
  introAudioUrl: string;
  outroAudioUrl: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BrandKitEditor: React.FC<BrandKitEditorProps> = ({
  brandKit,
  onSaved,
  onCancel,
}) => {
  const [form, setForm] = useState<FormData>({
    brandName: '',
    logoUrl: '',
    colorPrimary: '#f59e0b',
    colorSecondary: '#d97706',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    toneOfVoice: 'profissional',
    introAudioUrl: '',
    outroAudioUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form if editing existing brand kit
  useEffect(() => {
    if (brandKit) {
      setForm({
        brandName: brandKit.brandName,
        logoUrl: brandKit.logoUrl || '',
        colorPrimary: brandKit.colorPrimary,
        colorSecondary: brandKit.colorSecondary,
        fontHeading: brandKit.fontHeading,
        fontBody: brandKit.fontBody,
        toneOfVoice: brandKit.toneOfVoice || 'profissional',
        introAudioUrl: brandKit.introAudioUrl || '',
        outroAudioUrl: brandKit.outroAudioUrl || '',
      });
    }
  }, [brandKit]);

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    if (!form.brandName.trim()) {
      setError('Nome da marca \u00e9 obrigat\u00f3rio.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usu\u00e1rio n\u00e3o autenticado.');
        return;
      }

      const row = {
        user_id: user.id,
        brand_name: form.brandName.trim(),
        logo_url: form.logoUrl.trim() || null,
        color_primary: form.colorPrimary,
        color_secondary: form.colorSecondary,
        font_heading: form.fontHeading,
        font_body: form.fontBody,
        tone_of_voice: form.toneOfVoice || null,
        intro_audio_url: form.introAudioUrl.trim() || null,
        outro_audio_url: form.outroAudioUrl.trim() || null,
      };

      if (brandKit?.id) {
        // Update existing
        const { data, error: updateErr } = await supabase
          .from('studio_brand_kits')
          .update(row)
          .eq('id', brandKit.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        if (data && onSaved) onSaved(mapRowToKit(data));
      } else {
        // Insert new
        const { data, error: insertErr } = await supabase
          .from('studio_brand_kits')
          .insert(row)
          .select()
          .single();

        if (insertErr) throw insertErr;
        if (data && onSaved) onSaved(mapRowToKit(data));
      }
    } catch (err) {
      console.error('Brand kit save failed:', err);
      setError('Falha ao salvar o brand kit. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-ceramic-base rounded-xl border border-ceramic-border p-6 space-y-6">
      <h3 className="text-lg font-semibold text-ceramic-text-primary">
        {brandKit ? 'Editar Brand Kit' : 'Novo Brand Kit'}
      </h3>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-ceramic-error/10 border border-ceramic-error/30">
          <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0" />
          <span className="text-sm text-ceramic-error">{error}</span>
        </div>
      )}

      {/* Brand Name */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-ceramic-text-primary">
          Nome da Marca *
        </label>
        <input
          type="text"
          value={form.brandName}
          onChange={e => updateField('brandName', e.target.value)}
          placeholder="Ex: Meu Podcast Incrivel"
          className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
      </div>

      {/* Logo URL */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-ceramic-text-primary">
          URL do Logo
        </label>
        <input
          type="url"
          value={form.logoUrl}
          onChange={e => updateField('logoUrl', e.target.value)}
          placeholder="https://exemplo.com/logo.png"
          className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary placeholder:text-ceramic-text-secondary focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        />
        {form.logoUrl && (
          <div className="mt-2 flex items-center gap-3">
            <img
              src={form.logoUrl}
              alt="Preview do logo"
              className="w-12 h-12 rounded-lg object-cover border border-ceramic-border"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-xs text-ceramic-text-secondary">Preview do logo</span>
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-ceramic-text-primary">
          <Palette className="w-4 h-4" />
          Cores
        </label>
        <div className="flex gap-4">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-ceramic-text-secondary">Prim\u00e1ria</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.colorPrimary}
                onChange={e => updateField('colorPrimary', e.target.value)}
                className="w-10 h-10 rounded-lg border border-ceramic-border cursor-pointer"
              />
              <input
                type="text"
                value={form.colorPrimary}
                onChange={e => updateField('colorPrimary', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-ceramic-text-secondary">Secund\u00e1ria</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.colorSecondary}
                onChange={e => updateField('colorSecondary', e.target.value)}
                className="w-10 h-10 rounded-lg border border-ceramic-border cursor-pointer"
              />
              <input
                type="text"
                value={form.colorSecondary}
                onChange={e => updateField('colorSecondary', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fonts */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-ceramic-text-primary">
          <Type className="w-4 h-4" />
          Fontes
        </label>
        <div className="flex gap-4">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-ceramic-text-secondary">T\u00edtulos</span>
            <select
              value={form.fontHeading}
              onChange={e => updateField('fontHeading', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-ceramic-text-secondary">Corpo</span>
            <select
              value={form.fontBody}
              onChange={e => updateField('fontBody', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              {FONT_OPTIONS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tone of Voice */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-ceramic-text-primary">
          Tom de Voz
        </label>
        <select
          value={form.toneOfVoice}
          onChange={e => updateField('toneOfVoice', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
        >
          {TONE_OPTIONS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Audio Assets */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-ceramic-text-primary">
          <Music className="w-4 h-4" />
          \u00c1udio (Intro / Outro)
        </label>
        <div className="flex gap-4">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-ceramic-text-secondary">URL do \u00c1udio de Intro</span>
            <input
              type="url"
              value={form.introAudioUrl}
              onChange={e => updateField('introAudioUrl', e.target.value)}
              placeholder="https://exemplo.com/intro.mp3"
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary placeholder:text-ceramic-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-ceramic-text-secondary">URL do \u00c1udio de Outro</span>
            <input
              type="url"
              value={form.outroAudioUrl}
              onChange={e => updateField('outroAudioUrl', e.target.value)}
              placeholder="https://exemplo.com/outro.mp3"
              className="w-full px-3 py-2 rounded-lg border border-ceramic-border bg-ceramic-cool text-ceramic-text-primary placeholder:text-ceramic-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-ceramic-border text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors text-sm"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !form.brandName.trim()}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Brand Kit
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================

/** Maps a Supabase row to the StudioBrandKit TypeScript type */
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
