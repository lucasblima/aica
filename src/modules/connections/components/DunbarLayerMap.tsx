/**
 * DunbarLayerMap Component
 * Sprint 4: Connections — Concentric circles visualization
 *
 * Displays Dunbar's 5 layers as concentric circles with contacts
 * positioned within their respective rings.
 *
 * Layers: 5 (intimate) → 15 (sympathy) → 50 (close) → 150 (active) → 500 (acquaintance)
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Loader2 } from 'lucide-react';
import { useDunbarLayers } from '../hooks/useDunbarLayers';
import type { DunbarLayer, DunbarLayerData } from '../services/networkScoring';

// ============================================================================
// TYPES
// ============================================================================

interface DunbarLayerMapProps {
  className?: string;
  size?: number;
  showLabels?: boolean;
  onContactClick?: (contactId: string) => void;
}

// ============================================================================
// LAYER COLORS (Ceramic palette — warm to cool from inner to outer)
// ============================================================================

const LAYER_COLORS: Record<DunbarLayer, { fill: string; stroke: string; text: string }> = {
  5:   { fill: '#D97706', stroke: '#B45309', text: '#FFFFFF' },   // amber (warmest)
  15:  { fill: '#C4883A', stroke: '#A06B2A', text: '#FFFFFF' },   // ceramic-warning
  50:  { fill: '#8B7355', stroke: '#6B5A42', text: '#FFFFFF' },   // ceramic-accent
  150: { fill: '#7B8FA2', stroke: '#5B7088', text: '#FFFFFF' },   // ceramic-info
  500: { fill: '#948D82', stroke: '#7A7468', text: '#FFFFFF' },   // ceramic-text-secondary
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DunbarLayerMap({
  className = '',
  size = 400,
  showLabels = true,
  onContactClick,
}: DunbarLayerMapProps) {
  const { layers, isLoading, error, totalContacts } = useDunbarLayers();

  const center = size / 2;
  const layerRadii = useMemo(() => {
    // From innermost to outermost
    const maxRadius = size / 2 - 10;
    return {
      5:   maxRadius * 0.20,
      15:  maxRadius * 0.38,
      50:  maxRadius * 0.56,
      150: maxRadius * 0.76,
      500: maxRadius * 0.95,
    };
  }, [size]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 text-ceramic-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`ceramic-inset p-6 rounded-xl text-center ${className}`}>
        <p className="text-sm text-ceramic-error">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      className={`bg-ceramic-50 rounded-xl p-6 shadow-ceramic-emboss ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="ceramic-concave p-2 rounded-lg">
            <Users className="w-5 h-5 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Mapa de Dunbar
            </h3>
            <p className="text-xs text-ceramic-text-secondary">
              {totalContacts} contatos classificados
            </p>
          </div>
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="flex justify-center max-w-full overflow-hidden">
        <svg
          className="w-full max-h-[400px] h-auto"
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Render rings from outermost to innermost */}
          {([500, 150, 50, 15, 5] as DunbarLayer[]).map((layer) => {
            const radius = layerRadii[layer];
            const colors = LAYER_COLORS[layer];
            const layerData = layers.find(l => l.layer === layer);

            return (
              <g key={layer}>
                {/* Ring */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill={`${colors.fill}15`}
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                  strokeDasharray={layer === 500 ? '4 4' : 'none'}
                />

                {/* Layer label */}
                {showLabels && (
                  <text
                    x={center}
                    y={center - radius + 14}
                    textAnchor="middle"
                    fill={colors.stroke}
                    fontSize={10}
                    fontWeight={600}
                  >
                    {layerData?.label ?? ''} ({layerData?.contacts.length ?? 0})
                  </text>
                )}

                {/* Contact dots */}
                {layerData?.contacts.slice(0, 20).map((contact, i) => {
                  const prevRadius = layer === 5 ? 0 : layerRadii[getPreviousLayer(layer)];
                  const ringCenter = (radius + prevRadius) / 2;
                  const angle = (2 * Math.PI * i) / Math.min(layerData.contacts.length, 20) - Math.PI / 2;
                  const cx = center + ringCenter * Math.cos(angle);
                  const cy = center + ringCenter * Math.sin(angle);
                  const dotRadius = layer <= 15 ? 6 : layer <= 50 ? 4 : 3;

                  return (
                    <g
                      key={contact.id}
                      onClick={() => onContactClick?.(contact.id)}
                      style={{ cursor: onContactClick ? 'pointer' : 'default' }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={dotRadius}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={1}
                      />
                      {layer <= 15 && (
                        <text
                          x={cx}
                          y={cy + dotRadius + 10}
                          textAnchor="middle"
                          fill={colors.stroke}
                          fontSize={8}
                        >
                          {contact.name.split(' ')[0]}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Center label */}
          <text
            x={center}
            y={center + 4}
            textAnchor="middle"
            fill="#6B5A42"
            fontSize={12}
            fontWeight={700}
          >
            Você
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-5 gap-1 mt-4">
        {layers.map((layer) => (
          <div key={layer.layer} className="text-center">
            <div
              className="w-3 h-3 rounded-full mx-auto mb-1"
              style={{ backgroundColor: LAYER_COLORS[layer.layer].fill }}
            />
            <p className="text-[10px] text-ceramic-text-secondary leading-tight">
              {layer.contacts.length}/{layer.capacity}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function getPreviousLayer(layer: DunbarLayer): DunbarLayer {
  switch (layer) {
    case 15: return 5;
    case 50: return 15;
    case 150: return 50;
    case 500: return 150;
    default: return 5;
  }
}

export default DunbarLayerMap;
