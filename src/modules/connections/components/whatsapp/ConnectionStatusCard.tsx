/**
 * ConnectionStatusCard Component
 *
 * Displays WhatsApp connection status with QR code for pairing.
 * Shows connection state, instance information, and connection actions.
 *
 * Related: Issue #12 - Privacy-First WhatsApp Integration, Task 2.3
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { useWhatsAppConnection } from '../../hooks/useWhatsAppConnection';
import { useWhatsAppGamification } from '../../hooks/useWhatsAppGamification';
import { cardElevationVariants } from '@/lib/animations/ceramic-motion';
import { PairingCodeDisplay } from './PairingCodeDisplay';
import { createNamespacedLogger } from '@/lib/logger';
const log = createNamespacedLogger('ConnectionStatusCard');

// ============================================================================
// TYPES
// ============================================================================

interface ConnectionStatusCardProps {
  className?: string;
  showQRCode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  /** Numero de telefone para pairing code (formato: 5511987654321) */
  phoneNumber?: string;
  /** Metodo de conexao padrao */
  defaultMethod?: ConnectionMethod;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'unknown';
type ConnectionMethod = 'qrcode' | 'pairing';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status color based on connection state
 */
function getStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return '#6B7B5C'; // Ceramic positive
    case 'connecting':
      return '#D97706'; // Ceramic accent
    case 'disconnected':
      return '#9B4D3A'; // Ceramic negative
    default:
      return '#9CA3AF'; // Gray
  }
}

/**
 * Get status label in Portuguese
 */
function getStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Conectado';
    case 'connecting':
      return 'Conectando...';
    case 'disconnected':
      return 'Desconectado';
    default:
      return 'Desconhecido';
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: ConnectionStatus): React.ReactNode {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className="w-5 h-5 text-ceramic-positive" />;
    case 'connecting':
      return <Loader2 className="w-5 h-5 text-ceramic-accent animate-spin" />;
    case 'disconnected':
      return <XCircle className="w-5 h-5 text-ceramic-negative" />;
    default:
      return <AlertCircle className="w-5 h-5 text-ceramic-text-tertiary" />;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  className = '',
  showQRCode = true,
  autoRefresh = true,
  refreshInterval = 10000, // 10 seconds
  phoneNumber = '',
  defaultMethod = 'pairing',
}) => {
  const {
    session,
    connectionState,
    qrCode,
    isLoading,
    error,
    connect,
    disconnect,
    fetchQRCode,
    checkConnection,
  } = useWhatsAppConnection();

  const { trackConnection } = useWhatsAppGamification();

  const [status, setStatus] = useState<ConnectionStatus>('unknown');
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(defaultMethod);

  // Determine connection status from session (database) and connectionState (Evolution API)
  useEffect(() => {
    if (!session) {
      setStatus('unknown');
    } else if (session.status === 'connected' && connectionState?.state === 'open') {
      setStatus('connected');
    } else if (session.status === 'connecting' || connectionState?.state === 'connecting') {
      setStatus('connecting');
    } else {
      setStatus('disconnected');
    }
  }, [session, connectionState]);

  // Auto-refresh connection status
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      checkConnection();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, checkConnection]);

  // Handle connect action
  const handleConnect = async () => {
    try {
      await connect();
      if (showQRCode && !qrCode) {
        await fetchQRCode();
      }

      // Award XP and badge for first connection
      await trackConnection();
    } catch (err) {
      log.error('[ConnectionStatusCard] Connect error:', err);
    }
  };

  // Handle disconnect action
  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      log.error('[ConnectionStatusCard] Disconnect error:', err);
    }
  };

  // Handle refresh QR code
  const handleRefreshQR = async () => {
    try {
      await fetchQRCode();
    } catch (err) {
      log.error('[ConnectionStatusCard] Refresh QR error:', err);
    }
  };

  return (
    <motion.div
      className={`ceramic-card p-6 rounded-3xl space-y-6 ${className}`}
      variants={cardElevationVariants}
      initial="rest"
      whileHover="hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="ceramic-concave p-4 rounded-xl">
            <Smartphone className="w-6 h-6 text-ceramic-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ceramic-text-primary">
              Aica Bot (WhatsApp)
            </h3>
            <p className="text-sm text-ceramic-text-secondary">
              {session?.instance_name
                ? 'Converse com a Aica pelo WhatsApp'
                : 'Conecte-se ao bot da Aica'}
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={checkConnection}
          disabled={isLoading}
          className="ceramic-inset p-2 rounded-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          aria-label="Atualizar status"
        >
          <RefreshCw
            className={`w-4 h-4 text-ceramic-text-secondary ${
              isLoading ? 'animate-spin' : ''
            }`}
          />
        </button>
      </div>

      {/* Status Indicator */}
      <div className="ceramic-inset p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(status)}
            <div>
              <p className="text-sm font-bold text-ceramic-text-primary">
                {getStatusLabel(status)}
              </p>
              {session?.status && (
                <p className="text-xs text-ceramic-text-secondary">
                  Status: {session.status}
                </p>
              )}
            </div>
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getStatusColor(status) }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-ceramic-error/10 border border-ceramic-error/20 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-ceramic-error mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-ceramic-error">Erro</p>
              <p className="text-xs text-ceramic-error/80 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Method Toggle */}
      {showQRCode && status === 'disconnected' && (
        <div className="space-y-4">
          {/* Method Toggle */}
          <div className="flex gap-2 p-1 ceramic-inset rounded-xl">
            <button
              onClick={() => setConnectionMethod('pairing')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                connectionMethod === 'pairing'
                  ? 'ceramic-card text-ceramic-accent'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
              aria-pressed={connectionMethod === 'pairing'}
            >
              <Hash className="w-4 h-4" />
              Codigo
            </button>
            <button
              onClick={() => setConnectionMethod('qrcode')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                connectionMethod === 'qrcode'
                  ? 'ceramic-card text-ceramic-accent'
                  : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
              }`}
              aria-pressed={connectionMethod === 'qrcode'}
            >
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
          </div>

          {/* Pairing Code Display */}
          {connectionMethod === 'pairing' && (
            <PairingCodeDisplay
              phoneNumber={phoneNumber}
              onConnected={() => {
                checkConnection();
                trackConnection();
              }}
              onError={(err) => log.error('[ConnectionStatusCard] Pairing error:', err)}
            />
          )}

          {/* QR Code Display */}
          {connectionMethod === 'qrcode' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ceramic-text-primary">
                  Escanear QR Code
                </p>
                <button
                  onClick={handleRefreshQR}
                  disabled={isLoading}
                  className="text-xs text-ceramic-accent hover:underline disabled:opacity-50"
                >
                  Atualizar
                </button>
              </div>

              <div className="ceramic-inset p-6 rounded-xl flex items-center justify-center bg-ceramic-base">
                {isLoading ? (
                  <Loader2 className="w-12 h-12 animate-spin text-ceramic-accent" />
                ) : qrCode ? (
                  <img
                    src={qrCode}
                    alt="QR Code para conectar WhatsApp"
                    className="w-64 h-64 rounded-lg"
                  />
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="w-12 h-12 text-ceramic-text-secondary mx-auto mb-3" />
                    <p className="text-sm text-ceramic-text-secondary">
                      Clique em "Conectar" para gerar QR Code
                    </p>
                  </div>
                )}
              </div>

              {qrCode && (
                <p className="text-xs text-ceramic-text-secondary text-center">
                  Escaneie para conectar ao bot da Aica. Para importar conversas privadas, use a aba "Importar".
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Connection Actions */}
      <div className="flex gap-3">
        {status === 'disconnected' || status === 'unknown' ? (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex-1 ceramic-card px-4 py-3 rounded-xl font-bold text-ceramic-positive hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Conectando...
              </span>
            ) : (
              'Conectar'
            )}
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="flex-1 ceramic-card px-4 py-3 rounded-xl font-bold text-ceramic-negative hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Desconectando...
              </span>
            ) : (
              'Desconectar'
            )}
          </button>
        )}

        {status === 'connected' && (
          <button
            onClick={checkConnection}
            disabled={isLoading}
            className="ceramic-card px-4 py-3 rounded-xl font-bold text-ceramic-accent hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
          >
            Verificar
          </button>
        )}
      </div>

      {/* Connection Info */}
      {status === 'connected' && connectionState?.state === 'open' && (
        <div className="ceramic-inset p-4 rounded-xl space-y-3">
          <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Informações da Conexão
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-ceramic-text-secondary">Instância</p>
              <p className="text-sm font-bold text-ceramic-text-primary">
                {connectionState.instance || connectionState?.state}
              </p>
            </div>
            <div>
              <p className="text-xs text-ceramic-text-secondary">Estado</p>
              <p className="text-sm font-bold text-ceramic-text-primary">
                {connectionState.state}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Session Details (from whatsapp_sessions table) */}
      {session && status === 'connected' && (
        <div className="ceramic-inset p-4 rounded-xl space-y-3">
          <p className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">
            Detalhes da Sessão
          </p>
          <div className="space-y-2">
            {session.phone_number && (
              <div>
                <p className="text-xs text-ceramic-text-secondary">Número</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {session.phone_number}
                </p>
              </div>
            )}
            {session.profile_name && (
              <div>
                <p className="text-xs text-ceramic-text-secondary">Nome do Perfil</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {session.profile_name}
                </p>
              </div>
            )}
            {session.connected_at && (
              <div>
                <p className="text-xs text-ceramic-text-secondary">Conectado em</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {new Date(session.connected_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            {session.last_sync_at && (
              <div>
                <p className="text-xs text-ceramic-text-secondary">Última Sincronização</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {new Date(session.last_sync_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-ceramic-text-secondary">Contatos</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {session.contacts_count}
                </p>
              </div>
              <div>
                <p className="text-xs text-ceramic-text-secondary">Grupos</p>
                <p className="text-sm font-bold text-ceramic-text-primary">
                  {session.groups_count}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ConnectionStatusCard;
