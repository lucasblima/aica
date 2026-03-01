/**
 * AffectGridTap Component
 * Interactive 9x9 SVG grid for valence/arousal selection.
 * Based on Russell, Weiss & Mendelsohn (1989) Affect Grid.
 * Sprint 3: Journey Validated Psychometric Well-Being
 *
 * Ceramic Design System: bg-ceramic-50, text-ceramic-800, rounded-xl
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

interface AffectGridTapProps {
  value?: { valence: number; arousal: number };
  onChange: (value: { valence: number; arousal: number }) => void;
  size?: number;
  className?: string;
}

const GRID_SIZE = 9;
const CELL_LABELS: Record<string, { x: number; y: number }> = {
  'Estresse': { x: 1, y: 9 },
  'Excitação': { x: 9, y: 9 },
  'Depressão': { x: 1, y: 1 },
  'Relaxamento': { x: 9, y: 1 },
  'Neutro': { x: 5, y: 5 },
};

export function AffectGridTap({
  value,
  onChange,
  size = 280,
  className = '',
}: AffectGridTapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

  const padding = 40;
  const gridSize = size - padding * 2;
  const cellSize = gridSize / GRID_SIZE;

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left - padding;
      const clickY = e.clientY - rect.top - padding;

      // Convert to grid coordinates (1-9)
      const col = Math.min(GRID_SIZE, Math.max(1, Math.ceil(clickX / cellSize)));
      const row = Math.min(GRID_SIZE, Math.max(1, Math.ceil((gridSize - clickY) / cellSize)));

      onChange({ valence: col, arousal: row });
    },
    [cellSize, gridSize, onChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const clickX = e.clientX - rect.left - padding;
      const clickY = e.clientY - rect.top - padding;

      const col = Math.min(GRID_SIZE, Math.max(1, Math.ceil(clickX / cellSize)));
      const row = Math.min(GRID_SIZE, Math.max(1, Math.ceil((gridSize - clickY) / cellSize)));

      setHovered({ x: col, y: row });
    },
    [cellSize, gridSize]
  );

  return (
    <div className={`bg-ceramic-50 rounded-xl p-4 ${className}`}>
      <p className="text-sm font-medium text-ceramic-text-primary mb-3 text-center">
        Toque no ponto que melhor descreve como você se sente agora
      </p>

      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        className="cursor-crosshair mx-auto block"
        role="img"
        aria-label="Grade de Afeto: eixo X = valência (desagradável a agradável), eixo Y = ativação (sonolento a ativo)"
      >
        {/* Background */}
        <rect
          x={padding}
          y={padding}
          width={gridSize}
          height={gridSize}
          fill="white"
          stroke="#D9D4CC"
          strokeWidth={1}
          rx={4}
        />

        {/* Grid lines */}
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <React.Fragment key={`grid-${i}`}>
            <line
              x1={padding + i * cellSize}
              y1={padding}
              x2={padding + i * cellSize}
              y2={padding + gridSize}
              stroke="#E8E3DB"
              strokeWidth={0.5}
            />
            <line
              x1={padding}
              y1={padding + i * cellSize}
              x2={padding + gridSize}
              y2={padding + i * cellSize}
              stroke="#E8E3DB"
              strokeWidth={0.5}
            />
          </React.Fragment>
        ))}

        {/* Hover highlight */}
        {hovered && (
          <rect
            x={padding + (hovered.x - 1) * cellSize}
            y={padding + (GRID_SIZE - hovered.y) * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#F59E0B"
            opacity={0.15}
            rx={2}
          />
        )}

        {/* Selected cell */}
        {value && (
          <motion.circle
            cx={padding + (value.valence - 0.5) * cellSize}
            cy={padding + (GRID_SIZE - value.arousal + 0.5) * cellSize}
            r={cellSize * 0.35}
            fill="#F59E0B"
            stroke="white"
            strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}

        {/* Corner labels */}
        {Object.entries(CELL_LABELS).map(([label, pos]) => {
          const lx = padding + (pos.x - 0.5) * cellSize;
          const ly = padding + (GRID_SIZE - pos.y + 0.5) * cellSize;
          return (
            <text
              key={label}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill="#948D82"
              fontWeight={500}
            >
              {label}
            </text>
          );
        })}

        {/* Axis labels */}
        <text
          x={size / 2}
          y={size - 8}
          textAnchor="middle"
          fontSize={11}
          fill="#5C554B"
          fontWeight={600}
        >
          Desagradável → Agradável
        </text>
        <text
          x={12}
          y={size / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#5C554B"
          fontWeight={600}
          transform={`rotate(-90, 12, ${size / 2})`}
        >
          Sonolento → Ativo
        </text>
      </svg>

      {/* Selected value display */}
      {value && (
        <motion.div
          className="mt-3 text-center"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs text-ceramic-text-secondary">
            Valência: <span className="font-semibold text-ceramic-text-primary">{value.valence}</span>
            {' '} | {' '}
            Ativação: <span className="font-semibold text-ceramic-text-primary">{value.arousal}</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default AffectGridTap;
