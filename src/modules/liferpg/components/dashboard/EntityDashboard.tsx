/**
 * EntityDashboard — Main RPG character sheet for an entity persona.
 *
 * Sections: Header (avatar/name/level/XP), HP bar, Stats radar,
 * Pending quests, Mini inventory, Agent chat, Recent events.
 */

import React, { useState, useCallback } from 'react';
import { useEntityPersona } from '../../hooks/useEntityPersona';
import { useEntityQuests } from '../../hooks/useEntityQuests';
import { EntityHPBar } from './EntityHPBar';
import { EntityStatRadar } from './EntityStatRadar';
import { QuestCard } from './QuestCard';
import { EntityAgentService, type ChatMessage } from '../../services/entityAgentService';
import {
  ENTITY_COLORS,
  ENTITY_EMOJI,
  getXPForLevel,
  getXPProgress,
  type EntityType,
  type EntityAgentResponse,
} from '../../types/liferpg';

interface EntityDashboardProps {
  personaId: string;
}

export const EntityDashboard: React.FC<EntityDashboardProps> = ({ personaId }) => {
  const { persona, dashboard, loading, error, reload } = useEntityPersona({ personaId });
  const {
    quests,
    acceptQuest,
    completeQuest,
    skipQuest,
    reload: reloadQuests,
  } = useEntityQuests({
    personaId,
    statusFilter: ['pending', 'accepted', 'in_progress'],
  });

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    const result = await EntityAgentService.chat(personaId, userMsg.content, [...chatMessages, userMsg]);

    if (result.success && result.data) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'entity', content: result.data!.response },
      ]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: 'entity', content: 'Desculpe, nao consegui processar sua mensagem.' },
      ]);
    }

    setChatLoading(false);
  }, [chatInput, chatLoading, chatMessages, personaId]);

  const handleQuestComplete = useCallback(
    async (questId: string, notes?: string) => {
      const result = await completeQuest(questId, notes);
      if (result.success) {
        reload();
        reloadQuests();
      }
      return result;
    },
    [completeQuest, reload, reloadQuests]
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-20 bg-ceramic-cool rounded-xl" />
        <div className="h-8 bg-ceramic-cool rounded-lg w-3/4" />
        <div className="h-48 bg-ceramic-cool rounded-xl" />
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="p-6 text-center">
        <p className="text-ceramic-error text-sm">{error || 'Persona nao encontrada'}</p>
        <button onClick={reload} className="mt-2 text-xs text-ceramic-info underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  const entityColor = persona.avatar_color || ENTITY_COLORS[persona.entity_type as EntityType] || '#6B7280';
  const entityEmoji = persona.avatar_emoji || ENTITY_EMOJI[persona.entity_type as EntityType] || '\u{2753}';
  const xpProgress = getXPProgress(persona.xp, persona.level);
  const xpForNext = getXPForLevel(persona.level + 1);
  const stats = (persona.stats as Record<string, number>) || {};

  return (
    <div className="space-y-4 p-4 max-w-lg mx-auto">
      {/* Header: Avatar + Name + Level + XP */}
      <div className="bg-ceramic-base rounded-2xl p-5 shadow-ceramic-emboss">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner"
            style={{ backgroundColor: `${entityColor}20`, borderColor: entityColor, borderWidth: 2 }}
          >
            {entityEmoji}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-ceramic-text-primary">{persona.persona_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: entityColor }}
              >
                Lv. {persona.level}
              </span>
              <span className="text-xs text-ceramic-text-secondary capitalize">
                {persona.entity_type}
              </span>
            </div>
            {/* XP bar */}
            <div className="mt-2">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[10px] text-ceramic-text-secondary">XP</span>
                <span className="text-[10px] text-ceramic-text-secondary">
                  {persona.xp}/{xpForNext}
                </span>
              </div>
              <div className="w-full h-1.5 bg-ceramic-cool rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, xpProgress)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* HP Bar (large) */}
        <div className="mt-4">
          <EntityHPBar hp={persona.hp} size="lg" />
        </div>
      </div>

      {/* Stats Radar */}
      {Object.keys(stats).length >= 3 && (
        <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss">
          <h3 className="text-sm font-semibold text-ceramic-text-primary mb-2">Atributos</h3>
          <EntityStatRadar stats={stats} entityColor={entityColor} size={220} />
        </div>
      )}

      {/* Stats as bars (fallback or supplement) */}
      {Object.keys(stats).length > 0 && Object.keys(stats).length < 3 && (
        <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss">
          <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">Atributos</h3>
          <div className="space-y-2">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-ceramic-text-secondary capitalize">{key}</span>
                  <span className="text-ceramic-text-primary font-medium">{value}/100</span>
                </div>
                <div className="w-full h-2 bg-ceramic-cool rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${value}%`,
                      backgroundColor: entityColor,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Quests */}
      <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss">
        <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">
          Quests ({quests.length})
        </h3>
        {quests.length === 0 ? (
          <p className="text-xs text-ceramic-text-secondary text-center py-4">
            Nenhuma quest pendente. Tudo em dia!
          </p>
        ) : (
          <div className="space-y-3">
            {quests.slice(0, 5).map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onAccept={acceptQuest}
                onComplete={handleQuestComplete}
                onSkip={skipQuest}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mini Inventory Grid */}
      {dashboard?.inventorySummary && (
        <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss">
          <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">Inventario</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-ceramic-cool rounded-xl">
              <div className="text-xl font-bold text-ceramic-text-primary">
                {dashboard.inventorySummary.totalItems}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary">Itens</div>
            </div>
            <div className="text-center p-3 bg-ceramic-cool rounded-xl">
              <div className="text-xl font-bold text-ceramic-text-primary">
                R${dashboard.inventorySummary.totalValue.toLocaleString('pt-BR')}
              </div>
              <div className="text-[10px] text-ceramic-text-secondary">Valor total</div>
            </div>
            {dashboard.inventorySummary.lowConditionCount > 0 && (
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <div className="text-xl font-bold text-red-600">
                  {dashboard.inventorySummary.lowConditionCount}
                </div>
                <div className="text-[10px] text-red-600">Condicao ruim</div>
              </div>
            )}
            {dashboard.inventorySummary.expiringCount > 0 && (
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <div className="text-xl font-bold text-amber-600">
                  {dashboard.inventorySummary.expiringCount}
                </div>
                <div className="text-[10px] text-amber-600">Expirando</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat with Agent (Collapsible) */}
      <div className="bg-ceramic-base rounded-2xl shadow-ceramic-emboss overflow-hidden">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-full p-4 flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-semibold text-ceramic-text-primary">
            Conversar com {persona.persona_name}
          </h3>
          <span className="text-ceramic-text-secondary text-xs">
            {chatOpen ? 'Fechar' : 'Abrir'}
          </span>
        </button>

        {chatOpen && (
          <div className="px-4 pb-4">
            {/* Messages */}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-3">
              {chatMessages.length === 0 && (
                <p className="text-xs text-ceramic-text-secondary text-center py-4">
                  Inicie uma conversa com {persona.persona_name}
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs p-2 rounded-lg max-w-[85%] ${
                    msg.role === 'user'
                      ? 'ml-auto bg-ceramic-cool text-ceramic-text-primary'
                      : 'bg-ceramic-base border border-ceramic-border text-ceramic-text-primary'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="text-xs text-ceramic-text-secondary animate-pulse">
                  {persona.persona_name} esta pensando...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Fale com ${persona.persona_name}...`}
                className="flex-1 text-xs py-2 px-3 rounded-lg bg-ceramic-cool border border-ceramic-border focus:outline-none focus:border-amber-400"
                disabled={chatLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="text-xs py-2 px-4 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Events Timeline */}
      {dashboard?.recentEvents && dashboard.recentEvents.length > 0 && (
        <div className="bg-ceramic-base rounded-2xl p-4 shadow-ceramic-emboss">
          <h3 className="text-sm font-semibold text-ceramic-text-primary mb-3">
            Eventos Recentes
          </h3>
          <div className="space-y-2">
            {dashboard.recentEvents.slice(0, 8).map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-2 text-xs border-l-2 border-ceramic-border pl-3 py-1"
              >
                <div className="flex-1">
                  <span className="font-medium text-ceramic-text-primary capitalize">
                    {(event.event_type as string).replace(/_/g, ' ')}
                  </span>
                  <p className="text-ceramic-text-secondary mt-0.5">
                    {JSON.stringify(event.event_data).slice(0, 80)}
                  </p>
                </div>
                <span className="text-[10px] text-ceramic-text-secondary whitespace-nowrap">
                  {new Date(event.created_at as string).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
