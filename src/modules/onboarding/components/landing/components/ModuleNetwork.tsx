import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// ── Node positions (circular layout within 600×400 viewBox) ──

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  atlas:       { x: 300, y: 50  },
  journey:     { x: 480, y: 110 },
  connections: { x: 530, y: 270 },
  finance:     { x: 400, y: 360 },
  grants:      { x: 200, y: 360 },
  studio:      { x: 70,  y: 270 },
  flux:        { x: 120, y: 110 },
};

const NODE_LABELS: Record<string, string> = {
  atlas:       'Atlas',
  journey:     'Journey',
  connections: 'Connections',
  finance:     'Finance',
  grants:      'Grants',
  studio:      'Studio',
  flux:        'Flux',
};

const NODE_INITIALS: Record<string, string> = {
  atlas:       'A',
  journey:     'J',
  connections: 'C',
  finance:     'F',
  grants:      'G',
  studio:      'S',
  flux:        'X',
};

const NODE_IDS = Object.keys(NODE_POSITIONS);

// ── Connections between related modules ──

const CONNECTIONS: [string, string][] = [
  ['journey', 'atlas'],
  ['finance', 'journey'],
  ['connections', 'journey'],
  ['atlas', 'flux'],
  ['finance', 'connections'],
  ['journey', 'flux'],
  ['grants', 'atlas'],
  ['studio', 'connections'],
];

// ── Helpers ──

