/**
 * useSavedPauta Hook
 *
 * Hook customizado para gerenciar pautas salvas no banco de dados.
 * Fornece:
 * - Carregamento da pauta ativa
 * - Listagem de versoes
 * - Mudanca de versao ativa
 * - Exclusao de pautas
 * - Conversao de pauta salva para GeneratedPauta
 */

import { useState, useEffect, useCallback } from 'react'
import {
  pautaPersistenceService,
  type CompleteSavedPauta,
  type PautaVersion,
} from '../services/pautaPersistenceService'
import type { GeneratedPauta } from '../services/pautaGeneratorService'
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useSavedPauta');

export interface UseSavedPautaResult {
  // Data
  activePauta: CompleteSavedPauta | null
  activePautaAsGenerated: GeneratedPauta | null
  versions: PautaVersion[]

  // Loading states
  isLoading: boolean
  isLoadingVersions: boolean

  // Actions
  loadActivePauta: () => Promise<void>
  loadVersions: () => Promise<void>
  setActiveVersion: (pautaId: string) => Promise<boolean>
  deletePauta: (pautaId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useSavedPauta(projectId: string | undefined): UseSavedPautaResult {
  const [activePauta, setActivePauta] = useState<CompleteSavedPauta | null>(null)
  const [versions, setVersions] = useState<PautaVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  /**
   * Carrega a pauta ativa para o projeto
   */
  const loadActivePauta = useCallback(async () => {
    if (!projectId) {
      setActivePauta(null)
      return
    }

    setIsLoading(true)
    try {
      const pauta = await pautaPersistenceService.getActivePauta(projectId)
      setActivePauta(pauta)
    } catch (error) {
      log.error('Error loading active pauta:', error)
      setActivePauta(null)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  /**
   * Carrega todas as versoes de pautas do projeto
   */
  const loadVersions = useCallback(async () => {
    if (!projectId) {
      setVersions([])
      return
    }

    setIsLoadingVersions(true)
    try {
      const versionList = await pautaPersistenceService.listPautaVersions(projectId)
      setVersions(versionList)
    } catch (error) {
      log.error('Error loading pauta versions:', error)
      setVersions([])
    } finally {
      setIsLoadingVersions(false)
    }
  }, [projectId])

  /**
   * Define uma versao especifica como ativa
   */
  const setActiveVersion = useCallback(
    async (pautaId: string): Promise<boolean> => {
      if (!projectId) return false

      try {
        const success = await pautaPersistenceService.setActivePauta(pautaId, projectId)
        if (success) {
          await loadActivePauta()
          await loadVersions()
        }
        return success
      } catch (error) {
        log.error('Error setting active version:', error)
        return false
      }
    },
    [projectId, loadActivePauta, loadVersions]
  )

  /**
   * Exclui uma pauta
   */
  const deletePauta = useCallback(
    async (pautaId: string): Promise<boolean> => {
      try {
        const success = await pautaPersistenceService.deletePauta(pautaId)
        if (success) {
          await loadActivePauta()
          await loadVersions()
        }
        return success
      } catch (error) {
        log.error('Error deleting pauta:', error)
        return false
      }
    },
    [loadActivePauta, loadVersions]
  )

  /**
   * Recarrega tanto a pauta ativa quanto as versoes
   */
  const refresh = useCallback(async () => {
    await Promise.all([loadActivePauta(), loadVersions()])
  }, [loadActivePauta, loadVersions])

  /**
   * Converte pauta salva para GeneratedPauta (para uso no UI)
   */
  const activePautaAsGenerated = activePauta
    ? pautaPersistenceService.savedPautaToGenerated(activePauta)
    : null

  // Load on mount and when projectId changes
  useEffect(() => {
    loadActivePauta()
    loadVersions()
  }, [projectId, loadActivePauta, loadVersions])

  return {
    activePauta,
    activePautaAsGenerated,
    versions,
    isLoading,
    isLoadingVersions,
    loadActivePauta,
    loadVersions,
    setActiveVersion,
    deletePauta,
    refresh,
  }
}

export default useSavedPauta
