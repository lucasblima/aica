import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, RefreshCw } from 'lucide-react';

interface CalendarStatusDotProps {
  isConnected: boolean;
  isSyncing: boolean;
  hasError?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
}

export const CalendarStatusDot: React.FC<CalendarStatusDotProps> = ({
  isConnected,
  isSyncing,
  hasError = false,
  onConnect,
  onDisconnect,
  onSync
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // Determinar estado visual
  const getStatusColor = () => {
    if (hasError || !isConnected) return 'bg-red-500';
    if (isSyncing) return 'bg-amber-500';
    return 'bg-transparent'; // Invisível quando OK
  };

  const isVisible = !isConnected || isSyncing || hasError;

  return (
    <div className="relative">
      {/* Ponto de Status */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="relative p-2 rounded-full hover:bg-ceramic-text-secondary/5 transition-colors"
        aria-label="Status do Google Calendar"
      >
        <motion.div
          className={`w-2 h-2 rounded-full ${getStatusColor()} ${
            isSyncing ? 'animate-pulse' : ''
          }`}
          initial={{ scale: 0 }}
          animate={{
            scale: isVisible ? 1 : 0,
            opacity: isVisible ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
        />
      </button>

      {/* Menu Dropdown Minimalista */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 ceramic-card p-3 rounded-xl min-w-[160px] shadow-lg"
            >
              {isConnected ? (
                <div className="space-y-2">
                  {/* Sync Button */}
                  {onSync && (
                    <button
                      onClick={() => { onSync(); setShowMenu(false); }}
                      disabled={isSyncing}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ceramic-text-primary hover:bg-ceramic-text-secondary/5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                    </button>
                  )}

                  {/* Disconnect Button */}
                  {onDisconnect && (
                    <button
                      onClick={() => { onDisconnect(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Desconectar
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { onConnect(); setShowMenu(false); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-ceramic-accent hover:bg-amber-50 rounded-lg transition-colors"
                >
                  Conectar Agenda
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
