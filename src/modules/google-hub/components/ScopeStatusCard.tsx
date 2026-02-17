import React from 'react';
import { Calendar, Mail, HardDrive, CheckCircle, Loader2, Link2 } from 'lucide-react';

interface ScopeStatusCardProps {
    hasCalendar: boolean;
    hasGmail: boolean;
    hasDrive: boolean;
    isLoading: boolean;
    onConnectGmail: () => Promise<void>;
    onConnectDrive: () => Promise<void>;
}

interface ScopeRowProps {
    icon: React.ReactNode;
    label: string;
    connected: boolean;
    isLoading: boolean;
    onConnect?: () => Promise<void>;
}

function ScopeRow({ icon, label, connected, isLoading, onConnect }: ScopeRowProps) {
    const [connecting, setConnecting] = React.useState(false);

    const handleConnect = async () => {
        if (!onConnect) return;
        setConnecting(true);
        try {
            await onConnect();
        } catch {
            setConnecting(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-ceramic-cool rounded-xl flex items-center justify-center">
                    {icon}
                </div>
                <span className="text-sm font-medium text-ceramic-text-primary">{label}</span>
            </div>
            {isLoading ? (
                <Loader2 className="w-4 h-4 text-ceramic-text-secondary animate-spin" />
            ) : connected ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-ceramic-success/10 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-ceramic-success" />
                    <span className="text-xs font-medium text-ceramic-success">Conectado</span>
                </div>
            ) : (
                <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {connecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Link2 className="w-3 h-3" />
                    )}
                    Conectar
                </button>
            )}
        </div>
    );
}

export function ScopeStatusCard({
    hasCalendar,
    hasGmail,
    hasDrive,
    isLoading,
    onConnectGmail,
    onConnectDrive,
}: ScopeStatusCardProps) {
    return (
        <div className="bg-ceramic-base rounded-xl p-5 shadow-ceramic-emboss">
            <h3 className="text-sm font-bold text-ceramic-text-secondary uppercase tracking-wider mb-3">
                Servicos Google
            </h3>
            <div className="divide-y divide-ceramic-border">
                <ScopeRow
                    icon={<Calendar className="w-5 h-5 text-[#EA4335]" />}
                    label="Google Calendar"
                    connected={hasCalendar}
                    isLoading={isLoading}
                />
                <ScopeRow
                    icon={<Mail className="w-5 h-5 text-[#4285F4]" />}
                    label="Gmail"
                    connected={hasGmail}
                    isLoading={isLoading}
                    onConnect={onConnectGmail}
                />
                <ScopeRow
                    icon={<HardDrive className="w-5 h-5 text-[#0F9D58]" />}
                    label="Google Drive"
                    connected={hasDrive}
                    isLoading={isLoading}
                    onConnect={onConnectDrive}
                />
            </div>
        </div>
    );
}
