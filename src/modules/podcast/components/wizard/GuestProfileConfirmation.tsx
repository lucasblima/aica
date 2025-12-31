/**
 * GuestProfileConfirmation Component
 *
 * Step 2 of the Public Figure workflow.
 * Displays researched guest profile with confidence indicators.
 * User can click the card to confirm or search again.
 *
 * Related: Issue #15 - Task 2.3
 */

import React, { useState } from 'react';
import type { GuestProfile } from '../../types/wizard.types';

export interface GuestProfileConfirmationProps {
  profile: GuestProfile;
  onConfirm: () => void;
  onSearchAgain: () => void;
}

export const GuestProfileConfirmation: React.FC<GuestProfileConfirmationProps> = ({
  profile,
  onConfirm,
  onSearchAgain,
}) => {
  const [showDetails, setShowDetails] = useState({
    facts: false,
    topics: true,
    controversies: false,
  });

  // Determine confidence badge color and text
  const getConfidenceBadge = () => {
    const score = profile.confidence_score || 0;
    if (score >= 70) {
      return {
        color: 'bg-green-100 text-green-800 border-green-300',
        text: `Confiança: ${score}%`,
      };
    } else if (score >= 40) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        text: `Confiança: ${score}%`,
      };
    } else {
      return {
        color: 'bg-red-100 text-red-800 border-red-300',
        text: `Confiança: ${score}%`,
      };
    }
  };

  const confidenceBadge = getConfidenceBadge();

  // Handle keyboard navigation on card
  const handleCardKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-ceramic-text-primary">
          Confirme o convidado
        </h2>
        <p className="text-ceramic-text-secondary">
          Clique no card para confirmar ou busque novamente
        </p>
      </div>

      {/* Profile Card - Clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={onConfirm}
        onKeyPress={handleCardKeyPress}
        className="ceramic-card p-8 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 space-y-6"
      >
        {/* Guest Name and Title */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-3xl font-black text-ceramic-text-primary mb-1">
                🎙️ {profile.name}
              </h3>
              {profile.title && (
                <p className="text-lg font-semibold text-amber-600">
                  {profile.title}
                </p>
              )}
            </div>
          </div>

          {/* Biography */}
          {profile.biography && (
            <p className="text-ceramic-text-secondary leading-relaxed mt-4">
              {profile.biography}
            </p>
          )}
        </div>

        {/* Confidence and Reliability Badges */}
        <div className="flex flex-wrap gap-3">
          {/* Reliability Badge */}
          {profile.is_reliable !== undefined && (
            <span
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                profile.is_reliable
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : 'bg-orange-100 text-orange-800 border-orange-300'
              }`}
            >
              {profile.is_reliable ? '✓ Informação Confiável' : '⚠️ Verificar Informações'}
            </span>
          )}

          {/* Confidence Score Badge */}
          {profile.confidence_score !== undefined && (
            <span
              className={`px-4 py-2 rounded-lg text-sm font-bold border ${confidenceBadge.color}`}
            >
              {confidenceBadge.text}
            </span>
          )}
        </div>

        {/* Recent Facts Section */}
        {profile.recent_facts && profile.recent_facts.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails((prev) => ({ ...prev, facts: !prev.facts }));
              }}
              className="flex items-center gap-2 text-left font-bold text-ceramic-text-primary hover:text-amber-600 transition-colors"
            >
              <span className="text-xl">📊</span>
              <span>Fatos Recentes</span>
              <span className="text-xs">{showDetails.facts ? '▼' : '▶'}</span>
            </button>

            {showDetails.facts && (
              <ul className="space-y-2 ml-7">
                {profile.recent_facts.map((fact, index) => (
                  <li
                    key={index}
                    className="text-sm text-ceramic-text-secondary leading-relaxed"
                  >
                    • {fact}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Topics of Interest Section */}
        {profile.topics_of_interest && profile.topics_of_interest.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails((prev) => ({ ...prev, topics: !prev.topics }));
              }}
              className="flex items-center gap-2 text-left font-bold text-ceramic-text-primary hover:text-amber-600 transition-colors"
            >
              <span className="text-xl">🏷️</span>
              <span>Tópicos de Interesse</span>
              <span className="text-xs">{showDetails.topics ? '▼' : '▶'}</span>
            </button>

            {showDetails.topics && (
              <div className="flex flex-wrap gap-2 ml-7">
                {profile.topics_of_interest.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Controversies Section (conditional) */}
        {profile.controversies && profile.controversies.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails((prev) => ({ ...prev, controversies: !prev.controversies }));
              }}
              className="flex items-center gap-2 text-left font-bold text-ceramic-text-primary hover:text-amber-600 transition-colors"
            >
              <span className="text-xl">⚠️</span>
              <span>Controvérsias</span>
              <span className="text-xs">{showDetails.controversies ? '▼' : '▶'}</span>
            </button>

            {showDetails.controversies && (
              <ul className="space-y-2 ml-7">
                {profile.controversies.map((controversy, index) => (
                  <li
                    key={index}
                    className="text-sm text-orange-700 leading-relaxed"
                  >
                    • {controversy}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Click hint */}
        <div className="text-center pt-4 border-t border-ceramic-border/20">
          <p className="text-xs text-ceramic-text-secondary">
            ✨ Clique para confirmar e continuar
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onSearchAgain}
          data-testid="guest-wizard-search-again"
          className="ceramic-button-secondary px-8 py-3 rounded-xl"
        >
          Buscar Novamente
        </button>

        <button
          onClick={onConfirm}
          className="ceramic-button-primary px-8 py-3 rounded-xl"
        >
          Confirmar Convidado →
        </button>
      </div>
    </div>
  );
};

export default GuestProfileConfirmation;
