/**
 * ActivationGuard Component
 *
 * Gates access to the app based on invite activation status.
 * Sits inside AuthGuard — user is already authenticated.
 * If not activated, shows the WaitingRoomPage.
 */

import { ReactNode } from 'react'
import { useActivationStatus } from '@/hooks/useActivationStatus'
import { LoadingScreen } from '@/components/ui'
import { WaitingRoomPage } from '@/pages/WaitingRoomPage'

interface ActivationGuardProps {
  children: ReactNode
}

export function ActivationGuard({ children }: ActivationGuardProps) {
  const { isActivated, loading } = useActivationStatus()

  if (loading) {
    return <LoadingScreen message="Verificando acesso..." />
  }

  if (isActivated === false) {
    return <WaitingRoomPage />
  }

  return <>{children}</>
}

export default ActivationGuard
