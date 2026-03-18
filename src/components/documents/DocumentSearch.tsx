import { useState } from 'react';
import { useFileSearch } from '../../hooks/useFileSearch';
import { Upload, Search, FileText, Loader2, AlertCircle } from 'lucide-react';
import { SearchResult } from '../../types/fileSearch';
import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('DocumentSearch');

export function DocumentSearch() {
    const { uploadDocument, search: searchDocuments, isSearching, isLoading: isUploading, error } = useFileSearch();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        try {
            const response = await searchDocuments({ query });
            if (response && response.length > 0) setResult(response[0] as unknown as SearchResult);
        } catch (e) {
            log.error("Search failed", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus("Uploading...");
        try {
            await uploadDocument({ file, corpus_id: 'documents' }); // Defaulting to 'documents' category
            setUploadStatus(`File ${file.name} uploaded successfully!`);
        } catch (e) {
            setUploadStatus("Upload failed.");
        }

        // Reset file input
        e.target.value = '';
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-ceramic-text-primary to-ceramic-text-secondary bg-clip-text text-transparent">
                Document Intelligence
            </h2>

            {/* Error Display */}
            {error && (
                <div className="bg-ceramic-error/10 text-ceramic-error p-4 rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-ceramic-border hover:border-ceramic-info transition-colors rounded-xl p-8 text-center bg-ceramic-base/50 backdrop-blur-sm cursor-pointer relative">
                <Upload className="mx-auto h-12 w-12 text-ceramic-text-tertiary mb-2" />
                <p className="text-ceramic-text-secondary font-medium">Drag documents or click to upload</p>
                <p className="text-xs text-ceramic-text-tertiary mt-1">PDF, DOCX, TXT supported</p>
                <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                />
                {isUploading && (
                    <div className="absolute inset-0 bg-ceramic-base/80 flex items-center justify-center rounded-xl">
                        <Loader2 className="h-8 w-8 animate-spin text-ceramic-info" />
                    </div>
                )}
            </div>
            {uploadStatus && (
                <p className={`text-sm text-center ${uploadStatus.includes("failed") ? "text-ceramic-error" : "text-ceramic-success"}`}>
                    {uploadStatus}
                </p>
            )}

            {/* Search Bar */}
            <div className="flex gap-2 shadow-sm">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask something about your documents..."
                    className="flex-1 px-4 py-3 rounded-xl border border-ceramic-border focus:ring-2 focus:ring-ceramic-info/20 focus:border-ceramic-info outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-6 py-3 bg-ceramic-text-primary text-white rounded-xl hover:bg-ceramic-text-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                    {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    <span>Search</span>
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="bg-ceramic-base border border-ceramic-border shadow-xl shadow-ceramic-text-secondary/5 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="prose prose-sm max-w-none text-ceramic-text-primary leading-relaxed">
                        {result.answer.split('\n').map((line, i) => (
                            <p key={i} className="mb-2">{line}</p>
                        ))}
                    </div>

                    {result.citations && result.citations.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-ceramic-border">
                            <p className="text-xs font-semibold text-ceramic-text-tertiary uppercase tracking-wider mb-3">Sources</p>
                            <div className="grid gap-2">
                                {result.citations.map((citation, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-ceramic-cool hover:bg-ceramic-base transition-colors text-sm text-ceramic-text-secondary">
                                        <div className="p-2 bg-ceramic-base rounded-md shadow-sm">
                                            <FileText className="h-4 w-4 text-ceramic-info" />
                                        </div>
                                        <span>{citation.title || citation.uri || "Unknown Source"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-4 text-xs text-ceramic-text-tertiary text-right">
                        Model: {result.model}
                    </div>
                </div>
            )}
        </div>
    );
}
