import React from 'react';

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  spotify: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  youtube: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  instagram: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  tiktok: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  linkedin: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  twitter: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
  newsletter: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  blog: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
};

const PLATFORM_ABBREV: Record<string, string> = {
  spotify: 'SP',
  youtube: 'YT',
  instagram: 'IG',
  tiktok: 'TT',
  linkedin: 'LI',
  twitter: 'X',
  newsletter: 'NL',
  blog: 'BL',
};

const PLATFORM_NAMES: Record<string, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
  newsletter: 'Newsletter',
  blog: 'Blog',
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-ceramic-cool text-ceramic-text-secondary' },
  scheduled: { label: 'Agendado', className: 'bg-ceramic-info/10 text-ceramic-info' },
  published: { label: 'Publicado', className: 'bg-ceramic-success/10 text-ceramic-success' },
};

interface PlatformCardProps {
  platform: string;
  caption: string;
  hashtags: string[];
  scheduledAt?: Date;
  status: string;
  onCaptionChange: (caption: string) => void;
  onSchedule: (date: Date) => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  platform,
  caption,
  hashtags,
  scheduledAt,
  status,
  onCaptionChange,
  onSchedule,
}) => {
  const colors = PLATFORM_COLORS[platform] || PLATFORM_COLORS.blog;
  const abbrev = PLATFORM_ABBREV[platform] || platform.slice(0, 2).toUpperCase();
  const name = PLATFORM_NAMES[platform] || platform;
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.draft;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) onSchedule(new Date(val));
  };

  return (
    <div className="ceramic-card rounded-2xl overflow-hidden flex flex-col">
      {/* Colored Header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${colors.bg} border-b ${colors.border}`}>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${colors.text} bg-white/60`}>
          {abbrev}
        </span>
        <span className={`text-sm font-bold ${colors.text}`}>{name}</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Caption textarea */}
        <textarea
          value={caption}
          onChange={e => onCaptionChange(e.target.value)}
          rows={4}
          className="w-full rounded-xl bg-ceramic-cool border border-ceramic-border p-3 text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          placeholder="Caption para esta plataforma..."
        />

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Schedule input */}
        <div className="mt-auto">
          <label className="text-[10px] font-bold uppercase tracking-wider text-ceramic-text-secondary mb-1 block">
            Agendar para
          </label>
          <input
            type="datetime-local"
            value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
            onChange={handleDateChange}
            className="w-full rounded-xl bg-ceramic-cool border border-ceramic-border px-3 py-2 text-sm text-ceramic-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>
      </div>
    </div>
  );
};
