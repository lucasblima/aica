-- ============================================================================
-- MIGRATION: Add category field to work_items
-- Date: 2025-12-06
-- Author: Atlas Task Agent
--
-- PURPOSE: Enable intelligent task categorization powered by Gemini AI
-- Categories: Trabalho, Pessoal, Saúde, Educação, Finanças, Outros
-- ============================================================================

-- Add category column to work_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'work_items'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.work_items
    ADD COLUMN category TEXT CHECK (
      category IN ('Trabalho', 'Pessoal', 'Saúde', 'Educação', 'Finanças', 'Outros')
    );

    -- Add comment explaining the field
    COMMENT ON COLUMN public.work_items.category IS
      'Auto-categorized by AI: Trabalho, Pessoal, Saúde, Educação, Finanças, Outros';
  END IF;
END $$;

-- Create index for efficient category filtering
CREATE INDEX IF NOT EXISTS idx_work_items_category
  ON public.work_items(category)
  WHERE category IS NOT NULL AND archived = FALSE;

-- Update existing tasks to have default category if needed
-- (Optional: you can uncomment this if you want to categorize existing tasks as "Outros")
-- UPDATE public.work_items
-- SET category = 'Outros'
-- WHERE category IS NULL;
