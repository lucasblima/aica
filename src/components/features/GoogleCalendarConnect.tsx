import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, LogOut, Loader2, Info, RefreshCw } from 'lucide-react';
import { connectGoogleCalendar, disconnectGoogleCalendar, isGoogleCalendarConnected } from '@/services/googleAuthService';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('GoogleCalendarConnect');

interface GoogleCalendarConnectProps {
    onSync?: () => void | Promise<void>;
    lastSyncTime?: Date | null;
    isSyncing?: boolean;
    isTokenExpired?: boolean;
}

export default function GoogleCalendarConnect({
    onSync,
    lastSyncTime,
    isSyncing = false,
    isTokenExpired = false
}: GoogleCalendarConnectProps) {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    log.debug('Component rendered', {
        connected,
        loading,
        error,
        lastSyncTime,
        isSyncing
    });

    // Verificar se já está conectado ao carregar
    useEffect(() => {
        log.debug('useEffect: Checking connection...');
        const checkConnection = async () => {
            try {
                const isConnected = await isGoogleCalendarConnected();
                log.debug('Connection status:', isConnected);
                setConnected(isConnected);
            } catch (err) {
                log.error('Erro ao verificar conexão:', err);
            }
        };

        checkConnection();
    }, []);

    const handleConnect = async () => {
        setLoading(true);
        setError(null);

        try {
            await connectGoogleCalendar();
            // A conexão será confirmada após o redirect OAuth
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao conectar Google Calendar');
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        setError(null);

        try {
            await disconnectGoogleCalendar();
            setConnected(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao desconectar Google Calendar');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (onSync) {
            log.debug('Sincronização manual solicitada');
            await onSync();
        }
    };

    const getTimeSinceLastSync = (): string => {
        if (!lastSyncTime) return 'Nunca';

        const now = new Date();
        const diff = now.getTime() - lastSyncTime.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Agora mesmo';
        if (minutes === 1) return 'Há 1 minuto';
        if (minutes < 60) return `Há ${minutes} minutos`;

        const hours = Math.floor(minutes / 60);
        if (hours === 1) return 'Há 1 hora';
        return `Há ${hours} horas`;
    };

    return (
        <div
            className="flex flex-row items-center justify-between gap-6 p-8 rounded-[32px] bg-[#F0EFE9] w-full max-w-2xl"
            style={{
                boxShadow: '12px 12px 24px #e0dfd9, -12px -12px 24px #ffffff'
            }}
        >
            {/* Ícone do Google Calendar */}
            <div className="flex-shrink-0">
                <div
                    className="flex items-center justify-center w-16 h-16 bg-[#F0EFE9] rounded-2xl"
                    style={{
                        boxShadow: '6px 6px 12px #d4d3cd, -6px -6px 12px #ffffff'
                    }}
                >
                    {/* Google Calendar Icon - Minimalista */}
                    <Calendar className="w-8 h-8 text-[#EA4335]" strokeWidth={1.5} />
                </div>
            </div>

            {/* Conteúdo Textual */}
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-[#5C554B]">
                        Sincronizar Agenda
                    </h3>
                    <div className="relative">
                        <button
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-[#EBE9E4] text-[#948D82] hover:text-[#5C554B] transition-colors"
                        >
                            <Info className="w-3 h-3" />
                        </button>

                        {/* Tooltip */}
                        {showTooltip && (
                            <div className="absolute left-0 top-6 w-64 z-10 bg-[#5C554B] text-white text-xs rounded-lg p-3 shadow-lg">
                                <p className="mb-2 font-semibold">Por que autorizar novamente?</p>
                                <p className="leading-relaxed opacity-90">
                                    O login inicial do Aica usa apenas autenticação básica. Para acessar seus eventos do Google Calendar, precisamos de uma permissão específica adicional.
                                </p>
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-[#5C554B] transform rotate-45"></div>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-[#948D82] leading-relaxed">
                    {isTokenExpired
                        ? 'Sessão expirada. Clique em Reconectar para continuar.'
                        : 'Importe suas reuniões para a Timeline Líquida'
                    }
                </p>

                {/* Indicador de última sincronização */}
                {connected && lastSyncTime && (
                    <p className="text-xs text-[#948D82] mt-2 flex items-center gap-1">
                        <span className="opacity-70">Última sincronização:</span>
                        <span className="font-medium">{getTimeSinceLastSync()}</span>
                    </p>
                )}

                {/* Mensagem de Erro */}
                {error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                )}
            </div>

            {/* Seção de Ação */}
            <div className="flex-shrink-0 flex items-center gap-3">
                {!connected || isTokenExpired ? (
                    // Botão de Autorizar/Reconectar
                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-[#F0EFE9] text-[#5C554B] font-semibold rounded-2xl transition-all duration-200 active:shadow-[inset_3px_3px_6px_#d4d3cd,inset_-3px_-3px_6px_#ffffff] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            boxShadow: '6px 6px 12px #d4d3cd, -6px -6px 12px #ffffff'
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{isTokenExpired ? 'Reconectando...' : 'Autorizando...'}</span>
                            </>
                        ) : (
                            <>
                                <span>{isTokenExpired ? 'Reconectar' : 'Autorizar Acesso'}</span>
                            </>
                        )}
                    </button>
                ) : (
                    // Status Sincronizado + Botões de Ação
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Sincronizado</span>
                        </div>

                        {/* Botão Sincronizar Agora */}
                        <button
                            onClick={handleSync}
                            disabled={loading || isSyncing || !onSync}
                            className="flex items-center gap-2 px-4 py-2 bg-[#F0EFE9] text-[#5C554B] text-sm font-medium rounded-lg transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                boxShadow: '4px 4px 8px #d4d3cd, -4px -4px 8px #ffffff'
                            }}
                            title="Sincronizar agora"
                        >
                            {isSyncing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                        </button>

                        {/* Botão Desconectar */}
                        <button
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-[#F0EFE9] text-[#948D82] text-sm font-medium rounded-lg transition-all hover:text-[#5C554B] disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Desconectar Google Calendar"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <LogOut className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
