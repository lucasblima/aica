/**
 * Migration: Create user_module_feedback table
 * PHASE 3.3: Learning Feedback Loop for Recommendations
 *
 * This table tracks user feedback on module recommendations, enabling
 * the learning algorithm to adjust recommendation weights dynamically.
 */

-- Create user_module_feedback table
CREATE TABLE IF NOT EXISTS public.user_module_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES module_definitions(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES module_recommendations_log(id) ON DELETE SET NULL,

  -- Feedback type
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accepted', 'rejected', 'skipped')),

  -- Confidence at recommendation time
  confidence_score_at_time DECIMAL(5,2) CHECK (confidence_score_at_time >= 0 AND confidence_score_at_time <= 100),

  -- Optional reason for rejection/acceptance
  reason TEXT,

  -- Interaction timestamp
  interacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Module progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at TIMESTAMPTZ,

  -- User rating (1-5 stars) - only if completed
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, module_id, interacted_at),
  CONSTRAINT valid_completed_at CHECK (
    (feedback_type = 'accepted' AND completed_at IS NULL) OR
    (feedback_type != 'accepted') OR
    (completed_at IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_user_module_feedback_user_id ON public.user_module_feedback(user_id);
CREATE INDEX idx_user_module_feedback_module_id ON public.user_module_feedback(module_id);
CREATE INDEX idx_user_module_feedback_feedback_type ON public.user_module_feedback(feedback_type);
CREATE INDEX idx_user_module_feedback_interacted_at ON public.user_module_feedback(interacted_at DESC);
CREATE INDEX idx_user_module_feedback_user_module ON public.user_module_feedback(user_id, module_id);
CREATE INDEX idx_user_module_feedback_completed ON public.user_module_feedback(completed_at)
  WHERE completed_at IS NOT NULL;

-- Create view for feedback summary statistics
CREATE OR REPLACE VIEW public.user_module_feedback_summary AS
SELECT
  umf.user_id,
  umf.module_id,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE umf.feedback_type = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE umf.feedback_type = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE umf.feedback_type = 'skipped') as skipped_count,
  COUNT(*) FILTER (WHERE umf.completed_at IS NOT NULL) as completed_count,
  ROUND(
    COUNT(*) FILTER (WHERE umf.feedback_type = 'accepted')::NUMERIC /
    NULLIF(COUNT(*), 0)::NUMERIC * 100,
    2
  ) as acceptance_rate,
  ROUND(
    COUNT(*) FILTER (WHERE umf.completed_at IS NOT NULL)::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE umf.feedback_type = 'accepted'), 0)::NUMERIC * 100,
    2
  ) as completion_rate,
  ROUND(AVG(umf.rating)::NUMERIC, 2) as average_rating,
  MAX(umf.interacted_at) as last_interaction_at,
  -- Average time to completion (in hours)
  ROUND(
    AVG(EXTRACT(EPOCH FROM (umf.completed_at - umf.interacted_at)))::NUMERIC / 3600,
    2
  ) as avg_completion_time_hours,
  -- Most recent progress
  (SELECT progress FROM public.user_module_feedback
   WHERE user_id = umf.user_id AND module_id = umf.module_id
   ORDER BY interacted_at DESC LIMIT 1) as current_progress
FROM public.user_module_feedback umf
GROUP BY umf.user_id, umf.module_id;

-- Create table for dynamic module weights per user
CREATE TABLE IF NOT EXISTS public.user_module_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES module_definitions(id) ON DELETE CASCADE,

  -- Weight calculation components
  base_weight DECIMAL(6,3) NOT NULL DEFAULT 1.0,

  -- Learning adjustments
  acceptance_bonus DECIMAL(6,3) DEFAULT 0,
  rejection_penalty DECIMAL(6,3) DEFAULT 0,
  completion_bonus DECIMAL(6,3) DEFAULT 0,
  rating_bonus DECIMAL(6,3) DEFAULT 0,

  -- Decay for recency
  recency_decay DECIMAL(6,3) DEFAULT 1.0 CHECK (recency_decay >= 0 AND recency_decay <= 2.0),

  -- Final computed weight
  final_weight DECIMAL(6,3) NOT NULL DEFAULT 1.0 CHECK (final_weight >= 0.1 AND final_weight <= 10.0),

  -- Metadata
  total_feedback_count INTEGER DEFAULT 0,
  last_feedback_date TIMESTAMPTZ,
  weight_recalculated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: unique per user and module
  UNIQUE(user_id, module_id)
);

