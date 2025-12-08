import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { SearchResult } from '../types/fileSearch';

// Use environment variable for API URL or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useFileSearch() {
    const [isSearching, setIsSearching] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadDocument = async (
        file: File,
        category: string,
        metadata?: Record<string, any>
    ) => {
        setIsUploading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', category);
            formData.append('user_id', user.id);
            if (metadata) {
                formData.append('metadata', JSON.stringify(metadata));
            }

            const response = await fetch(`${API_URL}/api/file-search/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }

            return await response.json();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const searchDocuments = async (
        query: string,
        categories: string[] = ['financial', 'documents'],
        filters?: Record<string, any>
    ): Promise<SearchResult> => {
        setIsSearching(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const response = await fetch(`${API_URL}/api/file-search/query-authenticated`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    categories,
                    filters,
                    user_id: user.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Search failed');
            }

            return await response.json();
        } catch (err: any) {
            setError(err.message);
            throw err;
        } finally {
            setIsSearching(false);
        }
    };

    return {
        uploadDocument,
        searchDocuments,
        isUploading,
        isSearching,
        error
    };
}
