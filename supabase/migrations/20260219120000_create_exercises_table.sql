-- ============================================================================
-- Migration: Create exercises table for Flux module
-- Replaces mock exercise data with real Supabase-backed exercise library
-- ============================================================================

-- Create exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'main'
    CHECK (category IN ('warmup', 'main', 'technique', 'cooldown', 'dryland')),
  modality TEXT NOT NULL
    CHECK (modality IN ('swimming', 'running', 'cycling', 'strength', 'walking', 'triathlon')),
  muscle_groups TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  difficulty_level TEXT DEFAULT 'intermediario'
    CHECK (difficulty_level IN ('iniciante', 'intermediario', 'avancado')),
  video_url TEXT,
  instructions TEXT,
  default_sets INTEGER,
  default_reps TEXT,
  default_rest TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_modality ON public.exercises(modality);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_is_public ON public.exercises(is_public) WHERE is_public = TRUE;

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent: drop + create)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own exercises" ON public.exercises;
  DROP POLICY IF EXISTS "Users can read public exercises" ON public.exercises;
  DROP POLICY IF EXISTS "Users can insert own exercises" ON public.exercises;
  DROP POLICY IF EXISTS "Users can update own exercises" ON public.exercises;
  DROP POLICY IF EXISTS "Users can delete own exercises" ON public.exercises;
END $$;

CREATE POLICY "Users can read own exercises"
  ON public.exercises FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read public exercises"
  ON public.exercises FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can insert own exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
  ON public.exercises FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_exercises_updated_at ON public.exercises;

CREATE TRIGGER trigger_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_exercises_updated_at();

-- ============================================================================
-- Seed: Common exercises in Portuguese for each modality
-- Uses a placeholder system user ID (will be overridden per-user)
-- Public exercises are shared across all coaches
-- ============================================================================

-- We use a DO block so we can insert with a generated system UUID
DO $$
DECLARE
  system_user_id UUID := NULL;
BEGIN

-- ============================================
-- SWIMMING exercises
-- ============================================
INSERT INTO public.exercises (user_id, name, description, category, modality, muscle_groups, equipment, difficulty_level, default_sets, default_reps, default_rest, tags, is_public) VALUES
  (system_user_id, 'Aquecimento Livre', 'Nado livre leve para aquecimento geral', 'warmup', 'swimming', ARRAY['corpo todo'], ARRAY['piscina'], 'iniciante', 1, '400m', '0', ARRAY['aquecimento', 'livre'], TRUE),
  (system_user_id, 'Educativo de Crawl - Pegada', 'Exercicio de pegada na agua com foco em fase de tracao', 'technique', 'swimming', ARRAY['ombros', 'costas'], ARRAY['piscina', 'nadadeira'], 'iniciante', 4, '50m', '20s', ARRAY['educativo', 'crawl', 'tecnica'], TRUE),
  (system_user_id, 'Educativo de Crawl - Respiracao', 'Respiracao bilateral 3-5-7 braçadas', 'technique', 'swimming', ARRAY['core', 'pulmoes'], ARRAY['piscina'], 'iniciante', 4, '100m', '15s', ARRAY['educativo', 'respiracao', 'crawl'], TRUE),
  (system_user_id, 'Serie Crawl Aerobico', 'Serie principal em crawl com foco em resistencia aerobica', 'main', 'swimming', ARRAY['corpo todo'], ARRAY['piscina'], 'intermediario', 8, '100m', '20s', ARRAY['crawl', 'aerobico', 'serie'], TRUE),
  (system_user_id, 'Serie Crawl Velocidade', 'Tiros de velocidade maxima em crawl', 'main', 'swimming', ARRAY['corpo todo'], ARRAY['piscina'], 'avancado', 10, '50m', '60s', ARRAY['crawl', 'velocidade', 'sprint'], TRUE),
  (system_user_id, 'Pernada com Prancha', 'Trabalho de pernada isolada com prancha', 'main', 'swimming', ARRAY['quadriceps', 'gluteos', 'core'], ARRAY['piscina', 'prancha'], 'iniciante', 4, '100m', '15s', ARRAY['pernada', 'prancha', 'tecnica'], TRUE),
  (system_user_id, 'Palmateio', 'Exercicio de palmateio para sensibilidade de agua', 'technique', 'swimming', ARRAY['antebracos', 'ombros'], ARRAY['piscina'], 'intermediario', 4, '50m', '15s', ARRAY['palmateio', 'tecnica', 'sensibilidade'], TRUE),
  (system_user_id, 'Nado Costas', 'Serie de nado costas para recuperacao e tecnica', 'main', 'swimming', ARRAY['costas', 'ombros', 'core'], ARRAY['piscina'], 'iniciante', 4, '100m', '20s', ARRAY['costas', 'tecnica'], TRUE),
  (system_user_id, 'Medley Individual', 'Serie 4 estilos: borboleta, costas, peito, crawl', 'main', 'swimming', ARRAY['corpo todo'], ARRAY['piscina'], 'avancado', 4, '200m', '30s', ARRAY['medley', 'completo'], TRUE),
  (system_user_id, 'Desaquecimento Livre', 'Nado regenerativo leve para volta a calma', 'cooldown', 'swimming', ARRAY['corpo todo'], ARRAY['piscina'], 'iniciante', 1, '200m', '0', ARRAY['desaquecimento', 'regenerativo'], TRUE),

