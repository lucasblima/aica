/**
 * ModuleTray Component
 * Track 2: Foundation Components - FASE 2.3
 *
 * Horizontal scrollable row of passive module pills
 * Follows Ceramic Design System with scroll-snap behavior
 */

import React, { useRef } from 'react';
import { ModulePill } from './ModulePill';
import type { ModuleInfo } from './ModulePill';
type ViewState = string;

export interface ModuleTrayProps {
  modules: ModuleInfo[];
  onModuleClick: (moduleId: string, route: ViewState) => void;
  className?: string;
}

export function ModuleTray({ modules, onModuleClick, className = '' }: ModuleTrayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className={`flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-6 px-6 ${className}`}
      style={{ scrollSnapType: 'x mandatory' }}
      data-testid="module-tray"
    >
      {modules.map((module) => (
        <div key={module.id} style={{ scrollSnapAlign: 'start' }}>
          <ModulePill
            module={module}
            onClick={() => onModuleClick(module.id, module.route)}
          />
        </div>
      ))}
    </div>
  );
}

export default ModuleTray;
