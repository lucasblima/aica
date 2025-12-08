-- Google Calendar Integration Migration
-- Creates table for storing OAuth tokens per user
-- Created: 2025-12-05
-- Sprint: Google Calendar Integration (Executive Secretary Mode)

-- Create google_calendar_tokens table
CREATE TABLE IF NOT EXISTS public.google_calendar_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    email TEXT,
    name TEXT,
    picture_url TEXT,
    scopes TEXT[],
    is_connected BOOLEAN DEFAULT TRUE NOT NULL,
    last_sync TIMESTAMPTZ,
    last_refresh TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_token UNIQUE(user_id)
);

-- Add helpful comment
COMMENT ON TABLE public.google_calendar_tokens IS 'Stores OAuth 2.0 tokens for Google Calendar integration per user. Enables Aica to function as executive secretary with calendar read/write permissions.';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_google_calendar_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_google_calendar_tokens_updated_at
    BEFORE UPDATE ON public.google_calendar_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_google_calendar_tokens_updated_at();

-- Enable Row Level Security
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tokens
CREATE POLICY "Users can view own Google Calendar tokens"
    ON public.google_calendar_tokens
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can only insert their own tokens
CREATE POLICY "Users can insert own Google Calendar tokens"
    ON public.google_calendar_tokens
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own tokens
CREATE POLICY "Users can update own Google Calendar tokens"
    ON public.google_calendar_tokens
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own tokens
CREATE POLICY "Users can delete own Google Calendar tokens"
    ON public.google_calendar_tokens
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id 
    ON public.google_calendar_tokens(user_id);

-- Create index for checking connected status
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_is_connected 
    ON public.google_calendar_tokens(user_id, is_connected) 
    WHERE is_connected = TRUE;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_tokens TO authenticated;
GRANT USAGE ON SEQUENCE google_calendar_tokens_id_seq TO authenticated;