-- ============================================
-- RUNNING exercises
-- ============================================
  (system_user_id, 'Trote Aquecimento', 'Trote leve para aquecimento articular e muscular', 'warmup', 'running', ARRAY['pernas', 'core'], ARRAY[]::TEXT[], 'iniciante', 1, '2km', '0', ARRAY['aquecimento', 'trote'], TRUE),
  (system_user_id, 'Alongamento Dinamico', 'Serie de alongamento dinamico pre-treino', 'warmup', 'running', ARRAY['pernas', 'quadril'], ARRAY[]::TEXT[], 'iniciante', 1, '10min', '0', ARRAY['alongamento', 'dinamico', 'mobilidade'], TRUE),
  (system_user_id, 'Corrida Continua Z2', 'Corrida continua em zona 2 para base aerobica', 'main', 'running', ARRAY['pernas', 'core', 'cardiovascular'], ARRAY[]::TEXT[], 'iniciante', 1, '30min', '0', ARRAY['continuo', 'aerobico', 'base'], TRUE),
  (system_user_id, 'Intervalado 400m', 'Tiros de 400m com recuperacao ativa', 'main', 'running', ARRAY['pernas', 'cardiovascular'], ARRAY['pista'], 'intermediario', 6, '400m', '90s', ARRAY['intervalado', 'velocidade', 'pista'], TRUE),
  (system_user_id, 'Intervalado 1000m', 'Series de 1000m em ritmo de limiar', 'main', 'running', ARRAY['pernas', 'cardiovascular', 'core'], ARRAY[]::TEXT[], 'avancado', 4, '1000m', '2min', ARRAY['intervalado', 'limiar', 'resistencia'], TRUE),
  (system_user_id, 'Fartlek', 'Corrida com variacao de ritmo (rapido/lento alternados)', 'main', 'running', ARRAY['pernas', 'cardiovascular'], ARRAY[]::TEXT[], 'intermediario', 1, '40min', '0', ARRAY['fartlek', 'variacao', 'ritmo'], TRUE),
  (system_user_id, 'Tempo Run', 'Corrida em ritmo constante no limiar anaerobico', 'main', 'running', ARRAY['pernas', 'cardiovascular', 'core'], ARRAY[]::TEXT[], 'avancado', 1, '20min', '0', ARRAY['tempo', 'limiar', 'constante'], TRUE),
  (system_user_id, 'Tiros Curtos 100m', 'Sprints de 100m para desenvolvimento de velocidade', 'main', 'running', ARRAY['pernas', 'gluteos'], ARRAY['pista'], 'avancado', 8, '100m', '2min', ARRAY['sprint', 'velocidade', 'explosao'], TRUE),
  (system_user_id, 'Educativo de Corrida', 'Exercicios educativos: skipping, anfersen, corrida lateral', 'technique', 'running', ARRAY['pernas', 'quadril', 'core'], ARRAY[]::TEXT[], 'iniciante', 3, '50m', '30s', ARRAY['educativo', 'tecnica', 'coordenacao'], TRUE),
  (system_user_id, 'Desaquecimento Trote', 'Trote leve e alongamento para volta a calma', 'cooldown', 'running', ARRAY['pernas', 'core'], ARRAY[]::TEXT[], 'iniciante', 1, '10min', '0', ARRAY['desaquecimento', 'trote', 'alongamento'], TRUE),

