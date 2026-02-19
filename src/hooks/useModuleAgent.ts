/**
 * useModuleAgent — Simple toggle hook for module agent chat visibility
 *
 * Provides open/close state management for the ModuleAgentChat component.
 * Each module imports this hook to add agent access to its main view.
 */

import { useState, useCallback } from 'react';

interface UseModuleAgentReturn {
  isAgentOpen: boolean;
  openAgent: () => void;
  closeAgent: () => void;
  toggleAgent: () => void;
}

export function useModuleAgent(): UseModuleAgentReturn {
  const [isAgentOpen, setIsAgentOpen] = useState(false);

  const openAgent = useCallback(() => setIsAgentOpen(true), []);
  const closeAgent = useCallback(() => setIsAgentOpen(false), []);
  const toggleAgent = useCallback(() => setIsAgentOpen(prev => !prev), []);

  return { isAgentOpen, openAgent, closeAgent, toggleAgent };
}
