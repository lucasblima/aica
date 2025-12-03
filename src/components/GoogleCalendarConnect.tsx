import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, LogOut, Loader2 } from 'lucide-react';
import { connectGoogleCalendar, disconnectGoogleCalendar, isGoogleCalendarConnected } from '../services/googleAuthService';

export default function GoogleCalendarConnect() {
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log('[GoogleCalendarConnect] Component rendered', { connected, loading, error });

    // Verificar se já está conectado ao carregar
    useEffect(() => {
        console.log('[GoogleCalendarConnect] useEffect: Checking connection...');
        const checkConnection = async () => {
            try {
                const isConnected = await isGoogleCalendarConnected();
                console.log('[GoogleCalendarConnect] Connection status:', isConnected);
                setConnected(isConnected);
            } catch (err) {
                console.error('[GoogleCalendarConnect] Erro ao verificar conexão:', err);
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
                <h3 className="text-xl font-bold text-[#5C554B] mb-1">
                    Sincronizar Agenda
                </h3>
                <p className="text-sm text-[#948D82] leading-relaxed">
                    Importe suas reuniões para a Timeline Líquida
                </p>

                {/* Mensagem de Erro */}
                {error && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                )}
            </div>

            {/* Seção de Ação */}
            <div className="flex-shrink-0 flex items-center gap-3">
                {!connected ? (
                    // Botão de Autorizar
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
                                <span>Autorizando...</span>
                            </>
                        ) : (
                            <>
                                <span>Autorizar Acesso</span>
                            </>
                        )}
                    </button>
                ) : (
                    // Status Sincronizado + Botão Desconectar
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Sincronizado</span>
                        </div>
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