-- Create indexes for weight lookup
CREATE INDEX idx_user_module_weights_user_id ON public.user_module_weights(user_id);
CREATE INDEX idx_user_module_weights_module_id ON public.user_module_weights(module_id);
CREATE INDEX idx_user_module_weights_final_weight ON public.user_module_weights(final_weight DESC);
CREATE INDEX idx_user_module_weights_recalculated ON public.user_module_weights(weight_recalculated_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_module_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_module_feedback_updated_at
BEFORE UPDATE ON public.user_module_feedback
FOR EACH ROW
EXECUTE FUNCTION update_user_module_feedback_updated_at();

-- Create trigger for weight table
CREATE OR REPLACE FUNCTION update_user_module_weights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_module_weights_updated_at
BEFORE UPDATE ON public.user_module_weights
FOR EACH ROW
EXECUTE FUNCTION update_user_module_weights_updated_at();

-- Enable Row Level Security
ALTER TABLE public.user_module_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_module_feedback
CREATE POLICY "Users can view their own feedback" ON public.user_module_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON public.user_module_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON public.user_module_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_module_weights
CREATE POLICY "Users can view their own weights" ON public.user_module_weights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage weights" ON public.user_module_weights
  FOR ALL USING (TRUE);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.user_module_feedback TO authenticated;
GRANT SELECT ON public.user_module_feedback_summary TO authenticated;
GRANT SELECT ON public.user_module_weights TO authenticated;
GRANT ALL ON public.user_module_weights TO service_role;

-- Create function to auto-calculate weights when feedback is recorded
CREATE OR REPLACE FUNCTION calculate_module_weight_after_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_accepted_count INTEGER;
  v_rejected_count INTEGER;
  v_completed_count INTEGER;
  v_avg_rating DECIMAL(5,2);
  v_days_since_last INTEGER;
  v_new_weight DECIMAL(6,3);
BEGIN
  -- Get feedback statistics
  SELECT
    COUNT(*) FILTER (WHERE feedback_type = 'accepted'),
    COUNT(*) FILTER (WHERE feedback_type = 'rejected'),
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL),
    AVG(rating)
  INTO v_accepted_count, v_rejected_count, v_completed_count, v_avg_rating
  FROM public.user_module_feedback
  WHERE user_id = NEW.user_id AND module_id = NEW.module_id;

  -- Calculate days since last feedback (for recency decay)
  v_days_since_last := EXTRACT(DAY FROM (NOW() - NEW.interacted_at));

  -- Calculate new weight using learning formula
  v_new_weight := 1.0 +
    (v_accepted_count * 0.5) -  -- +5 per acceptance (scaled)
    (v_rejected_count * 0.3) -  -- -3 per rejection (scaled)
    (v_completed_count * 1.0) + -- +10 per completion (scaled)
    (COALESCE(v_avg_rating, 0) * 0.2) - -- +2 per rating point (scaled)
    (v_days_since_last * 0.01);  -- Decay: -0.1 per day (scaled)

  -- Clamp weight between 0.1 and 10.0
  v_new_weight := GREATEST(0.1, LEAST(10.0, v_new_weight));

  -- Upsert weight record
  INSERT INTO public.user_module_weights (
    user_id, module_id, final_weight,
    total_feedback_count, last_feedback_date, weight_recalculated_at
  ) VALUES (
    NEW.user_id, NEW.module_id, v_new_weight,
    COALESCE(v_accepted_count, 0) + COALESCE(v_rejected_count, 0),
    NEW.interacted_at, NOW()
  )
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    final_weight = v_new_weight,
    total_feedback_count = COALESCE(v_accepted_count, 0) + COALESCE(v_rejected_count, 0),
    last_feedback_date = NEW.interacted_at,
    weight_recalculated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update weights
CREATE TRIGGER trigger_calculate_weight_after_feedback
AFTER INSERT OR UPDATE ON public.user_module_feedback
FOR EACH ROW
EXECUTE FUNCTION calculate_module_weight_after_feedback();

-- Create audit log for weight changes
CREATE TABLE IF NOT EXISTS public.user_module_weight_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID NOT NULL,
  old_weight DECIMAL(6,3),
  new_weight DECIMAL(6,3),
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES module_definitions(id) ON DELETE CASCADE
);

CREATE INDEX idx_weight_audit_user ON public.user_module_weight_audit(user_id);
CREATE INDEX idx_weight_audit_changed_at ON public.user_module_weight_audit(changed_at DESC);

-- Grant permissions
GRANT INSERT ON public.user_module_weight_audit TO service_role;
