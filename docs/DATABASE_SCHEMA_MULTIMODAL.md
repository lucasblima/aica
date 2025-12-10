# Aica Life OS - Multimodal Database Schema

## 📋 Overview

Este documento descreve a arquitetura completa do banco de dados para suporte a mídia multimodal e IA generativa no Aica Life OS.

### Capabilities

- ✅ Upload e gerenciamento de imagens, vídeos, áudio
- ✅ Geração de vídeos com Google Veo
- ✅ Transcrições automáticas com speaker diarization
- ✅ Tracking completo de custos de IA
- ✅ Relacionamentos polimórficos com módulos
- ✅ Busca multimodal (texto, imagem, áudio)
- ✅ Thumbnails automáticos
- ✅ Versionamento de assets

---

## 🗃️ Database Schema

### 1. `ai_generated_assets` (Core Table)

Tabela central para TODOS os tipos de mídia.

```sql
CREATE TABLE public.ai_generated_assets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- Asset identification
  asset_type TEXT CHECK (asset_type IN (
    'document', 'image', 'video', 'audio', 'transcript', 'thumbnail', 'music'
  )),

  -- Source tracking
  source_type TEXT CHECK (source_type IN (
    'upload', 'ai_generated', 'ai_extracted', 'external_link'
  )),

  -- AI generation metadata
  ai_model TEXT,
  generation_prompt TEXT,
  generation_params JSONB,
  generation_version INT DEFAULT 1,
  parent_asset_id UUID REFERENCES ai_generated_assets(id),

  -- Storage
  storage_path TEXT,
  external_url TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,

  -- Media metadata
  media_metadata JSONB,  -- {duration_seconds, width, height, codec, etc}

  -- Indexing for search
  file_search_store_id UUID REFERENCES user_file_search_stores(id),
  gemini_file_name TEXT,
  indexing_status TEXT DEFAULT 'pending',
  indexed_at TIMESTAMPTZ,

  -- Content extraction
  extracted_text TEXT,
  extracted_metadata JSONB,

  -- Module relationships (polymorphic)
  module_type TEXT CHECK (module_type IN ('grants', 'journey', 'podcast', 'finance', 'atlas', NULL)),
  module_id UUID,

  -- Lifecycle
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemplos de uso:**

```typescript
// Foto do Journey
{
  asset_type: 'image',
  source_type: 'upload',
  storage_path: 'user_id/journey/123.jpg',
  module_type: 'journey',
  module_id: 'moment-uuid'
}

// Vídeo gerado por Veo
{
  asset_type: 'video',
  source_type: 'ai_generated',
  ai_model: 'veo-2',
  generation_prompt: 'sunset timelapse',
  storage_path: 'user_id/veo/456.mp4'
}

