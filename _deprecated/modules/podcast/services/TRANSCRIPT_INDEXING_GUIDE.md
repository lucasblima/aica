# Guia de Integração: Auto-indexação de Transcrições

Este guia mostra como integrar a indexação automática de transcrições de episódios usando o File Search (Gemini).

## 📋 Visão Geral

A indexação automática de transcrições permite:
- **Busca semântica** em todo o conteúdo da transcrição
- **Encontrar momentos específicos** por tema ou sentimento
- **Localizar citações** ou frases exatas
- **Identificar tópicos** discutidos em profundidade

## 🔧 Como Usar

### 1. Importar os Serviços

```typescript
import { usePodcastFileSearch } from '../hooks/usePodcastFileSearch';
import {
  saveAndIndexTranscription,
  indexEpisodeTranscription
} from '../services/transcriptIndexingService';
```

### 2. Caso de Uso: Salvar E Indexar Transcrição

Quando você gerar uma transcrição (ex: usando API de Speech-to-Text), use `saveAndIndexTranscription`:

```typescript
// No componente PostProductionHub ou onde a transcrição é gerada
const MyTranscriptionComponent = ({ episodeId }) => {
  const fileSearchHook = usePodcastFileSearch({ episodeId, autoLoad: true });
  const [isIndexing, setIsIndexing] = useState(false);

  const handleTranscriptionGenerated = async (transcriptText: string) => {
    try {
      setIsIndexing(true);

      // 1. Buscar dados do episódio
      const episode = await getProject(episodeId);

      // 2. Salvar E indexar automaticamente
      const result = await saveAndIndexTranscription(
        {
          episodeId: episodeId,
          transcription: transcriptText,
          episodeTitle: episode.title,
          guestName: episode.guest_name,
          episodeTheme: episode.episode_theme,
          duration: episode.duration_minutes ? episode.duration_minutes * 60 : undefined,
        },
        fileSearchHook
      );

      console.log('✓ Transcrição salva e indexada:', result.indexed.id);

      // 3. Notificar usuário
      toast.success('Transcrição indexada! Agora você pode fazer buscas semânticas.');

    } catch (error) {
      console.error('Erro ao indexar transcrição:', error);
      toast.error('Falha ao indexar transcrição');
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div>
      {/* Seu componente de transcrição aqui */}
      {isIndexing && <LoadingSpinner />}
    </div>
  );
};
```

### 3. Caso de Uso: Apenas Indexar (Transcrição já existe no DB)

Se a transcrição já foi salva no banco mas não foi indexada:

```typescript
const MyComponent = ({ episodeId }) => {
  const fileSearchHook = usePodcastFileSearch({ episodeId, autoLoad: true });

  const handleIndexExisting = async () => {
    try {
      // Buscar episódio
      const episode = await getProject(episodeId);

      if (!episode.transcript) {
        throw new Error('Episódio não tem transcrição');
      }

      // Indexar transcrição existente
      const indexed = await indexEpisodeTranscription(
        {
          episodeId: episode.id,
          transcription: episode.transcript,
          episodeTitle: episode.title,
          guestName: episode.guest_name,
          episodeTheme: episode.episode_theme,
        },
        fileSearchHook
      );

      console.log('✓ Transcrição indexada:', indexed.id);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <button onClick={handleIndexExisting}>
      Indexar Transcrição
    </button>
  );
};
```

### 4. Caso de Uso: Re-indexar Todas as Transcrições (Migração)

Para re-indexar todas as transcrições existentes:

```typescript
import { reindexExistingTranscriptions } from '../services/transcriptIndexingService';

const MigrationTool = () => {
  const fileSearchHook = usePodcastFileSearch({ showId: 'my-show', autoLoad: true });

  const handleBulkReindex = async () => {
    try {
      console.log('Iniciando re-indexação em lote...');

      const results = await reindexExistingTranscriptions(fileSearchHook, 100);

      console.log(`✓ Re-indexadas ${results.length} transcrições`);
      toast.success(`${results.length} transcrições re-indexadas com sucesso!`);

    } catch (error) {
      console.error('Erro na re-indexação:', error);
      toast.error('Falha na re-indexação');
    }
  };

  return (
    <button onClick={handleBulkReindex}>
      Re-indexar Todas as Transcrições
    </button>
  );
};
```

## 🔍 Como Fazer Buscas Após Indexação

Após indexar, use o hook `usePodcastFileSearch`:

