import React, { useState } from 'react';

export interface GraphNode {
  id: string;
  label: string;
  role: string;
  x: number;
  y: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  roleColors: Record<string, string>;
  onNodeHover?: (node: GraphNode | null) => void;
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes, links, roleColors, onNodeHover, onNodeClick, className = '',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        {links.map((link, i) => {
          const source = nodeMap[link.source];
          const target = nodeMap[link.target];
          if (!source || !target) return null;
          return <line key={`link-${i}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className="stroke-ceramic-border" strokeWidth="0.3" opacity={0.5} />;
        })}
        {nodes.map(node => {
          const isHovered = hoveredId === node.id;
          const color = roleColors[node.role] || '#9ca3af';
          return (
            <g key={node.id} data-testid={`node-${node.id}`} onMouseEnter={() => { setHoveredId(node.id); onNodeHover?.(node); }} onMouseLeave={() => { setHoveredId(null); onNodeHover?.(null); }} onClick={() => onNodeClick?.(node)} className="cursor-pointer">
              <circle cx={node.x} cy={node.y} r={isHovered ? 5 : 4} fill={color} opacity={isHovered ? 1 : 0.8} className="transition-all" />
              <text x={node.x} y={node.y + 8} textAnchor="middle" className="fill-ceramic-text-secondary" fontSize="3">{node.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {Object.entries(roleColors).map(([role, color]) => (
          <div key={role} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-ceramic-text-secondary">{role}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