// Thumbnail derivado
{
  asset_type: 'thumbnail',
  source_type: 'ai_extracted',
  parent_asset_id: 'parent-image-uuid',
  storage_path: 'user_id/journey/123_thumb.webp'
}
```

---

### 2. `ai_transcriptions`

Transcrições de áudio/vídeo com timestamped segments.

```sql
CREATE TABLE public.ai_transcriptions (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES ai_generated_assets(id),
  user_id UUID REFERENCES auth.users(id),

  transcription_model TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',
  confidence_score FLOAT,

  full_text TEXT NOT NULL,
  segments JSONB,  -- [{start_ms, end_ms, text, speaker, confidence}]
  speakers JSONB,  -- [{speaker_id, name, total_duration_ms}]
  topics JSONB,    -- [{topic, relevance_score, timestamps}]
  keywords TEXT[],

  processing_time_ms INT,
  cost_usd NUMERIC(10, 6),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemplo de `segments`:**

```json
[
  {
    "start_ms": 0,
    "end_ms": 5000,
    "text": "Bem-vindos ao podcast",
    "speaker": "host",
    "confidence": 0.95
  },
  {
    "start_ms": 5000,
    "end_ms": 12000,
    "text": "Hoje vamos falar sobre IA",
    "speaker": "host",
    "confidence": 0.98
  }
]
```

---

### 3. `veo_video_generations`

Tracking de gerações de vídeo com Google Veo.

```sql
CREATE TABLE public.veo_video_generations (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES ai_generated_assets(id),
  user_id UUID REFERENCES auth.users(id),

  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  reference_images UUID[],
  style_preset TEXT,

  duration_seconds INT CHECK (duration_seconds > 0 AND duration_seconds <= 60),
  resolution TEXT DEFAULT '1080p',
  aspect_ratio TEXT DEFAULT '16:9',
  fps INT DEFAULT 30,

  generation_status TEXT DEFAULT 'queued',
  progress_percentage INT DEFAULT 0,
  estimated_completion_at TIMESTAMPTZ,

  veo_job_id TEXT UNIQUE,
  error_message TEXT,

  processing_time_seconds INT,
  cost_usd NUMERIC(10, 6),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

**Estados do `generation_status`:**
- `queued` - Na fila
- `processing` - Gerando
- `completed` - Concluído
- `failed` - Falhou
- `cancelled` - Cancelado

---

### 4. `ai_usage_analytics`

Tracking de custos de TODAS operações de IA.

```sql
CREATE TABLE public.ai_usage_analytics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  operation_type TEXT CHECK (operation_type IN (
    'text_generation', 'image_generation', 'video_generation',
    'audio_generation', 'transcription', 'file_indexing',
    'file_search_query', 'image_analysis', 'embedding'
  )),

  ai_model TEXT NOT NULL,

  input_tokens INT,
  output_tokens INT,
  total_tokens INT,
  duration_seconds NUMERIC(10, 2),

  input_cost_usd NUMERIC(10, 6),
  output_cost_usd NUMERIC(10, 6),
  total_cost_usd NUMERIC(10, 6) NOT NULL,

  module_type TEXT,
  module_id UUID,
  asset_id UUID REFERENCES ai_generated_assets(id),

  request_metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Funções auxiliares:**

```sql
-- Total de custos em período
SELECT * FROM get_user_ai_costs(
  'user-uuid',
  '2025-01-01'::TIMESTAMPTZ,
  NOW()
);

-- Custos diários dos últimos 30 dias
SELECT * FROM get_daily_ai_costs('user-uuid', 30);

-- Custo do mês atual
SELECT get_current_month_cost('user-uuid');
```

---

### 5. `module_assets`

Relacionamentos many-to-many entre módulos e assets.

```sql
CREATE TABLE public.module_assets (
  id UUID PRIMARY KEY,
  asset_id UUID REFERENCES ai_generated_assets(id),
  module_type TEXT CHECK (module_type IN ('grants', 'journey', 'podcast', 'finance', 'atlas')),
  module_id UUID NOT NULL,

  relationship_type TEXT CHECK (relationship_type IN (
    'cover_image', 'attachment', 'transcript',
    'chapter_marker', 'social_cut', 'thumbnail', 'reference'
  )),

  display_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(asset_id, module_type, module_id, relationship_type)
);
```

**Exemplo de uso:**

```typescript
// Episódio de podcast com múltiplos assets
// Episode ID: episode-123

module_assets:
  - asset: audio-file.mp3,   relationship: 'attachment'
  - asset: transcript.txt,   relationship: 'transcript'
  - asset: cover.jpg,        relationship: 'cover_image'
  - asset: clip1.mp4,        relationship: 'social_cut', order: 1
  - asset: clip2.mp4,        relationship: 'social_cut', order: 2
```

---

### 6. `user_file_search_stores` (Extended)

Estendida com novas categorias e configurações.

```sql
ALTER TABLE user_file_search_stores
ADD COLUMN store_config JSONB DEFAULT '{}';

-- Novas categorias:
-- 'podcast', 'journey', 'media', 'transcriptions'
```

**Exemplo de `store_config`:**

```json
{
  "auto_index": true,
  "index_images": false,
  "index_videos": false,
  "max_file_size_mb": 10
}
```

---

## 💾 Supabase Storage Buckets

### Buckets Criados

| Bucket | Público | Limite | Uso |
|--------|---------|--------|-----|
| `user-media` | ❌ | 100MB | Fotos/vídeos do Journey |
| `ai-generated` | ❌ | 500MB | Veo, Imagen outputs |
| `podcast-recordings` | ❌ | 1GB | Episódios de podcast |
| `thumbnails` | ✅ | 5MB | Previews (CDN) |
| `transcriptions` | ❌ | 10MB | Texto transcrito |

### Estrutura de Pastas

```
{bucket}/
  └── {user_id}/
      ├── journey/
      │   ├── {moment_id}/
      │   │   └── {timestamp}_{filename}.jpg
      │   └── {timestamp}_thumb.webp
      ├── podcast/
      │   └── {episode_id}/
      │       ├── recording.mp3
      │       └── transcript.txt
      ├── veo/
      │   └── {job_id}.mp4
      └── general/
          └── {timestamp}_{filename}
```

---

## 🔐 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado:

```sql
-- ai_generated_assets
CREATE POLICY "Users can view own assets"
  ON ai_generated_assets FOR SELECT
  USING (auth.uid() = user_id);

-- module_assets
CREATE POLICY "Users can view own module assets"
  ON module_assets FOR SELECT
  USING (user_owns_asset(asset_id));

-- Storage
CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-media'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
```

---

## 🎨 TypeScript Usage

### Upload de Mídia

```typescript
import { useMediaUpload } from '@/hooks/useMediaUpload';

function MyComponent() {
  const { upload, isUploading, uploadProgress } = useMediaUpload();

  const handleUpload = async (file: File) => {
    const asset = await upload({
      file,
      assetType: 'image',
      moduleType: 'journey',
      moduleId: 'moment-123',
      metadata: { caption: 'Pôr do sol' },
      generateThumbnail: true
    });

    console.log('Asset criado:', asset);
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {isUploading && <progress value={uploadProgress} max={100} />}
    </div>
  );
}
```

### Listar Assets de um Módulo

```typescript
const { listAssets } = useMediaUpload();

const assets = await listAssets('journey', 'moment-123');

assets.forEach(asset => {
  console.log(asset.asset_type, asset.storage_path);
});
```

### Obter URL de um Asset

```typescript
const { getUrl } = useMediaUpload();

const url = await getUrl(asset, 3600); // Expira em 1 hora
```

---

## 📊 Cost Tracking

### Exemplo de Pricing (2025)

```typescript
const PRICING = {
  'gemini-2.0-flash': {
    input: 0.001,   // $0.001 por 1K tokens
    output: 0.002   // $0.002 por 1K tokens
  },
  'veo-2': {
    per_second: 0.10 // $0.10 por segundo de vídeo
  },
  'imagen-3': {
    per_image: 0.04 // $0.04 por imagem
  },
  'whisper-large-v3': {
    per_minute: 0.006 // $0.006 por minuto de áudio
  }
};
```

### Dashboard de Custos

```sql
-- Custo total do mês
SELECT get_current_month_cost('user-uuid');
-- Retorna: 15.32 (USD)

-- Breakdown por operação
SELECT * FROM get_user_ai_costs('user-uuid');
/*
operation_type     | ai_model          | total_requests | total_cost_usd
-------------------|-------------------|----------------|---------------
video_generation   | veo-2             | 5              | 10.00
transcription      | whisper-large-v3  | 10             | 3.60
text_generation    | gemini-2.0-flash  | 100            | 1.50
image_generation   | imagen-3          | 8              | 0.32
*/
```

---

## 🚀 Migration Guide

### 1. Executar Migrations

```bash
# Aplicar todas as migrations em ordem
cd supabase/migrations

# Executar no Supabase Dashboard > SQL Editor
# Ou via CLI:
npx supabase db push
```

### 2. Ordem das Migrations

1. `20251208180000_multimodal_core_assets.sql` - Tabela core
2. `20251208180100_multimodal_transcriptions.sql` - Transcrições
3. `20251208180200_multimodal_veo_generations.sql` - Veo
4. `20251208180300_multimodal_analytics.sql` - Analytics
5. `20251208180400_multimodal_module_assets.sql` - Relacionamentos
6. `20251208180500_extend_file_search_stores.sql` - File Search
7. `20251208180600_create_storage_buckets.sql` - Storage

### 3. Verificar

```sql
-- Verificar tabelas criadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%ai_%';

-- Verificar buckets
SELECT id, name, public
FROM storage.buckets;
```

---

## 📖 Examples

### Journey: Upload de Foto com Thumbnail

```typescript
const asset = await upload({
  file: photoFile,
  assetType: 'image',
  moduleType: 'journey',
  moduleId: momentId,
  metadata: {
    location: 'São Paulo',
    caption: 'Meu aniversário'
  },
  generateThumbnail: true
});

// Automaticamente cria:
// 1. Asset principal (image)
// 2. Asset derivado (thumbnail)
// 3. Registro em module_assets
```

### Podcast: Transcrição Automática

```typescript
// 1. Upload do áudio
const audioAsset = await upload({
  file: audioFile,
  assetType: 'audio',
  moduleType: 'podcast',
  moduleId: episodeId
});

// 2. Iniciar transcrição (backend)
const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: JSON.stringify({ asset_id: audioAsset.id })
});

// 3. Backend cria:
// - ai_transcriptions record
// - ai_generated_assets (transcript)
// - module_assets (link transcript → episode)
// - ai_usage_analytics (cost tracking)
```

### Veo: Geração de Vídeo

```typescript
// 1. Criar placeholder asset
const videoAsset = await createAsset({
  asset_type: 'video',
  source_type: 'ai_generated',
  ai_model: 'veo-2',
  generation_prompt: 'sunset timelapse over city',
  indexing_status: 'not_indexable'
});

// 2. Criar veo_video_generations record
await createVeoJob({
  asset_id: videoAsset.id,
  prompt: 'sunset timelapse over city',
  duration_seconds: 10,
  resolution: '1080p'
});

// 3. Webhook do Veo atualiza:
// - veo_video_generations (status: completed)
// - ai_generated_assets (storage_path, media_metadata)
// - ai_usage_analytics (cost)
```

---

## 🎯 Best Practices

1. **Sempre gerar thumbnails** para imagens
2. **Trackear custos** em ai_usage_analytics
3. **Usar RLS** para isolamento de dados
4. **Arquivar** em vez de deletar (is_archived)
5. **Validar mime_type** antes de upload
6. **Limitar file_size** no frontend
7. **Usar signed URLs** para assets privados
8. **Indexar no File Search** apenas texto

---

## 📚 Related Documentation

- [Gemini File Search](./GEMINI_FILE_SEARCH.md)
- [File Search Quickstart](../FILE_SEARCH_QUICKSTART.md)
- [Backend vs Frontend Approach](../BACKEND_VS_FRONTEND_APPROACH.md)

---

**Versão:** 1.0
**Última atualização:** 2025-12-08
**Autor:** Aica Backend Architect
