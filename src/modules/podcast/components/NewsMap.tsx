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
        <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center">
                    <Search className="w-4 h-4 mr-2" /> Mapa de Busca Web
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`p-2 rounded-lg transition-colors ${showArchived ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        title={showArchived ? "Ver Ativos" : "Ver Arquivados"}
                    >
                        <Archive className="w-4 h-4" />
                    </button>
                    <button
                        onClick={fetchNews}
                        disabled={loading}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Atualizar Busca"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="px-4 py-3 border-b border-zinc-800 flex gap-2 overflow-x-auto custom-scroll">
                {(['all', 'positive', 'negative', 'neutral'] as const).map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterSentiment(type)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all whitespace-nowrap
              ${filterSentiment === type
                                ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                                : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}
                    >
                        {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-32 text-zinc-500 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span className="text-xs">Analisando notícias...</span>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-zinc-600 space-y-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <span className="text-xs">Nenhuma notícia encontrada.</span>
                    </div>
                ) : (
                    filteredArticles.map((article, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg border ${getSentimentColor(article.sentiment)} transition-all hover:bg-zinc-800 group relative`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getSentimentIcon(article.sentiment)}
                                        <span className="text-[10px] uppercase font-bold text-zinc-500">{article.source}</span>
                                        <span className="text-[10px] text-zinc-600">• {new Date(article.published_at).toLocaleDateString()}</span>
                                    </div>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-zinc-200 hover:text-indigo-400 leading-snug block mb-2"
                                    >
                                        {article.title}
                                    </a>
                                    <div className="flex flex-wrap gap-1">
                                        {article.topics?.map(t => (
                                            <span key={t} className="px-1.5 py-0.5 bg-zinc-950/50 rounded text-[10px] text-zinc-400 border border-zinc-800">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => toggleArchive(article.url)}
                                        className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded"
                                        title={article.archived ? "Desarquivar" : "Arquivar"}
                                    >
                                        {article.archived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                                    </button>
                                    <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-700 rounded"
                                    >
                                        <ExternalLink className="w-3 h-3" />
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
