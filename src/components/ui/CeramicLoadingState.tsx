import React from 'react';

const MODULE_PHRASES: Record<string, string> = {
  journey: 'Organizando seus pensamentos...',
  atlas: 'Ordenando suas prioridades...',
  studio: 'Afinando o estudio...',
  finance: 'Calculando seus numeros...',
  grants: 'Analisando os editais...',
  connections: 'Reunindo suas conexoes...',
  flux: 'Preparando os treinos...',
  agenda: 'Consultando sua agenda...',
};

interface CeramicLoadingStateProps {
  module?: string;
  variant?: 'card' | 'list' | 'page';
  lines?: number;
  message?: string;
}

export function CeramicLoadingState({
  module,
  variant = 'card',
  lines = 3,
  message,
}: CeramicLoadingStateProps) {
  const phrase = message || (module && MODULE_PHRASES[module]) || 'Carregando...';

  if (variant === 'page') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-full max-w-sm space-y-4 animate-pulse">
          <div className="h-8 w-2/3 mx-auto bg-ceramic-text-secondary/10 rounded-lg" />
          <div className="h-32 w-full bg-ceramic-text-secondary/8 rounded-[20px]" />
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-ceramic-text-secondary/8 rounded-lg"
              style={{ width: `${85 - i * 15}%` }}
            />
          ))}
        </div>
        <p className="text-ceramic-text-secondary text-sm font-light">{phrase}</p>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-ceramic-text-secondary/8 rounded-[20px] animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
        <p className="text-ceramic-text-secondary text-sm font-light text-center mt-4">{phrase}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-2/3 bg-ceramic-text-secondary/10 rounded-lg" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-ceramic-text-secondary/8 rounded-lg"
          style={{ width: `${95 - i * 12}%` }}
        />
      ))}
      <p className="text-ceramic-text-secondary text-sm font-light mt-4">{phrase}</p>
    </div>
  );
}
