/**
 * GoogleContextPanel — Reusable contextual search panel for any AICA module.
 *
 * Shows relevant Gmail emails and Drive files based on module context.
 * Includes confirm/reject actions for AI-suggested links.
 * Follows Ceramic Design System + Jony Ive aesthetic.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
    Mail,
    HardDrive,
    Search,
    Loader2,
    Check,
    X,
    ExternalLink,
    FileText,
    Image,
    Sheet,
    Presentation,
    File,
    Sparkles,
    Link2,
} from 'lucide-react';
import { useModuleGoogleContext } from '@/hooks/useModuleGoogleContext';
import type { AicaModule, GmailContextResult, DriveContextResult, LinkSuggestion } from '@/services/googleContextService';

// ============================================================================
// HELPERS
// ============================================================================

function relativeTime(dateStr: string): string {
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

function getMimeIcon(mimeType: string) {
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-4 h-4 text-[#4285F4]" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <Sheet className="w-4 h-4 text-[#0F9D58]" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-4 h-4 text-[#F4B400]" />;
    if (mimeType.includes('image')) return <Image className="w-4 h-4 text-[#DB4437]" />;
    return <File className="w-4 h-4 text-ceramic-text-secondary" />;
}

function confidencePill(confidence: number) {
    if (confidence >= 0.8) {
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-ceramic-success/10 text-ceramic-success">
                {Math.round(confidence * 100)}%
            </span>
        );
    }
    if (confidence >= 0.5) {
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-ceramic-warning/10 text-ceramic-warning">
                {Math.round(confidence * 100)}%
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-ceramic-cool text-ceramic-text-secondary">
            {Math.round(confidence * 100)}%
        </span>
    );
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

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
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function EmailContextRow({
    email,
    suggestion,
    onConfirm,
    onReject,
    compact,
}: {
    email: GmailContextResult;
    suggestion?: LinkSuggestion;
    onConfirm?: (id: string) => void;
    onReject?: (id: string) => void;
    compact?: boolean;
}) {
    const name = email.sender || email.senderEmail || 'Desconhecido';
    const color = avatarColor(name);
    const isConfirmed = suggestion === undefined; // from saved links, already confirmed

    return (
        <motion.div
            variants={rowVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15 }}
            className={`flex items-start gap-3 px-1 ${compact ? 'py-2' : 'py-3'} group ${isConfirmed ? 'border-l-2 border-ceramic-success/40 pl-3' : ''}`}
        >
            <div
                className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}
                style={{ backgroundColor: `${color}18` }}
            >
                <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold`} style={{ color }}>
                    {name.charAt(0).toUpperCase()}
                </span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ceramic-text-primary truncate">
                        {name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {confidencePill(email.confidence)}
                        <span className="text-[11px] text-ceramic-text-secondary whitespace-nowrap tabular-nums">
                            {relativeTime(email.receivedAt)}
                        </span>
                    </div>
                </div>
                <p className="text-sm text-ceramic-text-primary truncate">
                    {email.subject || '(sem assunto)'}
                </p>
                {!compact && (
                    <p className="text-xs text-ceramic-text-secondary/70 truncate mt-0.5 leading-relaxed">
                        {email.snippet}
                    </p>
                )}
                {email.relevanceReason && (
                    <p className="text-[11px] text-ceramic-info/80 mt-0.5 truncate">
                        {email.relevanceReason}
                    </p>
                )}
            </div>

            {/* Confirm / Reject actions */}
            {suggestion && onConfirm && onReject && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                        onClick={() => onConfirm(suggestion.resourceId)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-success/10 transition-colors"
                        title="Confirmar link"
                    >
                        <Check className="w-3.5 h-3.5 text-ceramic-success" />
                    </button>
                    <button
                        onClick={() => onReject(suggestion.resourceId)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-error/10 transition-colors"
                        title="Rejeitar"
                    >
                        <X className="w-3.5 h-3.5 text-ceramic-error" />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

function DriveContextRow({
    file,
    suggestion,
    onConfirm,
    onReject,
    compact,
}: {
    file: DriveContextResult;
    suggestion?: LinkSuggestion;
    onConfirm?: (id: string) => void;
    onReject?: (id: string) => void;
    compact?: boolean;
}) {
    const isConfirmed = suggestion === undefined;

    return (
        <motion.div
            variants={rowVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15 }}
            className={`flex items-center gap-3 px-1 ${compact ? 'py-2' : 'py-3'} group ${isConfirmed ? 'border-l-2 border-ceramic-success/40 pl-3' : ''}`}
        >
            <div className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} bg-ceramic-cool/80 rounded-lg flex items-center justify-center flex-shrink-0`}>
                {getMimeIcon(file.mimeType)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ceramic-text-primary truncate">
                        {file.name}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                        {confidencePill(file.confidence)}
                        <span className="text-[11px] text-ceramic-text-secondary whitespace-nowrap tabular-nums">
                            {relativeTime(file.modifiedTime)}
                        </span>
                    </div>
                </div>
                {file.relevanceReason && (
                    <p className="text-[11px] text-ceramic-info/80 mt-0.5 truncate">
                        {file.relevanceReason}
                    </p>
                )}
            </div>

            {/* External link */}
            {file.webViewLink && (
                <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 hover:bg-ceramic-cool transition-all duration-200"
                    title="Abrir no Drive"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                </a>
            )}

            {/* Confirm / Reject actions */}
            {suggestion && onConfirm && onReject && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                        onClick={() => onConfirm(suggestion.resourceId)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-success/10 transition-colors"
                        title="Confirmar link"
                    >
                        <Check className="w-3.5 h-3.5 text-ceramic-success" />
                    </button>
                    <button
                        onClick={() => onReject(suggestion.resourceId)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-error/10 transition-colors"
                        title="Rejeitar"
                    >
                        <X className="w-3.5 h-3.5 text-ceramic-error" />
                    </button>
                </div>
            )}
        </motion.div>
    );
}

function SkeletonRow({ compact }: { compact?: boolean }) {
    return (
        <div className={`flex items-start gap-3 px-1 ${compact ? 'py-2' : 'py-3'} animate-pulse`}>
            <div className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-full bg-ceramic-cool flex-shrink-0`} />
            <div className="flex-1 space-y-2 pt-1">
                <div className="flex justify-between">
                    <div className="h-3.5 bg-ceramic-cool rounded w-28" />
                    <div className="h-3 bg-ceramic-cool rounded w-10" />
                </div>
                <div className="h-3.5 bg-ceramic-cool rounded w-3/4" />
                {!compact && <div className="h-3 bg-ceramic-cool/60 rounded w-full" />}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GoogleContextPanelProps {
    module: AicaModule;
    context: {
        entities?: string[];
        keywords?: string[];
        people?: string[];
    };
    compact?: boolean;
    className?: string;
}

export function GoogleContextPanel({
    module,
    context,
    compact = false,
    className = '',
}: GoogleContextPanelProps) {
    const {
        results,
        isLoading,
        error,
        search,
        confirmLink,
        rejectLink,
        savedLinks,
        isLoadingSaved,
        hasGmail,
        hasDrive,
        isGoogleLoading,
        connectGmail,
        connectDrive,
    } = useModuleGoogleContext(module, context);

    const [activeTab, setActiveTab] = useState<'emails' | 'files'>('emails');
    const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());

    const gmailResults = results?.gmail?.results ?? [];
    const driveResults = results?.drive?.results ?? [];
    const suggestions = results?.suggestions ?? [];

    // Build suggestion map by resourceId for quick lookup
    const suggestionMap = new Map<string, LinkSuggestion>();
    for (const s of suggestions) {
        suggestionMap.set(s.resourceId, s);
    }

    // Filter out rejected items
    const visibleGmail = gmailResults.filter(e => !rejectedIds.has(e.id));
    const visibleDrive = driveResults.filter(f => !rejectedIds.has(f.id));

    // Saved links split by type
    const savedEmails = savedLinks.filter(l => l.resource_type === 'email' && l.status === 'confirmed');
    const savedFiles = savedLinks.filter(l => l.resource_type === 'file' && l.status === 'confirmed');

    const emailCount = visibleGmail.length + savedEmails.length;
    const fileCount = visibleDrive.length + savedFiles.length;

    const handleConfirm = async (resourceId: string) => {
        // Find the link in savedLinks that matches
        const link = savedLinks.find(l => l.resource_id === resourceId);
        if (link) {
            await confirmLink(link.id);
        }
    };

    const handleReject = async (resourceId: string) => {
        const link = savedLinks.find(l => l.resource_id === resourceId);
        if (link) {
            await rejectLink(link.id);
        }
        setRejectedIds(prev => new Set(prev).add(resourceId));
    };

    const handleSearch = () => {
        search(context);
    };

    // Not connected state
    if (!isGoogleLoading && !hasGmail && !hasDrive) {
        return (
            <div className={`bg-ceramic-base rounded-2xl border border-ceramic-border/40 p-6 ${className}`}>
                <div className={`${compact ? 'py-8' : 'py-12'} text-center`}>
                    <div className="w-14 h-14 mx-auto rounded-full bg-ceramic-cool/80 flex items-center justify-center mb-4">
                        <Link2 className="w-7 h-7 text-ceramic-text-secondary" />
                    </div>
                    <p className="text-sm text-ceramic-text-secondary mb-4 max-w-xs mx-auto leading-relaxed">
                        Conecte Gmail ou Drive para ver conteudo relevante deste modulo
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={connectGmail}
                            className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            Conectar Gmail
                        </button>
                        <button
                            onClick={connectDrive}
                            className="px-4 py-2 bg-[#0F9D58] hover:bg-[#0B8043] text-white text-sm font-medium rounded-xl transition-colors"
                        >
                            Conectar Drive
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-ceramic-base rounded-2xl border border-ceramic-border/40 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-ceramic-text-primary`}>
                            Contexto Google
                        </h3>
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Search className="w-3.5 h-3.5" />
                        )}
                        {isLoading ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-ceramic-cool/50 rounded-lg p-0.5">
                    <button
                        onClick={() => setActiveTab('emails')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === 'emails'
                                ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }`}
                    >
                        <Mail className="w-3.5 h-3.5" />
                        Emails
                        {emailCount > 0 && (
                            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                                activeTab === 'emails'
                                    ? 'bg-amber-500/15 text-amber-600'
                                    : 'bg-ceramic-cool text-ceramic-text-secondary'
                            }`}>
                                {emailCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === 'files'
                                ? 'bg-ceramic-base text-ceramic-text-primary shadow-sm'
                                : 'text-ceramic-text-secondary hover:text-ceramic-text-primary'
                        }`}
                    >
                        <HardDrive className="w-3.5 h-3.5" />
                        Arquivos
                        {fileCount > 0 && (
                            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                                activeTab === 'files'
                                    ? 'bg-amber-500/15 text-amber-600'
                                    : 'bg-ceramic-cool text-ceramic-text-secondary'
                            }`}>
                                {fileCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 mb-3 px-3 py-2 bg-ceramic-error/5 border border-ceramic-error/20 rounded-lg">
                    <p className="text-xs text-ceramic-error">{error}</p>
                </div>
            )}

            {/* Content */}
            <div className={`px-4 pb-4 ${compact ? 'max-h-[280px]' : 'max-h-[400px]'} overflow-y-auto`}>
                <AnimatePresence mode="wait">
                    {activeTab === 'emails' ? (
                        <motion.div
                            key="emails"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.15 }}
                        >
                            {isLoading && gmailResults.length === 0 ? (
                                <div className="divide-y divide-ceramic-border/30">
                                    <SkeletonRow compact={compact} />
                                    <SkeletonRow compact={compact} />
                                    <SkeletonRow compact={compact} />
                                </div>
                            ) : visibleGmail.length === 0 && savedEmails.length === 0 ? (
                                <div className={`${compact ? 'py-8' : 'py-12'} text-center`}>
                                    <Mail className="w-8 h-8 text-ceramic-text-secondary/30 mx-auto mb-2" />
                                    <p className="text-sm text-ceramic-text-secondary">
                                        {!hasGmail
                                            ? 'Gmail nao conectado'
                                            : results
                                                ? 'Nenhum email relevante encontrado'
                                                : 'Clique em Buscar para encontrar emails relevantes'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="divide-y divide-ceramic-border/30"
                                >
                                    {visibleGmail.map((email) => (
                                        <EmailContextRow
                                            key={email.id}
                                            email={email}
                                            suggestion={suggestionMap.get(email.id)}
                                            onConfirm={handleConfirm}
                                            onReject={handleReject}
                                            compact={compact}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="files"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                        >
                            {isLoading && driveResults.length === 0 ? (
                                <div className="divide-y divide-ceramic-border/30">
                                    <SkeletonRow compact={compact} />
                                    <SkeletonRow compact={compact} />
                                    <SkeletonRow compact={compact} />
                                </div>
                            ) : visibleDrive.length === 0 && savedFiles.length === 0 ? (
                                <div className={`${compact ? 'py-8' : 'py-12'} text-center`}>
                                    <HardDrive className="w-8 h-8 text-ceramic-text-secondary/30 mx-auto mb-2" />
                                    <p className="text-sm text-ceramic-text-secondary">
                                        {!hasDrive
                                            ? 'Drive nao conectado'
                                            : results
                                                ? 'Nenhum arquivo relevante encontrado'
                                                : 'Clique em Buscar para encontrar arquivos relevantes'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="divide-y divide-ceramic-border/30"
                                >
                                    {visibleDrive.map((file) => (
                                        <DriveContextRow
                                            key={file.id}
                                            file={file}
                                            suggestion={suggestionMap.get(file.id)}
                                            onConfirm={handleConfirm}
                                            onReject={handleReject}
                                            compact={compact}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
