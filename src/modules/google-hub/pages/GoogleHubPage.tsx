import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { PageShell } from '@/components/ui';
import { useGoogleScopes } from '@/hooks/useGoogleScopes';
import { GmailSection } from '../components/GmailSection';
import { DriveSection } from '../components/DriveSection';
import { Loader2 } from 'lucide-react';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface StatusPillProps {
    label: string;
    connected: boolean;
    color: string;
    isLoading: boolean;
    onConnect?: () => Promise<void>;
}

function StatusPill({ label, connected, color, isLoading, onConnect }: StatusPillProps) {
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

    if (isLoading) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ceramic-border text-xs font-medium text-ceramic-text-secondary">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                {label}
            </span>
        );
    }

    if (connected) {
        return (
            <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${color}15`, color }}
            >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
            </span>
        );
    }

    if (onConnect) {
        return (
            <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ceramic-border text-xs font-medium text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors disabled:opacity-50"
            >
                {connecting ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                    <span className="w-1.5 h-1.5 rounded-full border border-ceramic-text-secondary" />
                )}
                {label}
            </button>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ceramic-border text-xs font-medium text-ceramic-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full border border-ceramic-text-secondary" />
            {label}
        </span>
    );
}

export function GoogleHubPage() {
    const navigate = useNavigate();
    const {
        hasCalendar,
        hasGmail,
        hasDrive,
        isLoading,
        connectGmail,
        connectDrive,
    } = useGoogleScopes();

    return (
        <PageShell onBack={() => navigate('/')}>
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
            >
                {/* Header with inline status pills */}
                <motion.div variants={itemVariants}>
                    <h1 className="text-2xl font-bold text-ceramic-text-primary mb-3">
                        Seu Google
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill
                            label="Calendar"
                            connected={hasCalendar}
                            color="#EA4335"
                            isLoading={isLoading}
                        />
                        <StatusPill
                            label="Gmail"
                            connected={hasGmail}
                            color="#4285F4"
                            isLoading={isLoading}
                            onConnect={!hasGmail ? connectGmail : undefined}
                        />
                        <StatusPill
                            label="Drive"
                            connected={hasDrive}
                            color="#0F9D58"
                            isLoading={isLoading}
                            onConnect={!hasDrive ? connectDrive : undefined}
                        />
                    </div>
                </motion.div>

                {/* Gmail Section */}
                <motion.div variants={itemVariants}>
                    <GmailSection
                        isConnected={hasGmail}
                        onConnect={connectGmail}
                    />
                </motion.div>

                {/* Drive Section */}
                <motion.div variants={itemVariants}>
                    <DriveSection
                        isConnected={hasDrive}
                        onConnect={connectDrive}
                    />
                </motion.div>
            </motion.div>
        </PageShell>
    );
}

export default GoogleHubPage;
