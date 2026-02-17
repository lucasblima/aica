import React, { useState } from 'react';
import { HardDrive, Search, RefreshCw, Loader2, ChevronDown, FileText, Image, Sheet, Presentation, File, ExternalLink, Star } from 'lucide-react';
import { useDriveIntegration } from '@/hooks/useDriveIntegration';
import type { DriveFile } from '@/services/driveService';

function getMimeIcon(mimeType: string) {
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-4 h-4 text-[#4285F4]" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <Sheet className="w-4 h-4 text-[#0F9D58]" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-4 h-4 text-[#F4B400]" />;
    if (mimeType.includes('image')) return <Image className="w-4 h-4 text-[#DB4437]" />;
    return <File className="w-4 h-4 text-ceramic-text-secondary" />;
}

function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({ file }: { file: DriveFile }) {
    const date = new Date(file.modified_time);
    const dateStr = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-ceramic-cool/50 transition-colors group">
            <div className="w-8 h-8 bg-ceramic-cool rounded-lg flex items-center justify-center flex-shrink-0">
                {getMimeIcon(file.mime_type)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    {file.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    <span className="text-sm font-medium text-ceramic-text-primary truncate">
                        {file.name}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-ceramic-text-secondary">{dateStr}</span>
                    {file.size_bytes > 0 && (
                        <>
                            <span className="text-xs text-ceramic-text-secondary/40">|</span>
                            <span className="text-xs text-ceramic-text-secondary">{formatFileSize(file.size_bytes)}</span>
                        </>
                    )}
                    {file.shared && (
                        <>
                            <span className="text-xs text-ceramic-text-secondary/40">|</span>
                            <span className="text-xs text-ceramic-info">Compartilhado</span>
                        </>
                    )}
                </div>
            </div>
            {file.web_view_link && (
                <a
                    href={file.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-ceramic-cool transition-all"
                    title="Abrir no Drive"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-ceramic-text-secondary" />
                </a>
            )}
        </div>
    );
}

interface DriveSectionProps {
    isConnected: boolean;
    onConnect: () => Promise<void>;
}

export function DriveSection({ isConnected, onConnect }: DriveSectionProps) {
    const { files, isLoading, error, search, refresh, loadMore, hasMore } = useDriveIntegration();
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
            <div className="bg-ceramic-base rounded-xl p-6 shadow-ceramic-emboss text-center">
                <div className="w-12 h-12 mx-auto bg-[#0F9D58]/10 rounded-xl flex items-center justify-center mb-3">
                    <HardDrive className="w-6 h-6 text-[#0F9D58]" />
                </div>
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">Google Drive</h3>
                <p className="text-sm text-ceramic-text-secondary mb-4">
                    Conecte seu Drive para ver seus arquivos aqui
                </p>
                <button
                    onClick={onConnect}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    Conectar Drive
                </button>
            </div>
        );
    }

    return (
        <div className="bg-ceramic-base rounded-xl shadow-ceramic-emboss overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-ceramic-border">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-[#0F9D58]" />
                        <h3 className="text-lg font-bold text-ceramic-text-primary">Google Drive</h3>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={isLoading}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ceramic-cool transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw className={`w-4 h-4 text-ceramic-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar arquivos..."
                        className="w-full pl-9 pr-4 py-2 bg-ceramic-cool rounded-lg text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary animate-spin" />
                    )}
                </form>
            </div>

            {/* File List */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading && files.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-ceramic-text-secondary animate-spin" />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center">
                        <p className="text-sm text-ceramic-error">{error}</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-ceramic-text-secondary">Nenhum arquivo encontrado</p>
                    </div>
                ) : (
                    <div className="divide-y divide-ceramic-border/50">
                        {files.map((file) => (
                            <FileRow key={file.file_id} file={file} />
                        ))}
                    </div>
                )}
            </div>

            {/* Load More */}
            {hasMore && (
                <div className="p-3 border-t border-ceramic-border text-center">
                    <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 mx-auto px-4 py-1.5 text-xs font-medium text-ceramic-text-secondary hover:text-ceramic-text-primary transition-colors"
                    >
                        <ChevronDown className="w-3 h-3" />
                        Carregar mais
                    </button>
                </div>
            )}
        </div>
    );
}
