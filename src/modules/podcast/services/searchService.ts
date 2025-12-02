import { supabase } from '../supabaseClient';
import { Dossier } from '../types';
import { analyzeNews } from './geminiService';
import { generateIntelligentSearchQueries } from './intelligentSearch';

export interface NewsArticle {
    id?: string;
    episode_id?: string;
    title: string;
    url: string;
    source: string;
    published_at: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    topics?: string[];
    archived?: boolean;
}

const API_KEY = import.meta.env.VITE_GOOGLE_SEARCH_KEY;
const CX_ID = import.meta.env.VITE_GOOGLE_SEARCH_CX;

// 1. Check DB for recent news (last 24h)
const checkDbForNews = async (projectId: string): Promise<NewsArticle[]> => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('podcast_news_articles')
        .select('*')
        .eq('episode_id', projectId)
        .gte('created_at', oneDayAgo)
        .eq('archived', false) // Optional: decide if we want to show archived or not in the "fresh" check
        .order('published_at', { ascending: false });

    if (error) {
        console.error('Error checking DB for news:', error);
        return [];
    }
    return data || [];
};

// 2. Call Google Custom Search API
const fetchGoogleSearch = async (query: string): Promise<NewsArticle[]> => {
    if (!API_KEY || !CX_ID) {
        console.error("Missing Google Search Keys");
        return [];
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX_ID}&q=${encodeURIComponent(query)}&dateRestrict=w1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.items) return [];

        return data.items.map((item: any) => ({
            title: item.title,
            url: item.link,
            source: item.displayLink || 'Web',
            published_at: new Date().toISOString(), // API often doesn't give exact date, so we use now
            sentiment: 'neutral', // Placeholder, will be updated by AI
            topics: []
        }));
    } catch (error) {
        console.error("Error fetching from Google:", error);
        return [];
    }
};

// 3. Persist to Supabase
const saveNewsToDb = async (articles: NewsArticle[], projectId: string) => {
    if (articles.length === 0) return;

    const articlesToInsert = articles.map(a => ({
        episode_id: projectId,
        title: a.title,
        url: a.url,
        source: a.source,
        published_at: a.published_at,
        sentiment: a.sentiment,
        topics: a.topics,
        archived: false
    }));

    const { error } = await supabase.from('podcast_news_articles').insert(articlesToInsert);
    if (error) console.error('Error saving news to DB:', error);
};

// Main Orchestrator
export const getNewsForProject = async (
    dossier: Dossier,
    projectId: string,
    topics: string[] = []
): Promise<NewsArticle[]> => {
    // Step 1: Check Cache
    const cachedNews = await checkDbForNews(projectId);
    if (cachedNews.length > 0) {
        console.log("Returning cached news");
        return cachedNews;
    }

    // Step 2: Generate intelligent queries
    console.log("Generating intelligent search queries...");
    const queries = await generateIntelligentSearchQueries(dossier, topics);
    console.log(`Generated ${queries.length} queries`);

    // Step 3: Fetch news for each query
    console.log("Fetching news from Google...");
    const allArticles: NewsArticle[] = [];

    // Limit to 3 queries to avoid too many API calls
    for (const query of queries.slice(0, 3)) {
        const results = await fetchGoogleSearch(query);
        allArticles.push(...results);
    }

    // Remove duplicates by URL
    const uniqueArticles = Array.from(
        new Map(allArticles.map(a => [a.url, a])).values()
    );

    if (uniqueArticles.length === 0) return [];

    // Step 4: Analyze with Gemini
    console.log(`Analyzing ${uniqueArticles.length} news articles with Gemini...`);
    const analyzedArticles = await analyzeNews(uniqueArticles.slice(0, 10)); // Analyze top 10 to save tokens

    // Step 5: Persist
    console.log("Persisting to DB...");
    await saveNewsToDb(analyzedArticles, projectId);

    return analyzedArticles;
};

// Legacy export for compatibility if needed, but we should switch to getNewsForProject
export const searchWebNews = async (query: string): Promise<NewsArticle[]> => {
    return fetchGoogleSearch(query);
};
