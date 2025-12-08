import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertCircle, Check, RefreshCw, X } from 'lucide-react';

interface CalendarSyncIndicatorProps {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncTime?: string;
  onConnect: () => void;
  onSync: () => void;
}

export const CalendarSyncIndicator: React.FC<CalendarSyncIndicatorProps> = ({
  isConnected,
  isSyncing,
  lastSyncTime,
  onConnect,
  onSync
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      {/* Botão Indicador */}
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`relative ceramic-card p-2 rounded-full transition-all duration-200 hover:scale-105 ${
          !isConnected ? 'ring-2 ring-red-300' : ''
        }`}
      >
        <Calendar className={`w-5 h-5 ${
          isConnected ? 'text-ceramic-text-secondary' : 'text-red-500'
        }`} />

        {/* Ponto de status */}
        {!isConnected && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}

        {isSyncing && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="w-5 h-5 text-ceramic-accent" />
          </motion.div>
        )}
      </button>

      {/* Tooltip/Dropdown */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-64 ceramic-card p-4 rounded-2xl z-50 shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-ceramic-text-primary">
                Google Calendar
              </span>
              <button
                onClick={() => setShowTooltip(false)}
                className="p-1 hover:bg-ceramic-text-secondary/10 rounded-full"
              >
                <X className="w-4 h-4 text-ceramic-text-secondary" />
              </button>
            </div>

            {isConnected ? (
              <>
                {/* Status Conectado */}
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-green-50">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Conectado</span>
                </div>

                {lastSyncTime && (
                  <p className="text-xs text-ceramic-text-secondary mb-3">
                    Última sincronização: {lastSyncTime}
                  </p>
                )}

                <button
                  onClick={() => { onSync(); setShowTooltip(false); }}
                  disabled={isSyncing}
                  className="w-full ceramic-inset py-2 text-sm font-medium text-ceramic-text-primary hover:text-ceramic-accent transition-colors disabled:opacity-50"
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
                </button>
              </>
            ) : (
              <>
                {/* Status Desconectado */}
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-red-50">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">Não conectado</span>
                </div>

                <p className="text-xs text-ceramic-text-secondary mb-3">
                  Conecte seu Google Calendar para ver seus compromissos aqui.
                </p>

                <button
                  onClick={() => { onConnect(); setShowTooltip(false); }}
                  className="w-full ceramic-card py-2 text-sm font-bold text-ceramic-accent hover:scale-[1.02] transition-transform"
                >
                  Conectar Agenda
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
