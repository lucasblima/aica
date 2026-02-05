/**
 * IntentTimelineCard Usage Examples
 *
 * Demonstrates how to use the IntentTimelineCard component
 * with different intent types and configurations.
 *
 * Issue #186 - Fase 3: Create IntentTimelineCard frontend component
 */

import React from 'react';
import { IntentTimelineCard } from './IntentTimelineCard';
import type { WhatsAppMessageWithIntent } from '../types/intent';

/**
 * Example: Question from client (high urgency, action required)
 */
export function ExampleUrgentQuestion() {
  const message: WhatsAppMessageWithIntent = {
    id: '1',
    userId: 'user-123',
    contactId: 'contact-456',
    direction: 'incoming',
    messageType: 'text',
    intentSummary: 'Cliente perguntando sobre prazo de entrega do projeto',
    intentCategory: 'question',
    intentSentiment: 'urgent',
    intentUrgency: 5,
    intentTopic: 'prazos',
    intentActionRequired: true,
    intentConfidence: 0.95,
    processingStatus: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-2xl p-4">
      <IntentTimelineCard
        message={message}
        contactName="João Silva"
      />
    </div>
  );
}

/**
 * Example: Scheduling message with mentioned date/time
 */
export function ExampleScheduling() {
  const message: WhatsAppMessageWithIntent = {
    id: '2',
    userId: 'user-123',
    contactId: 'contact-789',
    direction: 'incoming',
    messageType: 'text',
    intentSummary: 'Propondo reunião para próxima semana',
    intentCategory: 'scheduling',
    intentSentiment: 'neutral',
    intentUrgency: 3,
    intentTopic: 'reunião',
    intentActionRequired: true,
    intentMentionedDate: '2026-02-12',
    intentMentionedTime: '14:00',
    intentConfidence: 0.88,
    processingStatus: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-2xl p-4">
      <IntentTimelineCard
        message={message}
        contactName="Maria Santos"
        variant="default"
      />
    </div>
  );
}

/**
 * Example: Positive social message (outgoing, compact view)
 */
export function ExampleSocialCompact() {
  const message: WhatsAppMessageWithIntent = {
    id: '3',
    userId: 'user-123',
    contactId: 'contact-321',
    direction: 'outgoing',
    messageType: 'text',
    intentSummary: 'Agradecendo pela ajuda no projeto',
    intentCategory: 'social',
    intentSentiment: 'positive',
    intentUrgency: 1,
    intentTopic: 'gratidão',
    intentActionRequired: false,
    intentConfidence: 0.92,
    processingStatus: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  };

  return (
    <div className="max-w-2xl p-4">
      <IntentTimelineCard
        message={message}
        contactName="Pedro Costa"
        variant="compact"
      />
    </div>
  );
}

/**
 * Example: Audio message with media type
 */
export function ExampleAudioMessage() {
  const message: WhatsAppMessageWithIntent = {
    id: '4',
    userId: 'user-123',
    contactId: 'contact-654',
    direction: 'incoming',
    messageType: 'audio',
    intentSummary: 'Áudio explicando problema técnico no sistema',
    intentCategory: 'audio',
    intentSentiment: 'negative',
    intentUrgency: 4,
    intentTopic: 'suporte técnico',
    intentActionRequired: true,
    intentMediaType: 'audio',
    intentConfidence: 0.79,
    processingStatus: 'completed',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  };

  return (
    <div className="max-w-2xl p-4">
      <IntentTimelineCard
        message={message}
        contactName="Ana Oliveira"
      />
    </div>
  );
}

/**
 * Example: Document shared
 */
export function ExampleDocumentShare() {
  const message: WhatsAppMessageWithIntent = {
    id: '5',
    userId: 'user-123',
    contactId: 'contact-987',
    direction: 'incoming',
    messageType: 'document',
    intentSummary: 'Enviou contrato para revisão',
    intentCategory: 'document',
    intentSentiment: 'neutral',
    intentUrgency: 3,
    intentTopic: 'contrato',
    intentActionRequired: true,
    intentMediaType: 'document',
    intentConfidence: 0.97,
    processingStatus: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  };

  return (
    <div className="max-w-2xl p-4">
      <IntentTimelineCard
        message={message}
        contactName="Carlos Mendes"
        onClick={(msg) => console.log('Clicked message:', msg.id)}
      />
    </div>
  );
}

/**
 * Example: Timeline view with multiple cards
 */
export function ExampleTimeline() {
  const messages: WhatsAppMessageWithIntent[] = [
    {
      id: '6a',
      userId: 'user-123',
      contactId: 'contact-111',
      direction: 'incoming',
      messageType: 'text',
      intentSummary: 'Confirmando presença na reunião',
      intentCategory: 'response',
      intentSentiment: 'positive',
      intentUrgency: 2,
      intentTopic: 'confirmação',
      intentActionRequired: false,
      intentConfidence: 0.91,
      processingStatus: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6b',
      userId: 'user-123',
      contactId: 'contact-222',
      direction: 'outgoing',
      messageType: 'text',
      intentSummary: 'Enviou atualização do progresso do projeto',
      intentCategory: 'update',
      intentSentiment: 'neutral',
      intentUrgency: 2,
      intentTopic: 'projeto',
      intentActionRequired: false,
      intentConfidence: 0.85,
      processingStatus: 'completed',
      createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: '6c',
      userId: 'user-123',
      contactId: 'contact-333',
      direction: 'incoming',
      messageType: 'text',
      intentSummary: 'Solicitando orçamento para novo projeto',
      intentCategory: 'request',
      intentSentiment: 'neutral',
      intentUrgency: 3,
      intentTopic: 'orçamento',
      intentActionRequired: true,
      intentConfidence: 0.93,
      processingStatus: 'completed',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  return (
    <div className="max-w-2xl p-4 space-y-4">
      <h2 className="text-xl font-bold text-[#5C554B] mb-4">Linha do Tempo - WhatsApp</h2>
      {messages.map((message, index) => (
        <IntentTimelineCard
          key={message.id}
          message={message}
          contactName={['Lucas Silva', 'Você', 'Fernanda Costa'][index]}
        />
      ))}
    </div>
  );
}

/**
 * Example: Processing status (pending/processing)
 */
export function ExampleProcessingStatus() {
  const message: WhatsAppMessageWithIntent = {
    id: '7',
    userId: 'user-123',
    contactId: 'contact-555',
    direction: 'incoming',
    messageType: 'text',
    intentSummary: 'Aguardando processamento...',
    intentCategory: null,
    intentSentiment: 'neutral',
    intentUrgency: 1,
    intentActionRequired: false,
    intentConfidence: 0,
    processingStatus: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-2xl p-4">
      <IntentTimelineCard
        message={message}
        contactName="Processando..."
      />
    </div>
  );
}
