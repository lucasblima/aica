/**
 * WhatsAppAnalyticsPage
 * Dedicated page for WhatsApp Analytics Dashboard with Emotional Intelligence
 * 
 * Provides:
 * - Connection status with QR code
 * - LGPD consent management
 * - Emotional analytics and contact insights
 * - Topic clustering and anomaly alerts
 * - Gamification integration
 * 
 * Related: Issue #22 - WhatsApp Evolution API Integration
 */

import React from 'react';
import { HeaderGlobal } from '../components/layout/HeaderGlobal';
import { ConnectionsWhatsAppTab } from '../modules/connections/views/ConnectionsWhatsAppTab';
import { useAuth } from '../hooks/useAuth';

export function WhatsAppAnalyticsPage() {
  const { user } = useAuth();

  if (!user?.id) {
    return (
      <div className="min-h-screen bg-ceramic-base flex items-center justify-center">
        <p className="text-ceramic-text-secondary">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ceramic-base">
      <HeaderGlobal 
        title="WhatsApp Analytics" 
        subtitle="Análise de Mensagens com Inteligência Emocional"
      />
      <main className="p-6">
        <ConnectionsWhatsAppTab userId={user.id} />
      </main>
    </div>
  );
}

export default WhatsAppAnalyticsPage;
