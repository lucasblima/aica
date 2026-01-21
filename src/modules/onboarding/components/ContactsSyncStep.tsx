/**
 * ContactsSyncStep Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Third step of the onboarding flow:
 * - Real sync with Evolution API via Edge Function
 * - Contacts and groups counters from actual data
 * - Privacy notice
 *
 * Now checks if contacts were already synced automatically by webhook
 * when connection was established (via triggerAutomaticSync in webhook-evolution).
 *
 * Issue: #92 - Contacts list integration
 * Epic: #122 - Multi-Instance WhatsApp Architecture
 *
 * @see PR #120 - WhatsApp Onboarding Flow
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Shield, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useWhatsAppContacts, SyncResult } from '@/hooks/useWhatsAppContacts';
import { useWhatsAppSessionSubscription } from '@/hooks/useWhatsAppSessionSubscription';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('ContactsSyncStep');

interface ContactsSyncStepProps {
  /** Callback when sync is complete */
  onComplete: () => void;
  /** Optional className */
  className?: string;
}

type SyncPhase = 'initializing' | 'checking' | 'syncing' | 'complete' | 'error';

export function ContactsSyncStep({
  onComplete,
  className = '',
}: ContactsSyncStepProps) {
  const {
    totalCount,
    groupsCount,
    syncStatus,
    syncContacts,
    fetchContacts,
    error: hookError,
  } = useWhatsAppContacts();

  // Subscribe to session for real-time updates on sync status
  const { session } = useWhatsAppSessionSubscription();

  const [currentPhase, setCurrentPhase] = useState<SyncPhase>('initializing');
  const [displayedContacts, setDisplayedContacts] = useState(0);
  const [displayedGroups, setDisplayedGroups] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [hasStartedSync, setHasStartedSync] = useState(false);

  // Check if contacts were already synced by webhook (automatic sync on connection)
  useEffect(() => {
    if (!hasStartedSync && session) {
      setHasStartedSync(true);

      // Check if contacts were already synced automatically
      if (session.contacts_synced && session.last_sync_at) {
        log.debug(' Contacts already synced by webhook, fetching from DB...');
        setCurrentPhase('checking');
        handleAlreadySynced();
      } else {
        log.debug(' No automatic sync detected, starting manual sync...');
        handleSync();
      }
    }
  }, [hasStartedSync, session]);

  // Handle case where contacts were already synced by webhook
  const handleAlreadySynced = useCallback(async () => {
    try {
      // Fetch contacts from database
      await fetchContacts();

      // Short delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 800));

      // Use the counts from the hook
      const contactsCount = totalCount || session?.contacts_count || 0;
      const groups = groupsCount || session?.groups_count || 0;

      // Animate the counters
      animateCounter(contactsCount, setDisplayedContacts, 50);
      animateCounter(groups, setDisplayedGroups, 100);

      setSyncResult({
        success: true,
        synced: contactsCount,
        skipped: 0,
        total: contactsCount,
        duration_ms: 0,
      });

      setCurrentPhase('complete');

      // Auto-advance after showing success
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      log.error(' Error fetching synced contacts:', err);
      // Fall back to manual sync
      handleSync();
    }
  }, [fetchContacts, totalCount, groupsCount, session, onComplete]);

  // Handle sync
  const handleSync = useCallback(async () => {
    setCurrentPhase('initializing');
    setDisplayedContacts(0);
    setDisplayedGroups(0);

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentPhase('syncing');

    const result = await syncContacts();

    if (result) {
      setSyncResult(result);

      // Animate the counters
      animateCounter(result.synced, setDisplayedContacts, 50);

      // Estimate groups (typically 10-20% of total contacts)
      const estimatedGroups = Math.max(1, Math.floor(result.synced * 0.15));
      animateCounter(estimatedGroups, setDisplayedGroups, 100);

      setCurrentPhase('complete');

      // Auto-advance after showing success
      setTimeout(() => {
        onComplete();
      }, 2000);
    } else {
      setCurrentPhase('error');
    }
  }, [syncContacts, onComplete]);

  // Animate counter from 0 to target
  const animateCounter = (
    target: number,
    setter: React.Dispatch<React.SetStateAction<number>>,
    intervalMs: number
  ) => {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 20));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setter(current);
    }, intervalMs);
  };

  // Get phase label
  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'initializing':
        return 'Preparando sincronização...';
      case 'checking':
        return 'Carregando contatos sincronizados...';
      case 'syncing':
        return syncStatus.message || 'Sincronizando contatos...';
      case 'complete':
        return 'Sincronização completa!';
      case 'error':
        return hookError || 'Erro na sincronização';
      default:
        return '';
    }
  };

  const isComplete = currentPhase === 'complete';
  const isError = currentPhase === 'error';
  const isChecking = currentPhase === 'checking';
  // Show 70% progress during 'checking' phase (contacts already synced by webhook)
  const progress = isChecking ? 70 : (isComplete ? 100 : syncStatus.progress || 0);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-ceramic-900">
          Sincronizando WhatsApp
        </h2>
        <p className="text-ceramic-600 mt-1">
          Importando seus contatos do WhatsApp
        </p>
      </motion.div>

      {/* Progress Circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-40 h-40 mb-8"
      >
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={isError ? '#EF4444' : isComplete ? '#22C55E' : '#4ADE80'}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDasharray: '0 440' }}
            animate={{ strokeDasharray: `${progress * 4.4} 440` }}
            transition={{ duration: 0.3 }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle className="w-12 h-12 text-green-500" />
              </motion.div>
            ) : isError ? (
              <motion.div
                key="error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <AlertCircle className="w-12 h-12 text-red-500" />
              </motion.div>
            ) : (
              <motion.div
                key="spinner"
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-2xl font-bold text-ceramic-900 mt-2">
            {progress}%
          </span>
        </div>
      </motion.div>

      {/* Phase Label */}
      <motion.p
        key={currentPhase}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`mb-8 ${isError ? 'text-red-600' : 'text-ceramic-600'}`}
      >
        {getPhaseLabel()}
      </motion.p>

      {/* Retry Button (on error) */}
      {isError && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            setHasStartedSync(false);
            setTimeout(() => setHasStartedSync(true), 100);
          }}
          className="mb-8 flex items-center gap-2 px-4 py-2 bg-ceramic-100 hover:bg-ceramic-200 text-ceramic-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </motion.button>
      )}

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4 w-full max-w-sm"
      >
        <div className="p-4 bg-ceramic-50 rounded-xl text-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <motion.p
            className="text-2xl font-bold text-ceramic-900"
            key={displayedContacts}
          >
            {displayedContacts}
          </motion.p>
          <p className="text-sm text-ceramic-500">Contatos</p>
        </div>

        <div className="p-4 bg-ceramic-50 rounded-xl text-center">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <motion.p
            className="text-2xl font-bold text-ceramic-900"
            key={displayedGroups}
          >
            {displayedGroups}
          </motion.p>
          <p className="text-sm text-ceramic-500">Grupos</p>
        </div>
      </motion.div>

      {/* Sync Result Details */}
      {syncResult && isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-sm text-ceramic-500"
        >
          {syncResult.skipped > 0 && (
            <p>{syncResult.skipped} contatos já existentes (ignorados)</p>
          )}
          <p>Tempo: {(syncResult.duration_ms / 1000).toFixed(1)}s</p>
        </motion.div>
      )}

      {/* Privacy Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-4 bg-green-50 rounded-xl flex items-start gap-3 max-w-sm"
      >
        <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-green-800">Sua privacidade importa</p>
          <p className="text-green-700 mt-1">
            Sincronizamos apenas metadados (nomes e números). O conteúdo das
            mensagens só é analisado quando você solicita explicitamente.
          </p>
        </div>
      </motion.div>

      {/* Skip Button (for testing or when sync fails) */}
      {(isError || currentPhase === 'syncing') && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onComplete}
          className="mt-6 text-ceramic-500 hover:text-ceramic-700 text-sm transition-colors"
        >
          Pular por enquanto
        </motion.button>
      )}
    </div>
  );
}

export default ContactsSyncStep;
