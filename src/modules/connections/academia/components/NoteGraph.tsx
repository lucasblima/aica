/**
 * NoteGraph Component
 *
 * Visualizes Zettelkasten note connections in a simple network diagram.
 * Design: Minimalist graph with nodes and connections, zoom/pan support.
 *
 * Note: This is a simplified SVG-based implementation.
 * For advanced features, consider integrating D3.js or vis.js.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AcademiaNote } from '../types';

interface NoteGraphProps {
  notes: AcademiaNote[];
  onNoteClick?: (noteId: string) => void;
  highlightedNoteId?: string;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
  note: AcademiaNote;
}

interface Edge {
  from: string;
  to: string;
}

/**
 * Simple force-directed layout (very basic)
 */
const calculateLayout = (
  notes: AcademiaNote[],
  width: number,
  height: number
): NodePosition[] => {
  const padding = 50;
  const noteCount = notes.length;

  if (noteCount === 0) return [];

  // Simple circular layout
  const radius = Math.min(width, height) / 2 - padding;
  const angleStep = (2 * Math.PI) / noteCount;
  const centerX = width / 2;
  const centerY = height / 2;

  return notes.map((note, index) => {
    const angle = angleStep * index;
    return {
      id: note.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      note,
    };
  });
};

/**
 * Extract edges from notes
 */
const extractEdges = (notes: AcademiaNote[]): Edge[] => {
  const edges: Edge[] = [];
  const noteIds = new Set(notes.map((n) => n.id));

  notes.forEach((note) => {
    if (note.linked_note_ids && note.linked_note_ids.length > 0) {
      note.linked_note_ids.forEach((linkedId) => {
        // Only add edge if both nodes exist
        if (noteIds.has(linkedId)) {
          edges.push({ from: note.id, to: linkedId });
        }
      });
    }
  });

  return edges;
};

/**
 * Get note type color
 */
const getNoteTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    fleeting: '#C4B9A8', // ceramic-warm
    literature: '#7B8FA2', // ceramic-info
    permanent: '#6B7B5C', // ceramic-success
  };
  return colors[type] || '#C4B9A8';
};

export const NoteGraph: React.FC<NoteGraphProps> = ({
  notes,
  onNoteClick,
  highlightedNoteId,
}) => {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('note-graph-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(600, container.clientHeight),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate layout
  const nodePositions = useMemo(
    () => calculateLayout(notes, dimensions.width, dimensions.height),
    [notes, dimensions]
  );

  // Extract edges
  const edges = useMemo(() => extractEdges(notes), [notes]);

  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-ceramic-cool rounded-sm border border-ceramic-border">
        <p className="text-ceramic-text-tertiary text-sm font-light tracking-wide">
          No notes to visualize. Create linked notes to see the knowledge graph.
        </p>
      </div>
    );
  }

  return (
    <div
      id="note-graph-container"
      className="relative w-full bg-ceramic-base border border-ceramic-border rounded-sm overflow-hidden"
      style={{ height: '600px' }}
    >
      {/* Graph SVG */}
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="bg-ceramic-cool"
      >
        {/* Draw edges */}
        <g className="edges">
          {edges.map((edge, index) => {
            const fromNode = nodePositions.find((n) => n.id === edge.from);
            const toNode = nodePositions.find((n) => n.id === edge.to);

            if (!fromNode || !toNode) return null;

            const isHighlighted =
              highlightedNoteId === edge.from || highlightedNoteId === edge.to;

            return (
              <line
                key={`edge-${index}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={isHighlighted ? '#6B7B5C' : '#C4B9A8'}
                strokeWidth={isHighlighted ? 2 : 1}
                opacity={isHighlighted ? 0.8 : 0.3}
              />
            );
          })}
        </g>

        {/* Draw nodes */}
        <g className="nodes">
          {nodePositions.map((node) => {
            const isHighlighted = highlightedNoteId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const noteColor = getNoteTypeColor(node.note.note_type);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={() => onNoteClick?.(node.id)}
                className="cursor-pointer"
              >
                {/* Node circle */}
                <circle
                  r={isHighlighted || isHovered ? 12 : 8}
                  fill={noteColor}
                  stroke={isHighlighted ? '#6B7B5C' : '#ffffff'}
                  strokeWidth={isHighlighted || isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />

                {/* Node label (on hover) */}
                {(isHovered || isHighlighted) && (
                  <>
                    {/* Background for label */}
                    <rect
                      x={-60}
                      y={-35}
                      width={120}
                      height={20}
                      rx={4}
                      fill="rgba(255, 255, 255, 0.95)"
                      stroke="#C4B9A8"
                      strokeWidth={1}
                    />
                    {/* Label text */}
                    <text
                      y={-21}
                      textAnchor="middle"
                      className="text-xs font-light fill-ceramic-text-primary"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.note.title.length > 15
                        ? `${node.note.title.substring(0, 15)}...`
                        : node.note.title}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-ceramic-base border border-ceramic-border rounded-sm p-4 shadow-sm">
        <h4 className="text-xs text-ceramic-text-secondary font-light tracking-wide mb-3 uppercase">
          Note Types
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getNoteTypeColor('fleeting') }}
            />
            <span className="text-xs text-ceramic-text-primary font-light">Fleeting</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getNoteTypeColor('literature') }}
            />
            <span className="text-xs text-ceramic-text-primary font-light">Literature</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getNoteTypeColor('permanent') }}
            />
            <span className="text-xs text-ceramic-text-primary font-light">Permanent</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 bg-ceramic-base border border-ceramic-border rounded-sm px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4 text-xs text-ceramic-text-secondary font-light">
          <span>{notes.length} notes</span>
          <span>•</span>
          <span>{edges.length} connections</span>
        </div>
      </div>
    </div>
  );
};

export default NoteGraph;
