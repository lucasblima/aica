import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/ui';
import { useGoogleScopes } from '@/hooks/useGoogleScopes';
import { ScopeStatusCard } from '../components/ScopeStatusCard';
import { GmailSection } from '../components/GmailSection';
import { DriveSection } from '../components/DriveSection';

export function GoogleHubPage() {
    const navigate = useNavigate();
    const {
        hasCalendar,
        hasGmail,
        hasDrive,
        isLoading,
        connectGmail,
        connectDrive,
    } = useGoogleScopes();

    return (
        <PageShell title="Google Hub" onBack={() => navigate('/')}>
            {/* Scope Status */}
            <ScopeStatusCard
                hasCalendar={hasCalendar}
                hasGmail={hasGmail}
                hasDrive={hasDrive}
                isLoading={isLoading}
                onConnectGmail={connectGmail}
                onConnectDrive={connectDrive}
            />

            {/* Gmail Section */}
            <GmailSection
                isConnected={hasGmail}
                onConnect={connectGmail}
            />

            {/* Drive Section */}
            <DriveSection
                isConnected={hasDrive}
                onConnect={connectDrive}
            />
        </PageShell>
    );
}

export default GoogleHubPage;
