/**
 * TestAuth Debug Component
 *
 * Displays side-by-side comparison of current App.tsx auth state
 * vs useAuth hook output to validate behavior before migration.
 *
 * This component should be REMOVED after Phase A is complete.
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface TestAuthProps {
  // Current App.tsx state (to compare against)
  currentIsAuthenticated: boolean;
  currentUserId: string | null;
  currentUserEmail: string | null;
  currentIsCheckingAuth: boolean;
}

export function TestAuth({
  currentIsAuthenticated,
  currentUserId,
  currentUserEmail,
  currentIsCheckingAuth
}: TestAuthProps) {
  // Get useAuth hook values
  const { user, session, isLoading, isAuthenticated } = useAuth();

  // Compare values
  const authMatches = currentIsAuthenticated === isAuthenticated;
  const userIdMatches = currentUserId === (user?.id || null);
  const emailMatches = currentUserEmail === (user?.email || null);
  const loadingMatches = currentIsCheckingAuth === isLoading;

  const allMatches = authMatches && userIdMatches && emailMatches && loadingMatches;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: allMatches ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '12px 16px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        borderTop: '2px solid rgba(255,255,255,0.3)',
        maxHeight: '200px',
        overflowY: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '14px' }}>
          🧪 AUTH DEBUG: {allMatches ? '✅ ALL MATCH' : '❌ MISMATCH DETECTED'}
        </strong>
        <span style={{ fontSize: '10px', opacity: 0.8 }}>
          Phase A - Auth Migration Validation
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Current App.tsx State */}
        <div>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '4px',
            fontSize: '11px',
            opacity: 0.9
          }}>
            📊 CURRENT (App.tsx state)
          </div>
          <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
            <div>isAuthenticated: {String(currentIsAuthenticated)}</div>
            <div>userId: {currentUserId || 'null'}</div>
            <div>userEmail: {currentUserEmail || 'null'}</div>
            <div>isCheckingAuth: {String(currentIsCheckingAuth)}</div>
          </div>
        </div>

        {/* useAuth Hook Values */}
        <div>
          <div style={{
            fontWeight: 'bold',
            marginBottom: '4px',
            fontSize: '11px',
            opacity: 0.9
          }}>
            🎯 TARGET (useAuth hook)
          </div>
          <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
            <div style={{ color: authMatches ? 'white' : '#fbbf24' }}>
              isAuthenticated: {String(isAuthenticated)}
            </div>
            <div style={{ color: userIdMatches ? 'white' : '#fbbf24' }}>
              user.id: {user?.id || 'null'}
            </div>
            <div style={{ color: emailMatches ? 'white' : '#fbbf24' }}>
              user.email: {user?.email || 'null'}
            </div>
            <div style={{ color: loadingMatches ? 'white' : '#fbbf24' }}>
              isLoading: {String(isLoading)}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Debug Info */}
      <div style={{
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        fontSize: '10px',
        opacity: 0.8
      }}>
        Session ID: {session?.access_token?.substring(0, 20) || 'null'}...
        {' | '}
        User metadata: {user?.user_metadata?.provider || 'none'}
      </div>
    </div>
  );
}
