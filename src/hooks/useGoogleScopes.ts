/**
 * Hook to manage Google OAuth scopes (Calendar, Gmail, Drive).
 * Checks which scopes are granted and provides connect/disconnect methods.
 */

import { useState, useEffect, useCallback } from 'react';
import { hasCalendarWriteScope, hasGmailScope, hasDriveScope, removeScope } from '@/services/googleCalendarTokenService';
import { connectGmail, connectDrive, disconnectGoogleCalendar, isGoogleCalendarConnected } from '@/services/googleAuthService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('useGoogleScopes');

interface GoogleScopesState {
    hasCalendar: boolean;
    hasGmail: boolean;
    hasDrive: boolean;
    isLoading: boolean;
    connectGmail: () => Promise<void>;
    connectDrive: () => Promise<void>;
    disconnectAll: () => Promise<void>;
    disconnectGmail: () => Promise<void>;
    disconnectDrive: () => Promise<void>;
    disconnectCalendar: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useGoogleScopes(): GoogleScopesState {
    const [hasCalendar, setHasCalendar] = useState(false);
    const [hasGmail, setHasGmail] = useState(false);
    const [hasDriveScope_, setHasDrive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkScopes = useCallback(async () => {
        setIsLoading(true);
        try {
            const isConnected = await isGoogleCalendarConnected();
            if (!isConnected) {
                setHasCalendar(false);
                setHasGmail(false);
                setHasDrive(false);
                return;
            }

            const [calendar, gmail, drive] = await Promise.all([
                hasCalendarWriteScope(),
                hasGmailScope(),
                hasDriveScope(),
            ]);

            setHasCalendar(calendar);
            setHasGmail(gmail);
            setHasDrive(drive);
        } catch (err) {
            log.error('Error checking Google scopes:', { error: err });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkScopes();
    }, [checkScopes]);

    const handleConnectGmail = useCallback(async () => {
        await connectGmail();
        // Page will redirect for OAuth — no need to update state here
    }, []);

    const handleConnectDrive = useCallback(async () => {
        await connectDrive();
    }, []);

    const handleDisconnectAll = useCallback(async () => {
        await disconnectGoogleCalendar();
        setHasCalendar(false);
        setHasGmail(false);
        setHasDrive(false);
    }, []);

    const handleDisconnectGmail = useCallback(async () => {
        await removeScope('gmail');
        setHasGmail(false);
    }, []);

    const handleDisconnectDrive = useCallback(async () => {
        await removeScope('drive');
        setHasDrive(false);
    }, []);

    const handleDisconnectCalendar = useCallback(async () => {
        await removeScope('calendar.events');
        setHasCalendar(false);
    }, []);

    return {
        hasCalendar,
        hasGmail,
        hasDrive: hasDriveScope_,
        isLoading,
        connectGmail: handleConnectGmail,
        connectDrive: handleConnectDrive,
        disconnectAll: handleDisconnectAll,
        disconnectGmail: handleDisconnectGmail,
        disconnectDrive: handleDisconnectDrive,
        disconnectCalendar: handleDisconnectCalendar,
        refresh: checkScopes,
    };
}
