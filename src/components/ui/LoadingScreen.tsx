import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

/**
 * LoadingScreen - Fallback component for React.lazy Suspense boundaries
 *
 * Used during route-level code splitting to show a loading state
 * while the lazy-loaded chunk is being fetched.
 *
 * Design follows the Ceramic Design System patterns.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Carregando...'
}) => {
  return (
    <div className="h-screen w-full bg-ceramic-base flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto ceramic-concave rounded-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-ceramic-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-ceramic-text-secondary text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Inline loading fallback for smaller lazy-loaded components
 * Use this when you don't need a full-screen loading state
 */
export const LoadingInline: React.FC<LoadingScreenProps> = ({
  message = 'Carregando...'
}) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 mx-auto ceramic-inset rounded-full flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-ceramic-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-ceramic-text-secondary text-xs font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
