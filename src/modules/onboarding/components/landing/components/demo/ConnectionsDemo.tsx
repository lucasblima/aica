import { useState } from 'react';
import { connectionsDemo } from '../../data/demoData';

const ROLE_COLORS: Record<string, string> = {
  Mentor: '#3b82f6',      // ceramic-info
  Colega: '#f59e0b',      // amber-500
  Cliente: '#10b981',     // ceramic-success
  Parceira: '#a855f7',    // purple-400
  Amigo: '#f59e0b',       // amber-500
  Orientadora: '#3b82f6', // ceramic-info
};

export function ConnectionsDemo() {
  const [hoveredContact, setHoveredContact] = useState<string | null>(null);

  const { contacts, links } = connectionsDemo;

  const getContact = (id: string) => contacts.find((c) => c.id === id);

  return (
    <div className="space-y-3">
      <div className="relative w-full h-64">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Links */}
          {links.map((link, idx) => {
            const source = getContact(link.source);
            const target = getContact(link.target);
            if (!source || !target) return null;
            return (
              <line
                key={idx}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className="stroke-ceramic-border"
                strokeWidth="0.3"
                strokeOpacity={0.5}
              />
            );
          })}

          {/* Contact nodes */}
          {contacts.map((contact) => {
            const isHovered = hoveredContact === contact.id;
            const color = ROLE_COLORS[contact.role] || '#6b7280';
            return (
              <g
                key={contact.id}
                onMouseEnter={() => setHoveredContact(contact.id)}
                onMouseLeave={() => setHoveredContact(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={contact.x}
                  cy={contact.y}
                  r={isHovered ? 5 : 4}
                  fill={color}
                  className="transition-all duration-200"
                  opacity={isHovered ? 1 : 0.85}
                />
                <text
                  x={contact.x}
                  y={contact.y + 0.8}
                  textAnchor="middle"
                  fill="white"
                  fontSize="2.5"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {contact.name.charAt(0)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredContact && (() => {
          const contact = getContact(hoveredContact);
          if (!contact) return null;
          return (
            <div
              className="absolute bg-ceramic-text-primary text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none"
              style={{
                left: `${contact.x}%`,
                top: `${contact.y}%`,
                transform: 'translate(-50%, -140%)',
              }}
            >
              {contact.name} — {contact.role}
            </div>
          );
        })()}
      </div>

      {/* Space legend */}
      <div className="flex flex-wrap justify-center gap-3">
        {Object.entries(ROLE_COLORS)
          .filter(([role]) =>
            contacts.some((c) => c.role === role)
          )
          .map(([role, color]) => (
            <div key={role} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-ceramic-text-secondary">
                {role}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
