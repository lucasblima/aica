import React, { useState } from 'react';
import { Calendar, Unlink, Loader2, CheckCircle2 } from 'lucide-react';

interface CalendarSectionProps {
    isConnected: boolean;
    onDisconnect: () => Promise<void>;
}

export function CalendarSection({ isConnected, onDisconnect }: CalendarSectionProps) {
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            await onDisconnect();
        } finally {
            setIsDisconnecting(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="border-t border-ceramic-border/60 pt-6">
                <div className="flex items-center gap-2.5 mb-3">
                    <Calendar className="w-5 h-5 text-[#EA4335]" />
                    <h2 className="text-lg font-semibold text-ceramic-text-primary">Calendar</h2>
                </div>
                <p className="text-sm text-ceramic-text-secondary">
                    O Calendar é conectado automaticamente no login com Google.
                    Seus eventos aparecem no módulo Agenda.
                </p>
            </div>
        );
    }

    return (
        <div className="border-t border-ceramic-border/60 pt-6">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-[#EA4335]" />
                    <h2 className="text-lg font-semibold text-ceramic-text-primary">Calendar</h2>
                    <CheckCircle2 className="w-4 h-4 text-ceramic-success" />
                </div>
                <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-error rounded-lg hover:bg-ceramic-error/5 transition-colors disabled:opacity-50"
                >
                    {isDisconnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Unlink className="w-3 h-3" />
                    )}
                    Desconectar
                </button>
            </div>
            <p className="text-sm text-ceramic-text-secondary">
                Seus eventos do Google Calendar estão sincronizados com o módulo Agenda.
                Tarefas e treinos agendados na AICA aparecem no seu calendário automaticamente.
            </p>
        </div>
    );
}
