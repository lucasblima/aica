/**
 * LifeRPGMainView — Persona list + create new + navigate to detail.
 * Route: /liferpg
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Swords, AlertCircle } from 'lucide-react';
import { useEntityPersonaList } from '../hooks/useEntityPersona';
import { EntityHPBar } from '../components/dashboard/EntityHPBar';
import { FeedbackWidget } from '../components/feedback/FeedbackWidget';
import {
  ENTITY_COLORS,
  ENTITY_EMOJI,
  getXPProgress,
  type EntityType,
} from '../types/liferpg';

export default function LifeRPGMainView() {
  const navigate = useNavigate();
  const { personas, loading, error, reload } = useEntityPersonaList();

  if (loading) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-sm text-ceramic-text-secondary">Carregando personas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base pb-24">
      {/* Header */}
      <div className="pt-8 px-6 pb-4">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Voltar</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center">
            <Swords className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ceramic-text-primary">Life RPG</h1>
            <p className="text-xs text-ceramic-text-secondary">Suas entidades como personagens RPG</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 p-3 rounded-xl bg-ceramic-error/10 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-ceramic-error flex-shrink-0" />
          <p className="text-xs text-ceramic-error">{error}</p>
          <button onClick={reload} className="ml-auto text-xs text-ceramic-info underline">Retry</button>
        </div>
      )}

      {/* Persona Grid */}
      <div className="px-6 space-y-3">
        {personas.length === 0 ? (
          <div className="bg-ceramic-base rounded-2xl p-8 shadow-ceramic-emboss text-center">
            <div className="text-4xl mb-3">🎮</div>
            <h3 className="text-sm font-semibold text-ceramic-text-primary mb-1">
              Nenhuma persona criada
            </h3>
            <p className="text-xs text-ceramic-text-secondary mb-4">
              Crie sua primeira entidade RPG — pode ser sua casa, um projeto, ou uma pessoa.
            </p>
            <button
              onClick={() => navigate('/liferpg/new')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Criar Persona
            </button>
          </div>
        ) : (
          <>
            {personas.map((persona) => {
              const color = persona.avatar_color || ENTITY_COLORS[persona.entity_type as EntityType] || '#6B7280';
              const emoji = persona.avatar_emoji || ENTITY_EMOJI[persona.entity_type as EntityType] || '❓';
              const xpProgress = getXPProgress(persona.xp, persona.level);

              return (
                <button
                  key={persona.id}
                  onClick={() => navigate(`/liferpg/${persona.id}`)}
                  className="w-full bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss hover:shadow-ceramic-elevated transition-shadow text-left"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0"
                      style={{ backgroundColor: `${color}20`, borderColor: color, borderWidth: 2 }}
                    >
                      {emoji}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-ceramic-text-primary truncate">
                          {persona.persona_name}
                        </h3>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          Lv.{persona.level}
                        </span>
                      </div>

                      <p className="text-[10px] text-ceramic-text-secondary capitalize mt-0.5">
                        {persona.entity_type}
                        {persona.last_interaction && (
                          <> · {new Date(persona.last_interaction).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
                        )}
                      </p>

                      {/* HP bar mini */}
                      <div className="mt-1.5">
                        <EntityHPBar hp={persona.hp} size="sm" />
                      </div>

                      {/* XP bar mini */}
                      <div className="mt-1 w-full h-1 bg-ceramic-cool rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.max(2, xpProgress)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Create new button */}
            <button
              onClick={() => navigate('/liferpg/new')}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-ceramic-border hover:border-amber-400 transition-colors flex items-center justify-center gap-2 text-ceramic-text-secondary hover:text-amber-500"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Nova Persona</span>
            </button>
          </>
        )}
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}
