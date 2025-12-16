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
 */
export function Logo({
  variant = 'default',
  className = '',
  width,
  height,
  alt = 'Aica Life OS',
}: LogoProps) {
  const src = logoSources[variant];

  const style: React.CSSProperties = {};
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain ${className}`}
      style={style}
      loading="eager"
    />
  );
}

export default Logo;