```typescript
const SearchComponent = ({ episodeId }) => {
  const {
    searchInEpisode,
    findTopicMoments,
    findQuote,
    findMomentsBySentiment,
    searchResults,
    isSearching
  } = usePodcastFileSearch({ episodeId, autoLoad: true });

  // Busca simples
  const handleSearch = async (query: string) => {
    const results = await searchInEpisode(query, 5);
    console.log('Resultados:', results);
  };

  // Encontrar momentos de um tópico
  const handleFindTopic = async () => {
    const results = await findTopicMoments('inteligência artificial', 10);
    console.log('Momentos sobre IA:', results);
  };

  // Encontrar citação específica
  const handleFindQuote = async () => {
    const results = await findQuote('O futuro é imprevisível');
    console.log('Citações encontradas:', results);
  };

  // Encontrar momentos por sentimento
  const handleFindFunnyMoments = async () => {
    const results = await findMomentsBySentiment('funny', 5);
    console.log('Momentos engraçados:', results);
  };

  return (
    <div>
      <input
        type="text"
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar na transcrição..."
      />
      {isSearching && <LoadingSpinner />}
      <ul>
        {searchResults.map((result, i) => (
          <li key={i}>{result.text}</li>
        ))}
      </ul>
    </div>
  );
};
```

## 📊 Fluxo Completo: Da Gravação à Busca

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GRAVAÇÃO                                                 │
│    - Episódio gravado                                       │
│    - Salvo em podcast_episodes                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GERAÇÃO DE TRANSCRIÇÃO                                   │
│    - API de Speech-to-Text (ex: Google, Whisper)           │
│    - Texto da transcrição gerado                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SAVE + INDEXAÇÃO AUTOMÁTICA                             │
│    - saveAndIndexTranscription()                            │
│    - Salva em podcast_episodes.transcript                   │
│    - Indexa no Gemini File Search                           │
│    - Salva metadados em file_search_documents               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. BUSCA SEMÂNTICA DISPONÍVEL                              │
│    - searchInEpisode() - Busca livre                        │
│    - findTopicMoments() - Por tópicos                       │
│    - findQuote() - Por citações                             │
│    - findMomentsBySentiment() - Por sentimento              │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuração Recomendada

### Integração no PostProductionHub

```typescript
// src/modules/podcast/views/PostProductionHub.tsx

import { usePodcastFileSearch } from '../hooks/usePodcastFileSearch';
import { saveAndIndexTranscription } from '../services/transcriptIndexingService';

export const PostProductionHub = ({ episodeId, project }) => {
  const fileSearchHook = usePodcastFileSearch({ episodeId, autoLoad: true });
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'generating' | 'indexing' | 'done'>('idle');

  const handleGenerateTranscription = async () => {
    try {
      setTranscriptionStatus('generating');

      // 1. Gerar transcrição via API
      const transcript = await generateTranscriptionFromAudio(project.recording_file_path);

      setTranscriptionStatus('indexing');

      // 2. Salvar E indexar automaticamente
      await saveAndIndexTranscription(
        {
          episodeId,
          transcription: transcript,
          episodeTitle: project.title,
          guestName: project.guest_name,
          episodeTheme: project.episode_theme,
          duration: project.recording_duration,
        },
        fileSearchHook
      );

      setTranscriptionStatus('done');
      toast.success('Transcrição gerada e indexada!');

    } catch (error) {
      console.error('Erro:', error);
      setTranscriptionStatus('idle');
      toast.error('Falha na transcrição');
    }
  };

  return (
    <div>
      {/* UI de pós-produção */}
      <button onClick={handleGenerateTranscription}>
        Gerar Transcrição
      </button>
      {transcriptionStatus === 'indexing' && (
        <div>Indexando transcrição para busca semântica...</div>
      )}
    </div>
  );
};
```

## 🎯 Próximos Passos

1. ✅ Criar serviço de indexação (`transcriptIndexingService.ts`)
2. ✅ Atualizar tipos com campo `transcript`
3. ⏳ Implementar UI de transcrição no `PostProductionHub`
4. ⏳ Implementar UI de busca semântica (`TranscriptSearchPanel`)
5. ⏳ Adicionar testes E2E

## 📚 Referências

- Hook: `src/modules/podcast/hooks/usePodcastFileSearch.ts`
- Service: `src/modules/podcast/services/transcriptIndexingService.ts`
- Types: `src/modules/podcast/types.ts`
- Database: `podcast_episodes.transcript` (TEXT)
