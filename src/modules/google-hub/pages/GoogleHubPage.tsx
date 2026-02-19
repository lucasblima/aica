import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { PageShell } from '@/components/ui';
import { useGoogleScopes } from '@/hooks/useGoogleScopes';
// Legacy: will be re-enabled when CASA assessment is completed
// import { GmailSection } from '../components/GmailSection';
// import { ConversationSummarySection } from '../components/ConversationSummarySection';
// import { DriveSection } from '../components/DriveSection';
import { CalendarSection } from '../components/CalendarSection';
import { Loader2, Mail, HardDrive, type LucideIcon } from 'lucide-react';

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
    onDisconnect?: () => Promise<void>;
}

function StatusPill({ label, connected, color, isLoading, onConnect, onDisconnect }: StatusPillProps) {
    const [busy, setBusy] = React.useState(false);

    const handleAction = async (action: () => Promise<void>) => {
        setBusy(true);
        try {
            await action();
        } catch {
            // handled upstream
        } finally {
            setBusy(false);
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
            <button
                onClick={onDisconnect ? () => handleAction(onDisconnect) : undefined}
                disabled={busy || !onDisconnect}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: `${color}15`, color }}
                title={onDisconnect ? `Desconectar ${label}` : undefined}
            >
                {busy ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                )}
                {label}
            </button>
        );
    }

    if (onConnect) {
        return (
            <button
                onClick={() => handleAction(onConnect)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-ceramic-border text-xs font-medium text-ceramic-text-secondary hover:bg-ceramic-cool transition-colors disabled:opacity-50"
            >
                {busy ? (
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

function ComingSoonPill({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-ceramic-cool/60 text-ceramic-text-secondary/70">
            <span className="w-1.5 h-1.5 rounded-full bg-ceramic-text-secondary/30" />
            {label} · Em Breve
        </span>
    );
}

interface ComingSoonServiceCardProps {
    icon: LucideIcon;
    color: string;
    title: string;
    description: string;
}

function ComingSoonServiceCard({ icon: Icon, color, title, description }: ComingSoonServiceCardProps) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-ceramic-border/40 bg-gradient-to-br from-ceramic-cool/30 via-ceramic-base to-ceramic-cool/20">
            {/* Subtle decorative circle — faint glow behind the icon */}
            <div
                className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.04] blur-2xl"
                style={{ backgroundColor: color }}
            />

            <div className="relative px-8 py-10 sm:px-10 sm:py-12">
                {/* Icon */}
                <div className="mb-6">
                    <div
                        className="inline-flex items-center justify-center w-12 h-12 rounded-xl opacity-25"
                        style={{ backgroundColor: `${color}12` }}
                    >
                        <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                </div>

                {/* Title + Badge */}
                <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-ceramic-text-primary/50">
                        {title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase bg-amber-50 text-amber-600/80 border border-amber-200/50">
                        Em Breve
                    </span>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-ceramic-text-secondary/60 max-w-md">
                    {description}
                </p>
            </div>
        </div>
    );
}

export function GoogleHubPage() {
    const navigate = useNavigate();
    const {
        hasCalendar,
        isLoading,
        disconnectCalendar,
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
                            onDisconnect={hasCalendar ? disconnectCalendar : undefined}
                        />
                        <ComingSoonPill label="Gmail" />
                        <ComingSoonPill label="Drive" />
                    </div>
                </motion.div>

                {/* Calendar Section — fully functional */}
                <motion.div variants={itemVariants}>
                    <CalendarSection
                        isConnected={hasCalendar}
                        onDisconnect={disconnectCalendar}
                    />
                </motion.div>

                {/* Gmail — Coming Soon teaser */}
                <motion.div variants={itemVariants}>
                    <ComingSoonServiceCard
                        icon={Mail}
                        color="#4285F4"
                        title="Gmail"
                        description="Gerencie sua caixa de entrada sem sair da AICA. Categorize emails com IA, extraia tarefas automaticamente e mantenha tudo organizado."
                    />
                </motion.div>

                {/* Drive — Coming Soon teaser */}
                <motion.div variants={itemVariants}>
                    <ComingSoonServiceCard
                        icon={HardDrive}
                        color="#0F9D58"
                        title="Google Drive"
                        description="Acesse e organize seus arquivos diretamente na AICA. Navegue, busque e gerencie documentos em um so lugar."
                    />
                </motion.div>
            </motion.div>
        </PageShell>
    );
}

export default GoogleHubPage;