-- ============================================
-- CYCLING exercises
-- ============================================
  (system_user_id, 'Aquecimento Pedalada Leve', 'Pedalada leve em cadencia confortavel (90-95 rpm)', 'warmup', 'cycling', ARRAY['quadriceps', 'gluteos'], ARRAY['bicicleta'], 'iniciante', 1, '15min', '0', ARRAY['aquecimento', 'cadencia', 'leve'], TRUE),
  (system_user_id, 'Endurance Z2', 'Pedalada continua em zona 2 para base aerobica', 'main', 'cycling', ARRAY['quadriceps', 'gluteos', 'cardiovascular'], ARRAY['bicicleta'], 'iniciante', 1, '60min', '0', ARRAY['endurance', 'aerobico', 'base'], TRUE),
  (system_user_id, 'Sweet Spot', 'Esforco sustentado em 88-93% do FTP', 'main', 'cycling', ARRAY['quadriceps', 'gluteos', 'core'], ARRAY['bicicleta', 'rolo'], 'intermediario', 3, '10min', '3min', ARRAY['sweet spot', 'ftp', 'potencia'], TRUE),
  (system_user_id, 'FTP Intervals', 'Intervalos no limiar de potencia funcional (95-105% FTP)', 'main', 'cycling', ARRAY['quadriceps', 'gluteos', 'cardiovascular'], ARRAY['bicicleta', 'rolo'], 'avancado', 4, '8min', '4min', ARRAY['ftp', 'limiar', 'potencia', 'intervalo'], TRUE),
  (system_user_id, 'VO2max Intervals', 'Intervalos curtos em alta intensidade (106-120% FTP)', 'main', 'cycling', ARRAY['quadriceps', 'gluteos', 'cardiovascular'], ARRAY['bicicleta', 'rolo'], 'avancado', 6, '3min', '3min', ARRAY['vo2max', 'alta intensidade', 'intervalo'], TRUE),
  (system_user_id, 'Cadencia Alta', 'Trabalho de cadencia alta (100-110 rpm) em carga moderada', 'technique', 'cycling', ARRAY['quadriceps', 'isquiotibiais'], ARRAY['bicicleta'], 'intermediario', 4, '5min', '2min', ARRAY['cadencia', 'tecnica', 'eficiencia'], TRUE),
  (system_user_id, 'Subida Simulada', 'Simulacao de subida com carga alta e cadencia baixa (60-70 rpm)', 'main', 'cycling', ARRAY['quadriceps', 'gluteos', 'core'], ARRAY['bicicleta', 'rolo'], 'intermediario', 3, '6min', '4min', ARRAY['subida', 'forca', 'resistencia'], TRUE),
  (system_user_id, 'Desaquecimento Pedalada', 'Pedalada leve para recuperacao', 'cooldown', 'cycling', ARRAY['pernas'], ARRAY['bicicleta'], 'iniciante', 1, '10min', '0', ARRAY['desaquecimento', 'recuperacao'], TRUE),

