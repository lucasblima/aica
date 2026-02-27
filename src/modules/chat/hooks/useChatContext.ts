/**
 * useChatContext — Route-to-module mapper
 *
 * Detects the current route and maps it to a module name + label.
 * Used by ChatShell and ChatSidebar to show module context badges.
 */

import { useLocation } from 'react-router-dom'
import { useMemo } from 'react'

const ROUTE_MODULE_MAP: Record<string, { module: string; label: string }> = {
  '/atlas': { module: 'atlas', label: 'Atlas' },
  '/vida': { module: 'journey', label: 'Journey' },
  '/journey': { module: 'journey', label: 'Journey' },
  '/studio': { module: 'studio', label: 'Studio' },
  '/grants': { module: 'captacao', label: 'Captacao' },
  '/finance': { module: 'finance', label: 'Finance' },
  '/connections': { module: 'connections', label: 'Connections' },
  '/flux': { module: 'flux', label: 'Flux' },
  '/agenda': { module: 'agenda', label: 'Agenda' },
}

export function useChatContext() {
  const location = useLocation()

  return useMemo(() => {
    const path = location.pathname
    // Match longest prefix first — sort routes by length descending
    const sorted = Object.entries(ROUTE_MODULE_MAP).sort(
      ([a], [b]) => b.length - a.length
    )
    for (const [route, info] of sorted) {
      if (path.startsWith(route)) {
        return { currentModule: info.module, moduleLabel: info.label }
      }
    }
    return { currentModule: null as string | null, moduleLabel: 'Geral' }
  }, [location.pathname])
}
