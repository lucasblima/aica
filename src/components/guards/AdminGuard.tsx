/**
 * AdminGuard Component
 *
 * Protects admin-only routes by checking user_metadata.is_admin.
 * Redirects non-admin users to home page.
 *
 * Issue: #129 - WhatsApp Instance Monitoring Dashboard
 */

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui'

interface AdminGuardProps {
  children: ReactNode
  fallbackPath?: string
}

export function AdminGuard({ children, fallbackPath = '/' }: AdminGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Verificando permissões..." />
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/landing" replace />
  }

  // Check if user has admin flag in metadata
  const isAdmin = user.user_metadata?.is_admin === true

  console.log('[AdminGuard] Checking admin access:', {
    userId: user.id,
    email: user.email,
    isAdmin,
    metadata: user.user_metadata,
  })

  if (!isAdmin) {
    console.warn('[AdminGuard] Access denied: user is not an admin')
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}

export default AdminGuard
