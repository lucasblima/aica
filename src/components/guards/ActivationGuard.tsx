/**
 * ActivationGuard Component
 *
 * Gates access to the app based on invite activation status.
 * Sits inside AuthGuard — user is already authenticated.
 * If not activated, shows the WaitingRoomPage.
 */

import { ReactNode, useState, useEffect } from 'react'
import { useActivationStatus } from '@/hooks/useActivationStatus'
import { LoadingScreen } from '@/components/ui'
import { WaitingRoomPage } from '@/pages/WaitingRoomPage'

interface ActivationGuardProps {
  children: ReactNode
}

export function ActivationGuard({ children }: ActivationGuardProps) {
  const { isActivated, loading } = useActivationStatus()
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowLoading(true), 300)
      return () => clearTimeout(timer)
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setShowLoading(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loading])

  if (loading) {
    return showLoading ? <LoadingScreen message="Verificando acesso..." /> : <div className="min-h-screen bg-ceramic-base" />
  }

  if (isActivated === false) {
    return <WaitingRoomPage />
  }

  return <>{children}</>
}

export default ActivationGuard
