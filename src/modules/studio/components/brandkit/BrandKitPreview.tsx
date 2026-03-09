import React from 'react';
import { Palette, Type, Volume2, MessageSquare } from 'lucide-react';
import type { StudioBrandKit } from '@/modules/studio/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const TONE_LABELS: Record<string, string> = {
  profissional: 'Profissional',
  casual: 'Casual',
  academico: 'Acad\u00eamico',
  humoristico: 'Humor\u00edstico',
  inspiracional: 'Inspiracional',
};

// ============================================================================
// TYPES
// ============================================================================

interface BrandKitPreviewProps {
  brandKit: StudioBrandKit;
  /** If true, shows a compact version */
  compact?: boolean;
  /** Click handler for selecting the card */
  onClick?: () => void;
  /** Whether this card is currently selected */
  selected?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BrandKitPreview: React.FC<BrandKitPreviewProps> = ({
  brandKit,
  compact = false,
  onClick,
  selected = false,
}) => {
  const toneLabel = brandKit.toneOfVoice
    ? TONE_LABELS[brandKit.toneOfVoice] || brandKit.toneOfVoice
    : null;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      className={`
        bg-ceramic-base rounded-xl border p-4 transition-all
        ${selected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-ceramic-border'}
        ${onClick ? 'cursor-pointer hover:border-amber-400 hover:shadow-md' : ''}
        ${compact ? 'space-y-2' : 'space-y-4'}
      `}
    >
      {/* Header: Logo + Brand Name */}
      <div className="flex items-center gap-3">
        {brandKit.logoUrl ? (
          <img
            src={brandKit.logoUrl}
            alt={`Logo de ${brandKit.brandName}`}
            className="w-10 h-10 rounded-lg object-cover border border-ceramic-border flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: brandKit.colorPrimary }}
          >
            {brandKit.brandName.charAt(0).toUpperCase()}
          </div>
        )}
        <h4
          className="text-base font-semibold text-ceramic-text-primary truncate"
          style={{ fontFamily: brandKit.fontHeading }}
        >
          {brandKit.brandName}
        </h4>
      </div>

      {!compact && (
        <>
          {/* Color Swatches */}
          <div className="flex items-center gap-3">
            <Palette className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border border-ceramic-border"
                style={{ backgroundColor: brandKit.colorPrimary }}
                title={`Prim\u00e1ria: ${brandKit.colorPrimary}`}
              />
              <div
                className="w-8 h-8 rounded-lg border border-ceramic-border"
                style={{ backgroundColor: brandKit.colorSecondary }}
                title={`Secund\u00e1ria: ${brandKit.colorSecondary}`}
              />
              <span className="text-xs text-ceramic-text-secondary ml-1">
                {brandKit.colorPrimary} / {brandKit.colorSecondary}
              </span>
            </div>
          </div>

          {/* Typography Sample */}
          <div className="flex items-start gap-3">
            <Type className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p
                className="text-sm font-semibold text-ceramic-text-primary"
                style={{ fontFamily: brandKit.fontHeading }}
              >
                {brandKit.fontHeading} (t\u00edtulos)
              </p>
              <p
                className="text-sm text-ceramic-text-secondary"
                style={{ fontFamily: brandKit.fontBody }}
              >
                {brandKit.fontBody} \u2014 Exemplo de texto com a fonte de corpo selecionada.
              </p>
            </div>
          </div>

          {/* Tone of Voice */}
          {toneLabel && (
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {toneLabel}
              </span>
            </div>
          )}

          {/* Audio indicators */}
          {(brandKit.introAudioUrl || brandKit.outroAudioUrl) && (
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-ceramic-text-secondary flex-shrink-0" />
              <div className="flex gap-2">
                {brandKit.introAudioUrl && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-secondary">
                    Intro
                  </span>
                )}
                {brandKit.outroAudioUrl && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ceramic-cool text-ceramic-text-secondary">
                    Outro
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Compact mode: just color swatches + tone */}
      {compact && (
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded border border-ceramic-border"
            style={{ backgroundColor: brandKit.colorPrimary }}
          />
          <div
            className="w-5 h-5 rounded border border-ceramic-border"
            style={{ backgroundColor: brandKit.colorSecondary }}
          />
          {toneLabel && (
            <span className="text-xs text-ceramic-text-secondary ml-1">{toneLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
