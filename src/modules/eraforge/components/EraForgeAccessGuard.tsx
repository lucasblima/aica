import { ReactNode, useState, useEffect } from 'react';
import { useEraforgeAccess } from '../hooks';
import { LoadingScreen } from '@/components/ui';
import { EraForgeLandingView } from '../views/EraForgeLandingView';

interface EraForgeAccessGuardProps {
  children: ReactNode;
}

export function EraForgeAccessGuard({ children }: EraForgeAccessGuardProps) {
  const { hasAccess, status, loading, requesting, requestAccess } = useEraforgeAccess();
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowLoading(true), 300);
      return () => clearTimeout(timer);
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setShowLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loading]);

  if (loading) {
    return showLoading ? <LoadingScreen message="Verificando acesso..." /> : null;
  }

  if (hasAccess === false) {
    const mappedStatus = status === null ? 'none' : (status as 'none' | 'pending' | 'rejected');
    return (
      <EraForgeLandingView
        status={mappedStatus}
        requesting={requesting}
        onRequestAccess={requestAccess}
      />
    );
  }

  return <>{children}</>;
}

export default EraForgeAccessGuard;
