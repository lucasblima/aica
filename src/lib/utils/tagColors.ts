/**
 * Shared tag color utility — deterministic color for tag names
 */

const TAG_COLORS = [
  'bg-ceramic-info/10 text-ceramic-info border-ceramic-info/30',
  'bg-ceramic-accent/10 text-ceramic-accent border-ceramic-accent/30',
  'bg-ceramic-error/10 text-ceramic-error border-ceramic-error/30',
  'bg-ceramic-warning/10 text-ceramic-warning border-ceramic-warning/30',
  'bg-ceramic-success/10 text-ceramic-success border-ceramic-success/30',
  'bg-ceramic-info/15 text-ceramic-info border-ceramic-info/25',
  'bg-ceramic-accent/15 text-ceramic-accent border-ceramic-accent/25',
  'bg-ceramic-error/15 text-ceramic-error border-ceramic-error/25',
];

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash = hash & hash;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}
