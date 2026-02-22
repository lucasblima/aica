/**
 * EF_HomeScreen - World/child selection grid
 *
 * Entry point for EraForge. Shows available worlds and children,
 * with a "Criar Mundo" button.
 */

import React from 'react';
import { ERA_CONFIG } from '../types/eraforge.types';
import type { World, ChildProfile } from '../types/eraforge.types';

interface EF_HomeScreenProps {
  worlds: World[];
  children: ChildProfile[];
  onSelectWorld: (world: World) => void;
  onSelectChild: (child: ChildProfile) => void;
  onCreateWorld: () => void;
  loading?: boolean;
}

export function EF_HomeScreen({
  worlds,
  children: childProfiles,
  onSelectWorld,
  onSelectChild,
  onCreateWorld,
  loading = false,
}: EF_HomeScreenProps) {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-3xl font-bold text-ceramic-text-primary"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          EraForge
        </h1>
        <p className="text-ceramic-text-secondary mt-2">
          Escolha um mundo para explorar
        </p>
      </div>

      {/* Children Section */}
      {childProfiles.length > 0 && (
        <div>
          <h2
            className="text-lg font-semibold text-ceramic-text-primary mb-3"
            style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
          >
            Jogadores
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {childProfiles.map(child => (
              <button
                key={child.id}
                onClick={() => onSelectChild(child)}
                aria-label={`Jogador: ${child.display_name}`}
                className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl bg-ceramic-card shadow-ceramic-emboss hover:scale-105 transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-ceramic-inset flex items-center justify-center text-2xl">
                  {child.avatar_emoji || '👤'}
                </div>
                <span className="text-sm font-medium text-ceramic-text-primary whitespace-nowrap">
                  {child.display_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Worlds Grid */}
      <div>
        <h2
          className="text-lg font-semibold text-ceramic-text-primary mb-3"
          style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
        >
          Mundos
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 rounded-xl bg-ceramic-inset animate-pulse" />
            ))}
          </div>
        ) : worlds.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {worlds.map(world => {
              const eraConfig = ERA_CONFIG[world.current_era];
              return (
                <button
                  key={world.id}
                  onClick={() => onSelectWorld(world)}
                  className="p-4 rounded-xl bg-ceramic-card shadow-ceramic-emboss text-left hover:scale-[1.02] transition-transform"
                >
                  <div className="text-2xl mb-2">🌍</div>
                  <h3
                    className="text-sm font-bold text-ceramic-text-primary truncate"
                    style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
                  >
                    {world.name}
                  </h3>
                  <p className="text-xs text-ceramic-text-secondary mt-1">
                    {eraConfig.label}
                  </p>
                  <div className="mt-2 h-1.5 bg-ceramic-inset rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, world.era_progress)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-ceramic-inset rounded-xl">
            <p className="text-ceramic-text-secondary text-sm">
              Nenhum mundo criado ainda
            </p>
          </div>
        )}
      </div>

      {/* Create World Button */}
      <button
        onClick={onCreateWorld}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
        style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
      >
        + Criar Mundo
      </button>
    </div>
  );
}
