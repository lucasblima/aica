import React, { useState } from 'react';
import { Mail, Search, RefreshCw, Loader2, ChevronDown, MailOpen } from 'lucide-react';
import { useGmailIntegration } from '@/hooks/useGmailIntegration';
import type { GmailMessage } from '@/services/gmailService';

function EmailRow({ email }: { email: GmailMessage }) {
    const date = new Date(email.received_at);
    const timeStr = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg hover:bg-ceramic-cool/50 transition-colors cursor-pointer ${!email.is_read ? 'bg-ceramic-cool/30' : ''}`}>
            <div className="w-8 h-8 bg-[#4285F4]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {email.is_read ? (
                    <MailOpen className="w-4 h-4 text-ceramic-text-secondary" />
                ) : (
                    <Mail className="w-4 h-4 text-[#4285F4]" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-ceramic-text-primary' : 'text-ceramic-text-primary'}`}>
                        {email.sender || email.sender_email}
                    </span>
                    <span className="text-xs text-ceramic-text-secondary whitespace-nowrap flex-shrink-0">
                        {timeStr}
                    </span>
                </div>
                <p className={`text-sm truncate ${!email.is_read ? 'font-medium text-ceramic-text-primary' : 'text-ceramic-text-secondary'}`}>
                    {email.subject || '(sem assunto)'}
                </p>
                <p className="text-xs text-ceramic-text-secondary truncate mt-0.5">
                    {email.snippet}
                </p>
            </div>
        </div>
    );
}

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
            <div className="bg-ceramic-base rounded-xl p-6 shadow-ceramic-emboss text-center">
                <div className="w-12 h-12 mx-auto bg-[#4285F4]/10 rounded-xl flex items-center justify-center mb-3">
                    <Mail className="w-6 h-6 text-[#4285F4]" />
                </div>
                <h3 className="text-lg font-bold text-ceramic-text-primary mb-1">Gmail</h3>
                <p className="text-sm text-ceramic-text-secondary mb-4">
                    Conecte seu Gmail para ver seus emails aqui
                </p>
                <button
                    onClick={onConnect}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    Conectar Gmail
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
                        <Mail className="w-5 h-5 text-[#4285F4]" />
                        <h3 className="text-lg font-bold text-ceramic-text-primary">Gmail</h3>
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
                        placeholder="Buscar emails..."
                        className="w-full pl-9 pr-4 py-2 bg-ceramic-cool rounded-lg text-sm text-ceramic-text-primary placeholder:text-ceramic-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ceramic-text-secondary animate-spin" />
                    )}
                </form>
            </div>

            {/* Email List */}
            <div className="max-h-[400px] overflow-y-auto">
                {isLoading && emails.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-ceramic-text-secondary animate-spin" />
                    </div>
                ) : error ? (
                    <div className="p-4 text-center">
                        <p className="text-sm text-ceramic-error">{error}</p>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-ceramic-text-secondary">Nenhum email encontrado</p>
                    </div>
                ) : (
                    <div className="divide-y divide-ceramic-border/50">
                        {emails.map((email) => (
                            <EmailRow key={email.message_id} email={email} />
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
