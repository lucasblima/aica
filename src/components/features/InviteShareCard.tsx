/**
 * InviteShareCard Component
 *
 * Compact card for the Home grid that shows invite availability
 * and opens the InviteModal on click.
 *
 * Ceramic Design: neumorphic card with amber accent, matching
 * the grid pattern of StudioCard/ConnectionsCard in Home.tsx.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Copy, Check } from 'lucide-react';
import { useInviteSystem } from '@/hooks/useInviteSystem';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';

interface InviteShareCardProps {
  compact?: boolean;
  onClick: () => void;
}

export function InviteShareCard({ compact = true, onClick }: InviteShareCardProps) {
  const { availableCount, stats, loading, conversionRate, pendingCount, copyLink } = useInviteSystem();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyLink]);

  const accepted = stats?.total_accepted ?? 0;

  if (loading) return null;

  return (
    <motion.div
      className="ceramic-card relative overflow-hidden p-3 min-h-[100px] flex flex-col group cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #F0EFE9 0%, #FEF3C7 100%)'
      }}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
      whileTap="pressed"
      onClick={onClick}
    >
      <Ticket className="absolute -right-2 -bottom-2 w-20 h-20 text-amber-500 opacity-10" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="ceramic-inset p-1.5">
              <Ticket className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
              Convites
            </span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-1">
            {availableCount > 0 && (
              <button
                onClick={handleCopyLink}
                className="ceramic-inset p-1 rounded-full hover:bg-white/40 transition-colors"
                title={copied ? 'Link copiado!' : 'Copiar link de convite'}
              >
                {copied ? (
                  <Check className="w-3 h-3 text-ceramic-success" />
                ) : (
                  <Copy className="w-3 h-3 text-amber-500" />
                )}
              </button>
            )}
            {availableCount > 0 && (
              <div className="ceramic-inset px-2 py-0.5 rounded-full">
                <span className="text-[10px] font-bold text-amber-600">
                  {availableCount}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-ceramic-text-secondary line-clamp-1">
          {availableCount > 0
            ? `${availableCount} convite${availableCount !== 1 ? 's' : ''} disponíve${availableCount !== 1 ? 'is' : 'l'}`
            : accepted > 0
              ? `${accepted} amigo${accepted !== 1 ? 's' : ''} convidado${accepted !== 1 ? 's' : ''}`
              : 'Convide amigos'
          }
        </p>
        {conversionRate > 0 && (
          <p className="text-[10px] text-ceramic-text-tertiary">
            Taxa: {Math.round(conversionRate * 100)}%
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default InviteShareCard;
