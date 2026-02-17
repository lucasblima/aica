import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Mail, Search, RefreshCw, Loader2, ChevronDown, Paperclip } from 'lucide-react';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import type { GmailMessage } from '@/services/gmailService';

// --- Helpers ---

function relativeTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ontem';
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const AVATAR_COLORS = [
    '#4285F4', '#EA4335', '#FBBC04', '#34A853',
    '#FF6D01', '#46BDC6', '#7B1FA2', '#C2185B',
];

function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function senderDisplay(email: GmailMessage): string {
    if (email.sender) {
        return email.sender.replace(/<[^>]+>/, '').trim();
    }
    return email.senderEmail || 'Desconhecido';
}

// --- Animation variants ---

const listVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.04 },
    },
};

const rowVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

// --- Components ---

function EmailRow({ email }: { email: GmailMessage }) {
    const name = senderDisplay(email);
    const color = avatarColor(name);
    const isUnread = !email.isRead;

    return (
        <motion.div
            variants={rowVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 px-1 py-3 cursor-pointer"
        >
            <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${color}18` }}
            >
                <span className="text-sm font-semibold" style={{ color }}>
                    {name.charAt(0).toUpperCase()}
                </span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${isUnread ? 'font-semibold text-ceramic-text-primary' : 'text-ceramic-text-primary'}`}>
                        {name}
                    </span>
                    <span className="text-[11px] text-ceramic-text-secondary whitespace-nowrap flex-shrink-0 tabular-nums">
                        {relativeTime(email.receivedAt || email.date)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <p className={`text-sm truncate ${isUnread ? 'font-medium text-ceramic-text-primary' : 'text-ceramic-text-secondary'}`}>
                        {email.subject || '(sem assunto)'}
                    </p>
                    {email.hasAttachments && (
                        <Paperclip className="w-3 h-3 text-ceramic-text-secondary flex-shrink-0" />
                    )}
                </div>
                <p className="text-xs text-ceramic-text-secondary/70 truncate mt-0.5 leading-relaxed">
                    {email.snippet}
                </p>
            </div>
        </motion.div>
    );
}

function SkeletonRow() {
    return (
        <div className="flex items-start gap-3 px-1 py-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-ceramic-cool flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
                <div className="flex justify-between">
                    <div className="h-3.5 bg-ceramic-cool rounded w-28" />
                    <div className="h-3 bg-ceramic-cool rounded w-10" />
                </div>
                <div className="h-3.5 bg-ceramic-cool rounded w-3/4" />
                <div className="h-3 bg-ceramic-cool/60 rounded w-full" />
            </div>
        </div>
    );
}

// --- Main section ---

interface GmailSectionProps {
    isConnected: boolean;
    onConnect: () => Promise<void>;
}

export function GmailSection({ isConnected, onConnect }: GmailSectionProps) {
    const { emails, isLoading, error, search, refresh, loadMore, hasMore } = useGmailIntegration();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        await search(searchQuery.trim());
        setIsSearching(false);
    };

    if (!isConnected) {
        return (
            <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#4285F4]/10 flex items-center justify-center mb-5">
                    <Mail className="w-8 h-8 text-[#4285F4]" />
                </div>
                <p className="text-base text-ceramic-text-secondary mb-5 max-w-xs mx-auto leading-relaxed">
                    Conecte seu Gmail para acessar seus emails aqui
                </p>
                <button
                    onClick={onConnect}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    Conectar Gmail
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Section divider + header */}
            <div className="border-t border-ceramic-border/60 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <Mail className="w-5 h-5 text-[#4285F4]" />
                        <h2 className="text-lg font-semibold text-ceramic-text-primary">Gmail</h2>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={isLoading}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ceramic-cool/70 transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw className={`w-4 h-4 text-ceramic-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search — frosted glass */}
                <form onSubmit={handleSearch} className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary/60" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar emails..."
                        className="w-full pl-10 pr-4 py-2.5 bg-ceramic-cool/70 backdrop-blur-sm rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-shadow"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary animate-spin" />
                    )}
                </form>
            </div>

            {/* Email list */}
            <div className="max-h-[420px] overflow-y-auto -mx-1">
                {isLoading && emails.length === 0 ? (
                    <div className="divide-y divide-ceramic-border/30">
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </div>
                ) : error ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-ceramic-error">{error}</p>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-ceramic-text-secondary">Nenhum email encontrado</p>
                    </div>
                ) : (
                    <motion.div
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-ceramic-border/30"
                    >
                        {emails.map((email) => (
                            <EmailRow key={email.id} email={email} />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Load more */}
            {hasMore && (
                <div className="pt-3 text-center">
                    <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors rounded-lg hover:bg-ceramic-cool/50"
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Carregar mais
                    </button>
                </div>
            )}
        </div>
    );
}
