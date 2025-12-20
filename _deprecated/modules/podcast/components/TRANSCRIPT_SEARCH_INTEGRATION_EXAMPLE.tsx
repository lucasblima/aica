/**
 * Exemplo de Integração: TranscriptSearchPanel + usePodcastFileSearch
 *
 * Este arquivo mostra como integrar busca semântica em transcrições
 * em uma view de podcast (ex: EpisodeDetailView ou PostProductionHub)
 */

import React, { useState } from 'react';
import { usePodcastFileSearch } from '../hooks/usePodcastFileSearch';
import { TranscriptSearchPanel, TranscriptQuickSearchExamples } from './TranscriptSearchPanel';
import { saveAndIndexTranscription } from '../services/transcriptIndexingService';
import { FileText, Sparkles, Loader2 } from 'lucide-react';
import type { Project } from '../types';

interface EpisodeTranscriptViewProps {
  episode: Project; // Episódio com transcrição
}

/**
 * EXEMPLO 1: View de Transcrição com Busca Semântica
 *
 * Esta é a integração completa de busca semântica em uma view de episódio.
 */
export const EpisodeTranscriptView: React.FC<EpisodeTranscriptViewProps> = ({ episode }) => {
  const [isIndexing, setIsIndexing] = useState(false);

  // Hook de File Search especializado para podcast
  const {
    searchInEpisode,
    findTopicMoments,
    findQuote,
    findMomentsBySentiment,
    searchResults,
    isSearching,
    hasIndexedTranscriptions,
    clearSearchResults,
  } = usePodcastFileSearch({ episodeId: episode.id, autoLoad: true });

  /**
   * Handler para indexação manual (caso a transcrição já exista mas não foi indexada)
   */
  const handleIndexTranscript = async () => {
    if (!episode.transcript) {
      alert('Este episódio não tem transcrição');
      return;
    }

    try {
      setIsIndexing(true);

      const fileSearchHook = {
        indexTranscription: async (transcription: string, episodeTitle: string, metadata?: Record<string, any>) => {
          // Esta é uma versão simplificada - use o hook real
          throw new Error('Use o hook completo');
        },
        hasIndexedTranscriptions: () => hasIndexedTranscriptions(),
      };

      await saveAndIndexTranscription(
        {
          episodeId: episode.id,
          transcription: episode.transcript,
          episodeTitle: episode.title,
          guestName: episode.guest_name,
          episodeTheme: episode.episode_theme,
          duration: episode.recording_duration,
        },
        fileSearchHook as any
      );

      alert('Transcrição indexada com sucesso!');
    } catch (error) {
      console.error('Erro ao indexar:', error);
      alert('Erro ao indexar transcrição');
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{episode.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Com {episode.guest_name} • {episode.episode_theme}
          </p>
        </div>

        {!hasIndexedTranscriptions() && episode.transcript && (
          <button
            onClick={handleIndexTranscript}
            disabled={isIndexing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isIndexing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Indexando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Indexar para Busca
              </>
            )}
          </button>
        )}
      </div>

      {/* Transcript Content */}
      {episode.transcript && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Transcrição</h2>
            {episode.transcript_generated_at && (
              <span className="text-xs text-gray-500">
                • Gerada em {new Date(episode.transcript_generated_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {episode.transcript}
            </pre>
          </div>
        </div>
      )}

      {/* Semantic Search Panel */}
      {episode.transcript && hasIndexedTranscriptions() && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Busca Semântica</h2>
          </div>

          <TranscriptSearchPanel
            onSearch={searchInEpisode}
            onSearchTopic={findTopicMoments}
            onSearchQuote={findQuote}
            onSearchSentiment={findMomentsBySentiment}
            results={searchResults}
            isSearching={isSearching}
            hasTranscriptions={hasIndexedTranscriptions()}
            placeholder="Buscar momentos específicos..."
            onClear={clearSearchResults}
          />

          {/* Quick Examples */}
          {searchResults.length === 0 && !isSearching && (
            <div className="mt-4">
              <TranscriptQuickSearchExamples
                onSelectExample={(example) => searchInEpisode(example, 5)}
                examples={[
                  `Quando ${episode.guest_name} falou sobre ${episode.episode_theme}?`,
                  'Quais foram os momentos mais emocionantes?',
                  'Momentos engraçados da conversa',
                  'Citações inspiradoras do convidado',
                ]}
              />
            </div>
          )}
        </div>
      )}

      {/* No Transcript State */}
      {!episode.transcript && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">Nenhuma transcrição disponível</p>
          <p className="text-xs text-gray-500 mt-1">
            Gere uma transcrição para habilitar busca semântica
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * EXEMPLO 2: Integração Simples (Minimal)
 *
 * Versão minimalista da integração para uso rápido
 */
export const SimpleTranscriptSearch: React.FC<{ episodeId: string }> = ({ episodeId }) => {
  const {
    searchInEpisode,
    findTopicMoments,
    findQuote,
    findMomentsBySentiment,
    searchResults,
    isSearching,
    hasIndexedTranscriptions,
    clearSearchResults,
  } = usePodcastFileSearch({ episodeId, autoLoad: true });

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Buscar na Transcrição</h3>

      <TranscriptSearchPanel
        onSearch={searchInEpisode}
        onSearchTopic={findTopicMoments}
        onSearchQuote={findQuote}
        onSearchSentiment={findMomentsBySentiment}
        results={searchResults}
        isSearching={isSearching}
        hasTranscriptions={hasIndexedTranscriptions()}
        onClear={clearSearchResults}
      />
    </div>
  );
};

/**
 * EXEMPLO 3: Integração no PostProductionHub
 *
 * Mostra como adicionar busca semântica na pós-produção
 */
export const PostProductionWithSearch: React.FC<{
  episode: Project;
}> = ({ episode }) => {
  const {
    searchInEpisode,
    searchResults,
    isSearching,
    hasIndexedTranscriptions,
  } = usePodcastFileSearch({ episodeId: episode.id, autoLoad: true });

  return (
    <div className="space-y-6">
      {/* Outras funcionalidades de pós-produção... */}

      {/* Seção de Busca em Transcrição */}
      {episode.transcript && hasIndexedTranscriptions() && (
        <section className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Explorar Transcrição</h3>

          <TranscriptSearchPanel
            onSearch={searchInEpisode}
            results={searchResults}
            isSearching={isSearching}
            hasTranscriptions={hasIndexedTranscriptions()}
            placeholder="Ex: Quando falou sobre IA?"
          />
        </section>
      )}
    </div>
  );
};

/**
 * EXEMPLO 4: Custom Search Hooks
 *
 * Criando custom hooks para casos específicos
 */
export const useEpisodeTopicSearch = (episodeId: string) => {
  const { findTopicMoments, searchResults, isSearching } = usePodcastFileSearch({
    episodeId,
    autoLoad: true,
  });

  const searchTopic = async (topic: string) => {
    return await findTopicMoments(topic, 10);
  };

  return {
    searchTopic,
    topicResults: searchResults,
    isSearching,
  };
};

/**
 * EXEMPLO 5: Usando o Custom Hook
 */
export const TopicExplorer: React.FC<{ episodeId: string }> = ({ episodeId }) => {
  const { searchTopic, topicResults, isSearching } = useEpisodeTopicSearch(episodeId);
  const [topic, setTopic] = useState('');

  return (
    <div>
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Ex: inteligência artificial"
      />
      <button onClick={() => searchTopic(topic)} disabled={isSearching}>
        Buscar Tópico
      </button>

      {isSearching && <p>Buscando...</p>}

      <ul>
        {topicResults.map((result, i) => (
          <li key={i}>{result.text}</li>
        ))}
      </ul>
    </div>
  );
};

export default EpisodeTranscriptView;
