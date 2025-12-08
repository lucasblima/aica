-- Create finance_agent_conversations table
CREATE TABLE IF NOT EXISTS finance_agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    session_id UUID NOT NULL,
    role TEXT NOT NULL check (role in ('user', 'assistant')),
    content TEXT NOT NULL,
    model_used TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT
);

-- Enable RLS
ALTER TABLE finance_agent_conversations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own conversations"
    ON finance_agent_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON finance_agent_conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_agent_conversations_user_id ON finance_agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_agent_conversations_session_id ON finance_agent_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_finance_agent_conversations_created_at ON finance_agent_conversations(created_at);