-- ============================================
-- STRENGTH / DRYLAND exercises
-- ============================================
  (system_user_id, 'Agachamento Livre', 'Agachamento com peso corporal ou barra', 'main', 'strength', ARRAY['quadriceps', 'gluteos', 'core'], ARRAY['barra', 'anilha'], 'iniciante', 4, '12rep', '60s', ARRAY['agachamento', 'pernas', 'forca'], TRUE),
  (system_user_id, 'Afundo (Lunge)', 'Afundo alternado para forca unilateral', 'main', 'strength', ARRAY['quadriceps', 'gluteos', 'isquiotibiais'], ARRAY[]::TEXT[], 'iniciante', 3, '10rep/lado', '45s', ARRAY['afundo', 'unilateral', 'pernas'], TRUE),
  (system_user_id, 'Prancha Frontal', 'Isometria de prancha para estabilidade do core', 'main', 'strength', ARRAY['core', 'ombros'], ARRAY[]::TEXT[], 'iniciante', 3, '45s', '30s', ARRAY['prancha', 'core', 'estabilidade'], TRUE),
  (system_user_id, 'Remada Curvada', 'Remada com barra ou halteres para fortalecimento de costas', 'main', 'strength', ARRAY['costas', 'biceps', 'core'], ARRAY['barra', 'halter'], 'intermediario', 4, '10rep', '60s', ARRAY['remada', 'costas', 'puxada'], TRUE),
  (system_user_id, 'Supino Reto', 'Supino com barra ou halteres para peitoral', 'main', 'strength', ARRAY['peitoral', 'triceps', 'ombros'], ARRAY['barra', 'halter', 'banco'], 'intermediario', 4, '10rep', '90s', ARRAY['supino', 'peitoral', 'empurrar'], TRUE),
  (system_user_id, 'Elevacao Pelvica (Hip Thrust)', 'Exercicio para gluteos e posterior de coxa', 'main', 'strength', ARRAY['gluteos', 'isquiotibiais'], ARRAY['barra', 'banco'], 'intermediario', 4, '12rep', '60s', ARRAY['gluteos', 'hip thrust', 'posterior'], TRUE),
  (system_user_id, 'Exercicio com Elastico', 'Trabalho com elastico para ativacao e estabilidade', 'warmup', 'strength', ARRAY['ombros', 'quadril', 'gluteos'], ARRAY['elastico'], 'iniciante', 3, '15rep', '30s', ARRAY['elastico', 'ativacao', 'aquecimento'], TRUE),
  (system_user_id, 'Circuito Core', 'Sequencia de exercicios abdominais e lombares', 'main', 'strength', ARRAY['core', 'obliquos', 'lombar'], ARRAY[]::TEXT[], 'iniciante', 3, '15rep/exercicio', '30s', ARRAY['core', 'circuito', 'abdominal'], TRUE),
  (system_user_id, 'Burpee', 'Exercicio de corpo inteiro para potencia e condicionamento', 'main', 'strength', ARRAY['corpo todo'], ARRAY[]::TEXT[], 'intermediario', 4, '10rep', '60s', ARRAY['burpee', 'condicionamento', 'potencia'], TRUE),

-- ============================================
-- TRIATHLON exercises
-- ============================================
  (system_user_id, 'Transicao T1 (Natacao-Bike)', 'Pratica de transicao rapida natacao para ciclismo', 'technique', 'triathlon', ARRAY['corpo todo'], ARRAY['bicicleta', 'capacete'], 'intermediario', 3, '2min', '3min', ARRAY['transicao', 't1', 'pratica'], TRUE),
  (system_user_id, 'Transicao T2 (Bike-Corrida)', 'Pratica de transicao rapida ciclismo para corrida', 'technique', 'triathlon', ARRAY['pernas'], ARRAY['tenis corrida'], 'intermediario', 3, '2min', '3min', ARRAY['transicao', 't2', 'pratica'], TRUE),
  (system_user_id, 'Brick Bike-Run', 'Sessao combinada ciclismo seguido de corrida', 'main', 'triathlon', ARRAY['pernas', 'cardiovascular', 'core'], ARRAY['bicicleta', 'tenis corrida'], 'intermediario', 1, '45min bike + 15min corrida', '0', ARRAY['brick', 'combinado', 'adaptacao'], TRUE),
  (system_user_id, 'Simulado Sprint', 'Simulacao de prova Sprint: 750m nad + 20km bike + 5km run', 'main', 'triathlon', ARRAY['corpo todo'], ARRAY['roupa triathlon'], 'avancado', 1, 'Prova completa', '0', ARRAY['simulado', 'sprint', 'prova'], TRUE);

END $$;
