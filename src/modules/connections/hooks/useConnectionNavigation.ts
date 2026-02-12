import { useNavigate } from 'react-router-dom';

interface UseConnectionNavigationReturn {
  navigateToConnections: () => void;
  navigateToSpace: (spaceId: string) => void;
  goBack: () => void;
}

export function useConnectionNavigation(): UseConnectionNavigationReturn {
  const navigate = useNavigate();

  return {
    navigateToConnections: () => navigate('/connections'),
    navigateToSpace: (spaceId: string) => navigate(`/connections/${spaceId}`),
    goBack: () => navigate('/connections'),
  };
}

export default useConnectionNavigation;