function lineLength(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ── Component ──

interface ModuleNetworkProps {
  isVisible: boolean;
}

/**
 * ModuleNetwork — SVG-based network visualization of 7 interconnected AICA modules.
 *
 * Shows nodes in a circular layout with animated connection lines and flowing
 * particles. Supports hover interaction to highlight a node and its connections.
 */
export function ModuleNetwork({ isVisible }: ModuleNetworkProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  /** Set of node ids connected to the hovered node. */
  const hoveredNeighbors = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const neighbors = new Set<string>();
    for (const [a, b] of CONNECTIONS) {
      if (a === hoveredNode) neighbors.add(b);
      if (b === hoveredNode) neighbors.add(a);
    }
    return neighbors;
  }, [hoveredNode]);

  /** Check if a connection involves the hovered node. */
  function isConnectionHighlighted(a: string, b: string): boolean {
    if (!hoveredNode) return false;
    return a === hoveredNode || b === hoveredNode;
  }

  /** Resolve opacity for a node based on hover state. */
  function nodeOpacity(nodeId: string): number {
    if (!hoveredNode) return 1;
    if (nodeId === hoveredNode || hoveredNeighbors.has(nodeId)) return 1;
    return 0.15;
  }

  /** Resolve opacity for a connection based on hover state. */
  function connectionOpacity(a: string, b: string): number {
    if (!hoveredNode) return 0.3;
    return isConnectionHighlighted(a, b) ? 0.7 : 0.08;
  }

  /** Particles for each connection — 1 or 2 per line. */
  const particles = useMemo(() => {
    const result: Array<{
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      duration: number;
      delayOffset: number;
    }> = [];

    CONNECTIONS.forEach(([a, b], ci) => {
      const from = NODE_POSITIONS[a];
      const to = NODE_POSITIONS[b];
      const dist = lineLength(from.x, from.y, to.x, to.y);
      const duration = 3 + (dist / 200); // 3-5s scaled by distance

      // First particle
      result.push({
        id: `p-${ci}-0`,
        from,
        to,
        duration,
        delayOffset: ci * 0.4,
      });

      // Second particle on longer connections
      if (ci < 5) {
        result.push({
          id: `p-${ci}-1`,
          from: to,
          to: from,
          duration: duration + 0.5,
          delayOffset: ci * 0.4 + 1.5,
        });
      }
    });

    return result;
  }, []);

  return (
    <svg
      viewBox="0 0 600 400"
      className="w-full max-w-3xl mx-auto"
      role="img"
      aria-label="Diagrama de rede mostrando os 7 modulos do AICA interconectados"
    >
      {/* ── Connection lines ── */}
      {CONNECTIONS.map(([a, b], i) => {
        const posA = NODE_POSITIONS[a];
        const posB = NODE_POSITIONS[b];
        const len = lineLength(posA.x, posA.y, posB.x, posB.y);

        return (
          <motion.line
            key={`line-${a}-${b}`}
            x1={posA.x}
            y1={posA.y}
            x2={posB.x}
            y2={posB.y}
            stroke="#D97706"
            strokeWidth={1.5}
            strokeDasharray={len}
            initial={{ strokeDashoffset: len, opacity: 0 }}
            animate={
              isVisible
                ? {
                    strokeDashoffset: 0,
                    opacity: connectionOpacity(a, b),
                  }
                : { strokeDashoffset: len, opacity: 0 }
            }
            transition={{
              strokeDashoffset: {
                duration: 0.8,
                delay: 0.3 + i * 0.06,
                ease: 'easeOut',
              },
              opacity: { duration: 0.3 },
            }}
          />
        );
      })}

      {/* ── Flowing particles ── */}
      {particles.map((p) => (
        <motion.circle
          key={p.id}
          r={3}
          fill="#D97706"
          initial={{ cx: p.from.x, cy: p.from.y, opacity: 0 }}
          animate={
            isVisible
              ? {
                  cx: [p.from.x, p.to.x],
                  cy: [p.from.y, p.to.y],
                  opacity: [0, 0.7, 0.7, 0],
                }
              : { cx: p.from.x, cy: p.from.y, opacity: 0 }
          }
          transition={
            isVisible
              ? {
                  cx: {
                    duration: p.duration,
                    repeat: Infinity,
                    delay: 0.6 + p.delayOffset,
                    ease: 'linear',
                  },
                  cy: {
                    duration: p.duration,
                    repeat: Infinity,
                    delay: 0.6 + p.delayOffset,
                    ease: 'linear',
                  },
                  opacity: {
                    duration: p.duration,
                    repeat: Infinity,
                    delay: 0.6 + p.delayOffset,
                    ease: 'linear',
                  },
                }
              : {}
          }
        />
      ))}

      {/* ── Nodes ── */}
      {NODE_IDS.map((nodeId, i) => {
        const pos = NODE_POSITIONS[nodeId];
        const isHovered = hoveredNode === nodeId;

        return (
          <g
            key={nodeId}
            onMouseEnter={() => setHoveredNode(nodeId)}
            onMouseLeave={() => setHoveredNode(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Main circle */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={28}
              fill="#F0EFE9"
              stroke="#D97706"
              strokeWidth={isHovered ? 3 : 2}
              initial={{ scale: 0, opacity: 0 }}
              animate={
                isVisible
                  ? { scale: 1, opacity: nodeOpacity(nodeId) }
                  : { scale: 0, opacity: 0 }
              }
              transition={{
                scale: {
                  duration: 0.4,
                  delay: i * 0.1,
                  ease: 'backOut',
                },
                opacity: { duration: 0.3 },
              }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
            />

            {/* Node initial letter */}
            <motion.text
              x={pos.x}
              y={pos.y + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#D97706"
              fontSize={16}
              fontWeight={700}
              initial={{ opacity: 0 }}
              animate={
                isVisible
                  ? { opacity: nodeOpacity(nodeId) }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.3, delay: i * 0.1 + 0.2 }}
              style={{ pointerEvents: 'none' }}
            >
              {NODE_INITIALS[nodeId]}
            </motion.text>

            {/* Label below circle */}
            <motion.text
              x={pos.x}
              y={pos.y + 42}
              textAnchor="middle"
              fill="#5C554B"
              fontSize={10}
              initial={{ opacity: 0 }}
              animate={
                isVisible
                  ? { opacity: nodeOpacity(nodeId) }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.3, delay: i * 0.1 + 0.25 }}
              style={{ pointerEvents: 'none' }}
            >
              {NODE_LABELS[nodeId]}
            </motion.text>
          </g>
        );
      })}
    </svg>
  );
}
