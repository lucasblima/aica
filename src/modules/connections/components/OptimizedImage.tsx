/**
 * OptimizedImage Component
 *
 * Image component with lazy loading, blur placeholder, and error handling
 * Supports Supabase Storage transformations for optimal performance
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="https://..."
 *   alt="Property photo"
 *   width={400}
 *   height={300}
 *   placeholder="blur"
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty';
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  fallbackSrc = '/images/placeholder.svg',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  useEffect(() => {
    setImageSrc(src);
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setImageSrc(fallbackSrc);
    onError?.();
  };

  // Gera URL otimizada para Supabase Storage
  const getOptimizedUrl = (url: string): string => {
    // Se for URL do Supabase Storage, adicionar transformações
    if (url.includes('supabase.co/storage')) {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);

      // Adicionar transformações se não existirem
      if (width && !params.has('width')) {
        params.set('width', width.toString());
      }
      if (height && !params.has('height')) {
        params.set('height', height.toString());
      }
      if (!params.has('quality')) {
        params.set('quality', '85');
      }

      urlObj.search = params.toString();
      return urlObj.toString();
    }

    return url;
  };

  const optimizedSrc = getOptimizedUrl(imageSrc);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Blur placeholder */}
      {!loaded && placeholder === 'blur' && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-ceramic-cool to-ceramic-border animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${loaded ? 'opacity-100' : 'opacity-0'}
          ${error ? 'opacity-50' : ''}
        `}
        width={width}
        height={height}
      />

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ceramic-base">
          <div className="text-center text-ceramic-text-tertiary">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Imagem não disponível</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * OptimizedAvatar Component
 *
 * Optimized circular avatar with initials fallback
 */

interface OptimizedAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function OptimizedAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: OptimizedAvatarProps) {
  const [error, setError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name: string): string => {
    const colors = [
      'bg-ceramic-error',
      'bg-ceramic-warning',
      'bg-ceramic-warning/80',
      'bg-ceramic-warning/60',
      'bg-ceramic-success/80',
      'bg-ceramic-success',
      'bg-ceramic-success/90',
      'bg-ceramic-success/70',
      'bg-ceramic-info/80',
      'bg-ceramic-info/70',
      'bg-ceramic-info',
      'bg-ceramic-accent',
      'bg-ceramic-accent/80',
      'bg-ceramic-accent/70',
      'bg-ceramic-accent/60',
      'bg-ceramic-error/80',
      'bg-ceramic-error/70',
    ];

    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!src || error) {
    return (
      <div
        className={`
          ${sizeClasses[size]}
          ${getColorFromName(name)}
          rounded-full
          flex items-center justify-center
          text-white font-semibold
          ${className}
        `}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setError(true)}
      className={`
        ${sizeClasses[size]}
        rounded-full
        object-cover
        ${className}
      `}
    />
  );
}

export default OptimizedImage;
