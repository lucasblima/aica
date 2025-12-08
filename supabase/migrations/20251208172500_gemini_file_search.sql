-- Registro de File Search Stores do usuário
CREATE TABLE IF NOT EXISTS public.user_file_search_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,           -- Nome no Gemini: fileSearchStores/xxx
  store_category TEXT NOT NULL CHECK (store_category IN ('financial', 'documents', 'personal', 'business')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_category)
);

-- RLS for user_file_search_stores
ALTER TABLE public.user_file_search_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stores"
    ON public.user_file_search_stores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stores"
    ON public.user_file_search_stores FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update their own stores"
    ON public.user_file_search_stores FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores"
    ON public.user_file_search_stores FOR DELETE
    USING (auth.uid() = user_id);


-- Registro de documentos indexados
CREATE TABLE IF NOT EXISTS public.indexed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.user_file_search_stores(id) ON DELETE CASCADE,
  gemini_file_name TEXT NOT NULL,     -- Nome do arquivo no Gemini
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  custom_metadata JSONB DEFAULT '{}',
  indexing_status TEXT DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed')),
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for indexed_documents
ALTER TABLE public.indexed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
    ON public.indexed_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON public.indexed_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
    ON public.indexed_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
    ON public.indexed_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Log de queries para analytics
CREATE TABLE IF NOT EXISTS public.file_search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_names TEXT[],
  query_text TEXT,
  metadata_filter TEXT,
  response_tokens INTEGER,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for file_search_queries
ALTER TABLE public.file_search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queries"
    ON public.file_search_queries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queries"
    ON public.file_search_queries FOR INSERT
    WITH CHECK (auth.uid() = user_id);
