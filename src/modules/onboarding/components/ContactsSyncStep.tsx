/**
 * ContactsSyncStep Component
 * Sprint: "Ordem ao Caos do WhatsApp"
 *
 * Third step of the onboarding flow:
 * - Animated sync progress
 * - Contacts and groups counters
 * - Privacy notice
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, MessageSquare, Shield, CheckCircle, Loader2 } from 'lucide-react';

interface ContactsSyncStepProps {
  /** Callback when sync is complete */
  onComplete: () => void;
  /** Optional className */
  className?: string;
}

type SyncPhase = 'initializing' | 'contacts' | 'groups' | 'finalizing' | 'complete';

const SYNC_PHASES: { phase: SyncPhase; label: string; duration: number }[] = [
  { phase: 'initializing', label: 'Iniciando sincronização...', duration: 1000 },
  { phase: 'contacts', label: 'Sincronizando contatos...', duration: 2500 },
  { phase: 'groups', label: 'Sincronizando grupos...', duration: 2000 },
  { phase: 'finalizing', label: 'Finalizando...', duration: 1000 },
  { phase: 'complete', label: 'Sincronização completa!', duration: 0 },
];

export function ContactsSyncStep({
  onComplete,
  className = '',
}: ContactsSyncStepProps) {
  const [currentPhase, setCurrentPhase] = useState<SyncPhase>('initializing');
  const [contactsCount, setContactsCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [progress, setProgress] = useState(0);

  // Simulate sync progress
  useEffect(() => {
    let phaseIndex = 0;
    let progressInterval: NodeJS.Timeout;

    const advancePhase = () => {
      if (phaseIndex < SYNC_PHASES.length - 1) {
        phaseIndex++;
        const nextPhase = SYNC_PHASES[phaseIndex];
        setCurrentPhase(nextPhase.phase);

        // Simulate counting during contact/group phases
        if (nextPhase.phase === 'contacts') {
          simulateContacts();
        } else if (nextPhase.phase === 'groups') {
          simulateGroups();
        }

        if (nextPhase.duration > 0) {
          setTimeout(advancePhase, nextPhase.duration);
        } else {
          // Complete
          setTimeout(() => {
            onComplete();
          }, 1500);
        }
      }
    };

    const simulateContacts = () => {
      const targetContacts = Math.floor(Math.random() * 150) + 50; // 50-200 contacts
      let current = 0;
      progressInterval = setInterval(() => {
        current += Math.floor(Math.random() * 10) + 1;
        if (current >= targetContacts) {
          current = targetContacts;
          clearInterval(progressInterval);
        }
        setContactsCount(current);
      }, 100);
    };

    const simulateGroups = () => {
      clearInterval(progressInterval);
      const targetGroups = Math.floor(Math.random() * 20) + 5; // 5-25 groups
      let current = 0;
      progressInterval = setInterval(() => {
        current += 1;
        if (current >= targetGroups) {
          current = targetGroups;
          clearInterval(progressInterval);
        }
        setGroupsCount(current);
      }, 150);
    };

    // Update overall progress
    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 100));
    }, 65);

    // Start first transition
    setTimeout(advancePhase, SYNC_PHASES[0].duration);

    return () => {
      clearInterval(progressInterval);
      clearInterval(progressTimer);
    };
  }, [onComplete]);

  const isComplete = currentPhase === 'complete';

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
          Estamos importando apenas os metadados
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
            stroke={isComplete ? '#22C55E' : '#4ADE80'}
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
        className="text-ceramic-600 mb-8"
      >
        {SYNC_PHASES.find((p) => p.phase === currentPhase)?.label}
      </motion.p>

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
            key={contactsCount}
          >
            {contactsCount}
          </motion.p>
          <p className="text-sm text-ceramic-500">Contatos</p>
        </div>

        <div className="p-4 bg-ceramic-50 rounded-xl text-center">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
          </div>
          <motion.p
            className="text-2xl font-bold text-ceramic-900"
            key={groupsCount}
          >
            {groupsCount}
          </motion.p>
          <p className="text-sm text-ceramic-500">Grupos</p>
        </div>
      </motion.div>

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
    </div>
  );
}

export default ContactsSyncStep;
