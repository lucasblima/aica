/**
 * AuthGuard Component
 *
 * Protects authenticated routes. Redirects to /landing if not authenticated.
 * Used as a wrapper in Route elements so routes remain unconditional in the
 * React tree — preventing unmount/remount on auth state changes.
 */

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Verificando autenticação..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />
  }

  return <>{children}</>
}

export default AuthGuard
