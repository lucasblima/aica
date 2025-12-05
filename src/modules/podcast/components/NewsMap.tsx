import React, { useState, useEffect } from 'react';
import { Search, Filter, ExternalLink, Archive, RotateCcw, AlertCircle, CheckCircle2, MinusCircle, RefreshCw } from 'lucide-react';
import { NewsArticle, getNewsForProject } from '../services/searchService';
import { Dossier, Topic } from '../types';

interface Props {
    dossier: Dossier;
    projectId: string;
    topics: Topic[];
}

const NewsMap: React.FC<Props> = ({ dossier, projectId, topics }) => {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
    const [showArchived, setShowArchived] = useState(false);

    const fetchNews = async () => {
        setLoading(true);
        try {
            // Get active (non-archived) topic texts to use for intelligent search
            const topicTexts = topics
                .filter(t => !t.archived)
                .map(t => t.text);

            const results = await getNewsForProject(dossier, projectId, topicTexts);
            setArticles(results);
        } catch (error) {
            console.error("Failed to fetch news", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [dossier.guestName]);

    const toggleArchive = (url: string) => {
        setArticles(prev => prev.map(a =>
            a.url === url ? { ...a, archived: !a.archived } : a
        ));
    };

    const filteredArticles = articles.filter(a => {
        if (!showArchived && a.archived) return false;
        if (showArchived && !a.archived) return false;
        if (filterSentiment !== 'all' && a.sentiment !== filterSentiment) return false;
        return true;
    });

    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'negative': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <MinusCircle className="w-4 h-4 text-zinc-500" />;
        }
    };

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return 'border-green-500/30 bg-green-500/10';
            case 'negative': return 'border-red-500/30 bg-red-500/10';
            default: return 'border-zinc-700 bg-zinc-800/50';
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#F7F6F4] border border-[#D6D3CD]/50 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-[#D6D3CD]/50 flex items-center justify-between bg-white">
                <h2 className="text-xs font-bold text-[#948D82] uppercase tracking-wider flex items-center gap-2">
                    <Search className="w-4 h-4" /> Mapa de Busca Web
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`p-2 rounded-xl transition-all shadow-sm ${showArchived
                            ? 'bg-indigo-100 text-indigo-700 shadow-inner'
                            : 'bg-[#F0EFE9] text-[#5C554B] hover:bg-white hover:shadow-md'}`}
                        title={showArchived ? "Ver Ativos" : "Ver Arquivados"}
                    >
                        <Archive className="w-4 h-4" />
                    </button>
                    <button
                        onClick={fetchNews}
                        disabled={loading}
                        className="p-2 bg-[#5C554B] hover:bg-[#4A443C] text-white rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        title="Atualizar Busca"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b border-[#D6D3CD]/30 flex gap-2 overflow-x-auto custom-scroll bg-[#F7F6F4]">
                {(['all', 'positive', 'negative', 'neutral'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterSentiment(type)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap shadow-sm
              ${filterSentiment === type
                                ? 'bg-[#5C554B] text-white border-[#5C554B]'
                                : 'bg-white text-[#948D82] border-[#D6D3CD] hover:border-[#948D82] hover:text-[#5C554B]'}`}
                    >
                        {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll bg-[#F0EFE9]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#948D82] space-y-3">
                        <div className="p-3 bg-white rounded-full shadow-sm">
                            <RefreshCw className="w-6 h-6 animate-spin text-[#5C554B]" />
                        </div>
                        <span className="text-xs font-medium">Analisando notícias...</span>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#948D82] space-y-3">
                        <div className="p-4 bg-[#E5E3DC] rounded-full shadow-inner">
                            <Search className="w-8 h-8 opacity-40" />
                        </div>
                        <span className="text-xs font-medium">Nenhuma notícia encontrada.</span>
                    </div>
                ) : (
                    filteredArticles.map((article, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-xl border transition-all duration-200 group relative bg-white hover:scale-[1.02] shadow-[2px_2px_6px_rgba(163,158,145,0.1)] hover:shadow-[4px_4px_12px_rgba(163,158,145,0.15)]
                            ${article.sentiment === 'positive' ? 'border-l-4 border-l-green-500' :
                                    article.sentiment === 'negative' ? 'border-l-4 border-l-red-500' :
                                        'border-l-4 border-l-[#D6D3CD]'}`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getSentimentIcon(article.sentiment)}
                                        <span className="text-[10px] uppercase font-bold text-[#948D82] tracking-wider">{article.source}</span>
                                        <span className="text-[10px] text-[#B0ADA6]">• {new Date(article.published_at).toLocaleDateString()}</span>
                                    </div>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-[#5C554B] hover:text-indigo-600 leading-snug block mb-3 transition-colors"
                                    >
                                        {article.title}
                                    </a>
                                    <div className="flex flex-wrap gap-1.5">
                                        {article.topics?.map(t => (
                                            <span key={t} className="px-2 py-0.5 bg-[#F0EFE9] rounded-md text-[10px] font-medium text-[#5C554B] border border-[#D6D3CD]/50">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => toggleArchive(article.url)}
                                        className="p-2 text-[#948D82] hover:text-[#5C554B] hover:bg-[#F0EFE9] rounded-lg transition-colors"
                                        title={article.archived ? "Desarquivar" : "Arquivar"}
                                    >
                                        {article.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                                    </button>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-[#948D82] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NewsMap;
