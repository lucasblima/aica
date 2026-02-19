import React, { useState, useCallback } from 'react';
import { motion, type Variants } from 'framer-motion';
import { HardDrive, Search, RefreshCw, Loader2, ChevronDown, FileText, Image, Sheet, Presentation, File, ExternalLink, Star, Unlink, Trash2, Pencil, Check, X } from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import { trashFile, renameFile } from '@/services/driveService';
import type { DriveFile } from '@/services/driveService';

// --- Helpers ---

function getMimeIcon(mimeType: string) {
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-4 h-4 text-[#4285F4]" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <Sheet className="w-4 h-4 text-[#0F9D58]" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-4 h-4 text-[#F4B400]" />;
    if (mimeType.includes('image')) return <Image className="w-4 h-4 text-[#DB4437]" />;
    return <File className="w-4 h-4 text-ceramic-text-secondary" />;
}

function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

interface FileRowProps {
    file: DriveFile;
    onTrash?: (fileId: string) => void;
    onRename?: (fileId: string, currentName: string) => void;
    actionLoading?: string | null;
}

function FileRow({ file, onTrash, onRename, actionLoading }: FileRowProps) {
    const isThisLoading = actionLoading === file.id;

    return (
        <motion.div
            variants={rowVariants}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-3 px-1 py-3 group"
        >
            {/* File type icon */}
            <div className="w-9 h-9 bg-ceramic-cool/80 rounded-lg flex items-center justify-center flex-shrink-0">
                {getMimeIcon(file.mimeType)}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {file.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    <span className="text-sm font-medium text-ceramic-text-primary truncate">
                        {file.name}
                    </span>
                    <span className="text-[11px] text-ceramic-text-secondary whitespace-nowrap flex-shrink-0 tabular-nums ml-auto">
                        {relativeTime(file.modifiedTime)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {file.sizeBytes && file.sizeBytes > 0 ? (
                        <span className="text-xs text-ceramic-text-secondary/70">{formatFileSize(file.sizeBytes)}</span>
                    ) : null}
                    {file.sizeBytes && file.sizeBytes > 0 && file.shared && (
                        <span className="text-xs text-ceramic-text-secondary/30">·</span>
                    )}
                    {file.shared && (
                        <span className="text-xs text-ceramic-info/80">Compartilhado</span>
                    )}
                </div>
            </div>

            {/* Actions — visible on hover */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {isThisLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-ceramic-text-secondary animate-spin" />
                ) : (
                    <>
                        {onRename && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRename(file.id, file.name); }}
                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-cool/80 transition-colors"
                                title="Renomear"
                            >
                                <Pencil className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                            </button>
                        )}
                        {onTrash && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onTrash(file.id); }}
                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-error/10 transition-colors"
                                title="Excluir"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                            </button>
                        )}
                    </>
                )}
                {file.webViewLink && (
                    <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-ceramic-cool transition-colors"
                        title="Abrir no Drive"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                    </a>
                )}
            </div>
        </motion.div>
    );
}

function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 px-1 py-3 animate-pulse">
            <div className="w-9 h-9 rounded-lg bg-ceramic-cool flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                    <div className="h-3.5 bg-ceramic-cool rounded w-40" />
                    <div className="h-3 bg-ceramic-cool rounded w-10" />
                </div>
                <div className="h-3 bg-ceramic-cool/60 rounded w-24" />
            </div>
        </div>
    );
}

// --- Main section ---

interface DriveSectionProps {
    isConnected: boolean;
    onConnect: () => Promise<void>;
    onDisconnect?: () => Promise<void>;
}

export function DriveSection({ isConnected, onConnect, onDisconnect }: DriveSectionProps) {
    const { files, isLoading, error, search, refresh, loadMore, hasMore } = useDriveIntegration();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [renamingFile, setRenamingFile] = useState<{ id: string; name: string } | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        await search(searchQuery.trim());
        setIsSearching(false);
    };

    const handleTrash = useCallback(async (fileId: string) => {
        setActionLoadingId(fileId);
        try {
            const result = await trashFile(fileId);
            if (result.success) await refresh();
        } finally {
            setActionLoadingId(null);
        }
    }, [refresh]);

    const handleStartRename = useCallback((fileId: string, currentName: string) => {
        setRenamingFile({ id: fileId, name: currentName });
        setRenameValue(currentName);
    }, []);

    const handleConfirmRename = useCallback(async () => {
        if (!renamingFile || !renameValue.trim() || renameValue === renamingFile.name) {
            setRenamingFile(null);
            return;
        }
        setActionLoadingId(renamingFile.id);
        try {
            const result = await renameFile(renamingFile.id, renameValue.trim());
            if (result.success) await refresh();
        } finally {
            setActionLoadingId(null);
            setRenamingFile(null);
        }
    }, [renamingFile, renameValue, refresh]);

    if (!isConnected) {
        return (
            <div className="py-16 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#0F9D58]/10 flex items-center justify-center mb-5">
                    <HardDrive className="w-8 h-8 text-[#0F9D58]" />
                </div>
                <p className="text-base text-ceramic-text-secondary mb-5 max-w-xs mx-auto leading-relaxed">
                    Conecte seu Drive para acessar seus arquivos aqui
                </p>
                <button
                    onClick={onConnect}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    Conectar Drive
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
                        <HardDrive className="w-5 h-5 text-[#0F9D58]" />
                        <h2 className="text-lg font-semibold text-ceramic-text-primary">Drive</h2>
                    </div>
                    <div className="flex items-center gap-1">
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
                                title="Desconectar Drive"
                            >
                                <Unlink className="w-4 h-4 text-ceramic-text-secondary hover:text-ceramic-error" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search — frosted glass */}
                <form onSubmit={handleSearch} className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary/60" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar arquivos..."
                        className="w-full pl-10 pr-4 py-2.5 bg-ceramic-cool/70 backdrop-blur-sm rounded-xl text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-shadow"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary animate-spin" />
                    )}
                </form>
            </div>

            {/* Inline rename dialog */}
            {renamingFile && (
                <div className="mb-4 p-3 bg-ceramic-cool/50 rounded-xl border border-ceramic-border/60">
                    <p className="text-xs text-ceramic-text-secondary mb-2">Renomear arquivo</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRename();
                                if (e.key === 'Escape') setRenamingFile(null);
                            }}
                            autoFocus
                            className="flex-1 px-3 py-1.5 bg-ceramic-base rounded-lg text-sm text-ceramic-text-primary border border-ceramic-border focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                        <button
                            onClick={handleConfirmRename}
                            disabled={actionLoadingId === renamingFile.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
                        >
                            {actionLoadingId === renamingFile.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                        </button>
                        <button
                            onClick={() => setRenamingFile(null)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ceramic-cool/80 transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                        </button>
                    </div>
                </div>
            )}

            {/* File list */}
            <div className="max-h-[420px] overflow-y-auto -mx-1">
                {isLoading && files.length === 0 ? (
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
                ) : files.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-ceramic-text-secondary">Nenhum arquivo encontrado</p>
                    </div>
                ) : (
                    <motion.div
                        variants={listVariants}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-ceramic-border/30"
                    >
                        {files.map((file) => (
                            <FileRow
                                key={file.id}
                                file={file}
                                onTrash={handleTrash}
                                onRename={handleStartRename}
                                actionLoading={actionLoadingId}
                            />
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
