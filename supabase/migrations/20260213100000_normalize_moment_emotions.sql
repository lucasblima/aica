-- Migration: Normalize moment emotion values
-- Converts legacy "emoji label" format (e.g., "😐 Neutro") to AVAILABLE_EMOTIONS value format (e.g., "neutral")
-- This is a data-only migration — no schema changes.

-- Map known emoji-label combos to their value strings
UPDATE moments SET emotion = 'happy' WHERE emotion LIKE '%Feliz%' OR emotion LIKE '%feliz%';
UPDATE moments SET emotion = 'sad' WHERE emotion LIKE '%Triste%' OR emotion LIKE '%triste%';
UPDATE moments SET emotion = 'anxious' WHERE emotion LIKE '%Ansios%' OR emotion LIKE '%ansios%';
UPDATE moments SET emotion = 'angry' WHERE emotion LIKE '%Irritad%' OR emotion LIKE '%irritad%';
UPDATE moments SET emotion = 'thoughtful' WHERE emotion LIKE '%Pensativ%' OR emotion LIKE '%pensativ%' OR emotion LIKE '%Reflexiv%' OR emotion LIKE '%reflexiv%';
UPDATE moments SET emotion = 'calm' WHERE emotion LIKE '%Calm%' OR emotion LIKE '%calm%' OR emotion LIKE '%Tranquil%' OR emotion LIKE '%tranquil%' OR emotion LIKE '%Seren%' OR emotion LIKE '%seren%';
UPDATE moments SET emotion = 'grateful' WHERE emotion LIKE '%Grat%' OR emotion LIKE '%grat%';
UPDATE moments SET emotion = 'tired' WHERE emotion LIKE '%Cansad%' OR emotion LIKE '%cansad%';
UPDATE moments SET emotion = 'inspired' WHERE emotion LIKE '%Inspirad%' OR emotion LIKE '%inspirad%';
UPDATE moments SET emotion = 'neutral' WHERE emotion LIKE '%Neutr%' OR emotion LIKE '%neutr%';
UPDATE moments SET emotion = 'excited' WHERE emotion LIKE '%Empolga%' OR emotion LIKE '%empolga%' OR emotion LIKE '%Animad%' OR emotion LIKE '%animad%';
UPDATE moments SET emotion = 'disappointed' WHERE emotion LIKE '%Decepciona%' OR emotion LIKE '%decepciona%';
UPDATE moments SET emotion = 'frustrated' WHERE emotion LIKE '%Frustra%' OR emotion LIKE '%frustra%';
UPDATE moments SET emotion = 'loving' WHERE emotion LIKE '%Amoros%' OR emotion LIKE '%amoros%' OR emotion LIKE '%Amor%';
UPDATE moments SET emotion = 'scared' WHERE emotion LIKE '%medo%' OR emotion LIKE '%Medo%';
UPDATE moments SET emotion = 'determined' WHERE emotion LIKE '%Determinad%' OR emotion LIKE '%determinad%';
UPDATE moments SET emotion = 'sleepy' WHERE emotion LIKE '%Sonolent%' OR emotion LIKE '%sonolent%';
UPDATE moments SET emotion = 'overwhelmed' WHERE emotion LIKE '%Sobrecarrega%' OR emotion LIKE '%sobrecarrega%';
UPDATE moments SET emotion = 'confident' WHERE emotion LIKE '%Confiant%' OR emotion LIKE '%confiant%';
UPDATE moments SET emotion = 'confused' WHERE emotion LIKE '%Confus%' OR emotion LIKE '%confus%';

-- Catch any remaining emoji-prefixed values: strip emoji prefix and try to normalize
-- This handles cases like "😊 Feliz" that didn't match above (shouldn't happen, but safety net)
UPDATE moments
SET emotion = 'neutral'
WHERE emotion IS NOT NULL
  AND emotion NOT IN ('happy', 'sad', 'anxious', 'angry', 'thoughtful', 'calm', 'grateful', 'tired', 'inspired', 'neutral', 'excited', 'disappointed', 'frustrated', 'loving', 'scared', 'determined', 'sleepy', 'overwhelmed', 'confident', 'confused')
  AND length(emotion) > 1;

-- Create RPC to batch re-analyze moments that are still neutral
-- This allows calling from the frontend or a cron job
CREATE OR REPLACE FUNCTION get_moments_needing_reanalysis(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE(id UUID, content TEXT, emotion TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, m.emotion, m.created_at
  FROM moments m
  WHERE m.user_id = p_user_id
    AND (m.emotion = 'neutral' OR m.emotion IS NULL)
    AND m.content IS NOT NULL
    AND length(m.content) > 10
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION get_moments_needing_reanalysis(UUID, INT) TO authenticated;
