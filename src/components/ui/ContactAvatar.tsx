/**
 * ContactAvatar
 * Displays a contact avatar with intelligent fallback chain:
 * 1. WhatsApp profile picture (if available)
 * 2. Custom avatar URL
 * 3. Initials based on name
 *
 * Used in: WhatsAppContactCard, ContactCard, ContactDetailModal
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// Supabase URL for proxy endpoint
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/**
 * Get proxied URL for WhatsApp profile pictures
 * WhatsApp blocks direct hotlinking, so we proxy through our Edge Function
 *
 * Issue #180: Supports Supabase Storage URLs which don't need proxying
 */
function getProxiedWhatsAppUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Supabase Storage URLs don't need proxying (Issue #180)
  if (url.includes('supabase.co/storage') || url.includes('supabase.in/storage')) {
    return url;
  }

  // Only proxy WhatsApp CDN URLs (they expire and block hotlinking)
  if (url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net')) {
    return `${SUPABASE_URL}/functions/v1/proxy-whatsapp-image?url=${encodeURIComponent(url)}`;
  }

  // Return other URLs as-is
  return url;
}

export interface ContactAvatarProps {
  /** Contact name (used for initials fallback) */
  name: string | null | undefined;
  /** WhatsApp profile picture URL (highest priority) */
  whatsappProfilePicUrl?: string | null;
  /** Custom avatar URL (second priority) */
  avatarUrl?: string | null;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show online indicator */
  isOnline?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Generate initials from a name
 * "John Doe" → "JD"
 * "Maria" → "MA"
 * "José da Silva" → "JS"
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';

  const words = name.trim().split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) return '?';
  if (words.length === 1) {
    // Single word: take first two letters
    return words[0].substring(0, 2).toUpperCase();
  }

  // Multiple words: first letter of first and last word
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
}

/**
 * Generate a deterministic background color from name
 */
function getBackgroundColor(name: string | null | undefined): string {
  const colors = [
    'bg-ceramic-info',
    'bg-ceramic-success',
    'bg-amber-500',
    'bg-ceramic-accent',
    'bg-pink-500',
    'bg-ceramic-accent',
    'bg-teal-500',
    'bg-ceramic-warning',
    'bg-cyan-500',
    'bg-rose-500',
  ];

  if (!name) return colors[0];

  // Simple hash based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Size classes for different variants
 */
const sizeClasses = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-[10px]',
    indicator: 'w-1.5 h-1.5 border',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    indicator: 'w-2 h-2 border',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    indicator: 'w-2.5 h-2.5 border-2',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base',
    indicator: 'w-3 h-3 border-2',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-lg',
    indicator: 'w-3.5 h-3.5 border-2',
  },
};

export function ContactAvatar({
  name,
  whatsappProfilePicUrl,
  avatarUrl,
  size = 'md',
  isOnline,
  className,
  onClick,
}: ContactAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Determine which image to show (with WhatsApp proxy)
  const imageUrl = useMemo(() => {
    if (imageError && fallbackError) return null;
    if (imageError) return avatarUrl;
    // Proxy WhatsApp URLs to avoid 403 hotlink protection
    const proxiedWhatsApp = getProxiedWhatsAppUrl(whatsappProfilePicUrl);
    return proxiedWhatsApp || avatarUrl;
  }, [whatsappProfilePicUrl, avatarUrl, imageError, fallbackError]);

  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => getBackgroundColor(name), [name]);
  const sizes = sizeClasses[size];

  const handleImageError = () => {
    if (!imageError) {
      // First error: try fallback
      setImageError(true);
    } else {
      // Second error: show initials
      setFallbackError(true);
    }
  };

  const showImage = imageUrl && !fallbackError;

  const containerClasses = cn(
    'relative inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
    sizes.container,
    !showImage && bgColor,
    onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
    className
  );

  return (
    <div
      className={containerClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name || 'Contact'}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span className={cn('font-medium text-white select-none', sizes.text)}>
          {initials}
        </span>
      )}

      {/* Online indicator */}
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white',
            sizes.indicator,
            isOnline ? 'bg-ceramic-success' : 'bg-ceramic-text-tertiary'
          )}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

export default ContactAvatar;
