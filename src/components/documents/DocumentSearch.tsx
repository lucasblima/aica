import { useState } from 'react';
import { useFileSearch } from '../../hooks/useFileSearch';
import { Upload, Search, FileText, Loader2, AlertCircle } from 'lucide-react';
import { SearchResult } from '../../types/fileSearch';

export function DocumentSearch() {
    const { uploadDocument, searchDocuments, isUploading, isSearching, error } = useFileSearch();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        try {
            const response = await searchDocuments(query);
            setResult(response);
        } catch (e) {
            console.error("Search failed", e);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus("Uploading...");
        try {
            await uploadDocument(file, 'documents'); // Defaulting to 'documents' category
            setUploadStatus(`File ${file.name} uploaded successfully!`);
        } catch (e) {
            setUploadStatus("Upload failed.");
        }

        // Reset file input
        e.target.value = '';
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Document Intelligence
            </h2>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors rounded-xl p-8 text-center bg-white/50 backdrop-blur-sm cursor-pointer relative">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-600 font-medium">Drag documents or click to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT supported</p>
                <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                />
                {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                )}
            </div>
            {uploadStatus && (
                <p className={`text-sm text-center ${uploadStatus.includes("failed") ? "text-red-500" : "text-green-600"}`}>
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
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                >
                    {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    <span>Search</span>
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="bg-white border border-gray-100 shadow-xl shadow-gray-100/50 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                        {result.answer.split('\n').map((line, i) => (
                            <p key={i} className="mb-2">{line}</p>
                        ))}
                    </div>

                    {result.citations && result.citations.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sources</p>
                            <div className="grid gap-2">
                                {result.citations.map((citation, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm text-gray-600">
                                        <div className="p-2 bg-white rounded-md shadow-sm">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                        </div>
                                        <span>{citation.title || citation.uri || "Unknown Source"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="mt-4 text-xs text-gray-300 text-right">
                        Model: {result.model}
                    </div>
                </div>
            )}
        </div>
    );
}
