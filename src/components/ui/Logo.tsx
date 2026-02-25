import React from 'react';

type LogoVariant = 'default' | 'inverted';

interface LogoProps {
  /**
   * Logo variant:
   * - 'default': Blue background logo (for light backgrounds)
   * - 'inverted': White background logo (for dark/colored backgrounds)
   */
  variant?: LogoVariant;
  /** Optional className for custom styling (size, margins, etc.) */
  className?: string;
  /** Width in pixels or CSS value */
  width?: number | string;
  /** Height in pixels or CSS value (optional, maintains aspect ratio if not set) */
  height?: number | string;
  /** Alt text for accessibility */
  alt?: string;
  /** Optional click handler — when provided, logo becomes a clickable button */
  onClick?: () => void;
}

const logoSources: Record<LogoVariant, string> = {
  default: '/assets/images/logo-aica-blue.png',
  inverted: '/assets/images/logo-aica-white.png',
};

/**
 * Aica Brand Logo Component
 *
 * Reusable logo component that supports two variants:
 * - default (blue background): Use on light/ceramic backgrounds
 * - inverted (white background): Use on dark or colored backgrounds
 *
 * @example
 * // Basic usage
 * <Logo />
 *
 * // With custom width
 * <Logo width={120} />
 *
 * // Inverted variant for dark backgrounds
 * <Logo variant="inverted" />
 *
 * // With custom className
 * <Logo className="rounded-full shadow-lg" width={80} />
 *
 * // Clickable logo for navigation
 * <Logo onClick={() => navigate('/vida')} />
 */
export function Logo({
  variant = 'default',
  className = '',
  width,
  height,
  alt = 'Aica Life OS',
  onClick,
}: LogoProps) {
  const src = logoSources[variant];

  const style: React.CSSProperties = {};
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  const img = (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      style={style}
      loading="eager"
    />
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded-lg"
        aria-label="Voltar para início"
        type="button"
      >
        {img}
      </button>
    );
  }

  return img;
}

export default Logo;
