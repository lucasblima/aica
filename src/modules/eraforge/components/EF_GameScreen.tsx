/**
 * EF_GameScreen - Main game view
 *
 * Displays the current scene, stats, advisor panel, and turn counter.
 * This is the primary gameplay interface.
 */

import React from 'react';
import { EF_SceneRenderer } from './EF_SceneRenderer';
import { EF_StatsBar } from './EF_StatsBar';
import { EF_AdvisorPanel } from './EF_AdvisorPanel';
import { EF_TurnCounter } from './EF_TurnCounter';
import type { Turn, WorldMember, Era, AdvisorId } from '../types/eraforge.types';

interface EF_GameScreenProps {
  currentTurn: Turn | null;
  member: WorldMember;
  era: Era;
  turnsRemaining: number;
  onSelectChoice: (choiceId: string) => void;
  onSelectAdvisor: (advisorId: AdvisorId) => void;
  onEndGame: () => void;
}

export function EF_GameScreen({
  currentTurn,
  member,
  era,
  turnsRemaining,
  onSelectChoice,
  onSelectAdvisor,
  onEndGame,
}: EF_GameScreenProps) {
  const scenario = currentTurn?.scenario;

  return (
    <div className="flex flex-col min-h-screen bg-ceramic-base">
      {/* Top bar: stats + turns */}
      <div className="flex items-center justify-between p-4">
        <EF_StatsBar
          knowledge={member.knowledge}
          cooperation={member.cooperation}
          courage={member.courage}
        />
        <EF_TurnCounter turnsRemaining={turnsRemaining} />
      </div>

      {/* Scene */}
      <div className="flex-1 px-4">
        <EF_SceneRenderer era={era} />

        {/* Scenario */}
        {scenario ? (
          <div className="mt-4 p-4 bg-ceramic-card rounded-xl shadow-ceramic-emboss">
            <h2
              className="text-lg font-bold text-ceramic-text-primary"
              style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
            >
              {scenario.title || 'Aventura'}
            </h2>
            <p className="text-sm text-ceramic-text-secondary mt-2">
              {scenario.description || 'Carregando cenario...'}
            </p>

            {/* Choices */}
            {scenario.choices && scenario.choices.length > 0 && (
              <div className="mt-4 space-y-2">
                {scenario.choices.map(choice => (
                  <button
                    key={choice.id}
                    onClick={() => onSelectChoice(choice.id)}
                    className="w-full text-left p-3 rounded-lg bg-ceramic-inset hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-ceramic-text-primary">
                      {choice.text}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 p-8 bg-ceramic-inset rounded-xl text-center">
            <p className="text-ceramic-text-secondary text-sm">
              Preparando cenario...
            </p>
          </div>
        )}
      </div>

      {/* Advisor Panel */}
      <div className="px-4 pb-4">
        <EF_AdvisorPanel onSelectAdvisor={onSelectAdvisor} />
      </div>

      {/* End Game */}
      <div className="px-4 pb-6">
        <button
          onClick={onEndGame}
          className="w-full py-2 text-sm text-ceramic-text-secondary bg-ceramic-inset rounded-lg hover:bg-ceramic-border transition-colors"
        >
          Encerrar Sessao
        </button>
      </div>
    </div>
  );
}
