/**
 * LifeRPGDetailView — Persona detail with tabs: Dashboard / Inventory.
 * Route: /liferpg/:personaId
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Package } from 'lucide-react';
import { EntityDashboard } from '../components/dashboard/EntityDashboard';
import { InventoryPage } from '../components/inventory/InventoryPage';
import { FeedbackWidget } from '../components/feedback/FeedbackWidget';
import { useEntityPersona } from '../hooks/useEntityPersona';
import { ENTITY_COLORS, type EntityType } from '../types/liferpg';

type Tab = 'dashboard' | 'inventory';

export default function LifeRPGDetailView() {
  const navigate = useNavigate();
  const { personaId } = useParams<{ personaId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { persona } = useEntityPersona({ personaId });

  if (!personaId) {
    navigate('/liferpg');
    return null;
  }

  const color = persona?.avatar_color || ENTITY_COLORS[persona?.entity_type as EntityType] || '#F59E0B';

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-ceramic-base pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-ceramic-base/95 backdrop-blur-sm border-b border-ceramic-border">
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => navigate('/liferpg')}
            className="flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Life RPG</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
                activeTab === id
                  ? 'text-white'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary bg-ceramic-cool/50'
              }`}
              style={activeTab === id ? { backgroundColor: color } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <EntityDashboard personaId={personaId} />
      )}
      {activeTab === 'inventory' && (
        <InventoryPage
          personaId={personaId}
          personaName={persona?.persona_name || 'Entidade'}
        />
      )}

      {/* Feedback Widget */}
      <FeedbackWidget />
    </div>
  );
}
