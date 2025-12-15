import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, RefreshCw, Calendar, Check, AlertCircle } from 'lucide-react';

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

  // Determinar estado visual do badge
  const getStatusBadge = () => {
    if (hasError) return { color: 'bg-red-500', icon: AlertCircle };
    if (!isConnected) return { color: 'bg-ceramic-text-secondary/40', icon: null };
    if (isSyncing) return { color: 'bg-amber-500', icon: null };
    return { color: 'bg-emerald-500', icon: Check };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="relative">
      {/* Botão com ícone de calendário sempre visível */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
          isConnected
            ? 'bg-ceramic-text-secondary/5 hover:bg-ceramic-text-secondary/10'
            : 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
        }`}
        aria-label="Status do Google Calendar"
      >
        <Calendar
          className={`w-5 h-5 ${
            isConnected
              ? 'text-ceramic-text-secondary'
              : 'text-amber-600'
          } ${isSyncing ? 'animate-pulse' : ''}`}
        />

        {/* Badge de status no canto */}
        <motion.div
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${statusBadge.color} flex items-center justify-center`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {statusBadge.icon && (
            <statusBadge.icon className="w-2.5 h-2.5 text-white" />
          )}
          {isSyncing && (
            <motion.div
              className="w-2 h-2 bg-white rounded-full"
              animate={{ scale: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
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
