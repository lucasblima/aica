import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
    Mail, Search, RefreshCw, Loader2, ChevronDown, Paperclip, Unlink,
    Sparkles, Check, X, ArrowRight, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import { useEmailCategories } from '../hooks/useEmailCategories';
import { useEmailTaskExtraction } from '../hooks/useEmailTaskExtraction';
import { extractTasksFromEmails } from '../services/emailIntelligenceService';
import { EmailCategoryBadge } from './EmailCategoryBadge';
import { EmailDetailSheet } from './EmailDetailSheet';
import type { GmailMessage } from '@/services/gmailService';
import type { EmailCategory } from '../types';

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

// --- Category tab config ---

const CATEGORY_TABS: Array<{ key: EmailCategory | null; label: string }> = [
    { key: null, label: 'Todos' },
    { key: 'actionable', label: 'Acao' },
    { key: 'informational', label: 'Info' },
    { key: 'newsletter', label: 'Newsletter' },
    { key: 'receipt', label: 'Recibo' },
    { key: 'personal', label: 'Pessoal' },
    { key: 'notification', label: 'Notificacao' },
];

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

interface EmailRowProps {
    email: GmailMessage;
    category?: EmailCategory;
    confidence?: number;
    onClick?: () => void;
}

function EmailRow({ email, category, confidence, onClick }: EmailRowProps) {
    const name = senderDisplay(email);
    const color = avatarColor(name);
    const isUnread = !email.isRead;

    return (
        <motion.div
            variants={rowVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-3 px-1 py-3 cursor-pointer"
            onClick={onClick}
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
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold text-ceramic-text-primary' : 'text-ceramic-text-primary'}`}>
                            {name}
                        </span>
                        {category && (
                            <EmailCategoryBadge category={category} confidence={confidence} size="sm" />
                        )}
                    </div>
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
    onDisconnect?: () => Promise<void>;
}

export function GmailSection({ isConnected, onConnect, onDisconnect }: GmailSectionProps) {
    const { emails, isLoading, error, search, refresh, loadMore, hasMore } = useGmailIntegration();
    const {
        categories,
        categorizing,
        error: categorizeError,
        selectedCategory,
        categorize,
        setSelectedCategory,
        getCounts,
        hasCategorized,
        lastCategorizedCount,
    } = useEmailCategories();
    const {
        pendingTasks,
        acceptTask,
        dismissTask,
    } = useEmailTaskExtraction();

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [dismissingId, setDismissingId] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);

    // Auto-show and auto-fade success banner
    useEffect(() => {
        if (lastCategorizedCount !== null && !categorizing) {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [lastCategorizedCount, categorizing]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        await search(searchQuery.trim());
        setIsSearching(false);
    };

    const handleAcceptTask = async (taskId: string) => {
        setAcceptingId(taskId);
        await acceptTask(taskId);
        setAcceptingId(null);
    };

    const handleDismissTask = async (taskId: string) => {
        setDismissingId(taskId);
        await dismissTask(taskId);
        setDismissingId(null);
    };

    const handleExtractTasksFromSheet = useCallback(async (messageId: string) => {
        await extractTasksFromEmails([messageId]);
    }, []);

    // Filter emails by selected category
    const filteredEmails = selectedCategory
        ? emails.filter(email => {
            const cat = categories.get(email.id);
            return cat?.category === selectedCategory;
        })
        : emails;

    const counts = getCounts();

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
                    <div className="flex items-center gap-1">
                        <button
                            onClick={categorize}
                            disabled={categorizing || isLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            title="Categorizar emails com IA"
                        >
                            {categorizing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Categorizar com IA
                        </button>
                        <button
                            onClick={refresh}
                            disabled={isLoading}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ceramic-cool/70 transition-colors"
                            title="Atualizar"
                        >
                            <RefreshCw className={`w-4 h-4 text-ceramic-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        {onDisconnect && (
                            <button
                                onClick={onDisconnect}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ceramic-error/10 transition-colors"
                                title="Desconectar Gmail"
                            >
                                <Unlink className="w-4 h-4 text-ceramic-text-secondary hover:text-ceramic-error" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categorization status banners */}
                <AnimatePresence>
                    {categorizing && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200/60 rounded-xl">
                                <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
                                <span className="text-sm font-medium text-amber-800">
                                    Categorizando emails com IA...
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {categorizeError && !categorizing && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 overflow-hidden"
                        >
                            <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-red-50 border border-red-200/60 rounded-xl">
                                <div className="flex items-center gap-2 min-w-0">
                                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <span className="text-sm text-red-700 truncate">{categorizeError}</span>
                                </div>
                                <button
                                    onClick={categorize}
                                    className="text-xs font-medium text-red-600 hover:text-red-800 whitespace-nowrap px-2 py-1 rounded-md hover:bg-red-100 transition-colors"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {showSuccess && !categorizing && !categorizeError && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-emerald-800">
                                    {lastCategorizedCount === 0
                                        ? 'Nenhum email novo para categorizar'
                                        : `${lastCategorizedCount} email${lastCategorizedCount === 1 ? '' : 's'} categorizado${lastCategorizedCount === 1 ? '' : 's'}!`
                                    }
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Category tab bar */}
                {hasCategorized && (
                    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
                        {CATEGORY_TABS.map(({ key, label }) => {
                            const isActive = selectedCategory === key;
                            const count = key ? counts[key] ?? 0 : categories.size;
                            return (
                                <button
                                    key={key ?? 'all'}
                                    onClick={() => setSelectedCategory(key)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                                        isActive
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-ceramic-cool/70 text-ceramic-text-secondary hover:bg-ceramic-cool'
                                    }`}
                                >
                                    {label}
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1 py-0.5 rounded-full min-w-[18px] text-center ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-ceramic-border/50 text-ceramic-text-secondary'
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

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

            {/* Extracted tasks panel */}
            {pendingTasks.length > 0 && (
                <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800">
                            Tarefas extraidas ({pendingTasks.length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {pendingTasks.slice(0, 5).map(task => (
                            <div key={task.id} className="flex items-start gap-2 text-sm">
                                <div className="flex-1 min-w-0">
                                    <p className="text-ceramic-text-primary truncate">{task.task_description}</p>
                                    {task.source_subject && (
                                        <p className="text-[11px] text-ceramic-text-secondary truncate">
                                            de: {task.source_sender ?? 'desconhecido'} — {task.source_subject}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => handleAcceptTask(task.id)}
                                        disabled={acceptingId === task.id}
                                        className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors disabled:opacity-50"
                                        title="Criar no Atlas"
                                    >
                                        {acceptingId === task.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <>
                                                <ArrowRight className="w-3 h-3" />
                                                Atlas
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDismissTask(task.id)}
                                        disabled={dismissingId === task.id}
                                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-ceramic-error/10 transition-colors disabled:opacity-50"
                                        title="Descartar"
                                    >
                                        {dismissingId === task.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-ceramic-text-secondary" />
                                        ) : (
                                            <X className="w-3 h-3 text-ceramic-text-secondary hover:text-ceramic-error" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                ) : filteredEmails.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-ceramic-text-secondary">
                            {selectedCategory ? 'Nenhum email nesta categoria' : 'Nenhum email encontrado'}
                        </p>
                    </div>
                ) : (
                    <motion.div
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-ceramic-border/30"
                    >
                        {filteredEmails.map((email) => {
                            const catData = categories.get(email.id);
                            return (
                                <EmailRow
                                    key={email.id}
                                    email={email}
                                    category={catData?.category}
                                    confidence={catData?.confidence}
                                    onClick={() => setSelectedEmail(email)}
                                />
                            );
                        })}
                    </motion.div>
                )}
            </div>

            {/* Load more */}
            {hasMore && !selectedCategory && (
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

            {/* Email detail sheet */}
            <EmailDetailSheet
                email={selectedEmail}
                category={selectedEmail ? categories.get(selectedEmail.id)?.category : undefined}
                confidence={selectedEmail ? categories.get(selectedEmail.id)?.confidence : undefined}
                onClose={() => setSelectedEmail(null)}
                onExtractTasks={handleExtractTasksFromSheet}
            />
        </div>
    );
}
