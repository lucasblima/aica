-- Migration: Backfill workout_templates with V2 exercise_structure
-- Updates all existing templates that have NULL or empty exercise_structure
-- with realistic, modality-appropriate series data using V2 format.
--
-- V2 exercise_structure format:
--   { warmup: string, series: WorkoutSeries[], cooldown: string }
--
-- This migration is idempotent: only updates rows where exercise_structure
-- is NULL, '{}', or missing a proper 'series' array.

-- Step 1: Assign modality to any rows that might be missing one
-- (safety net — the column is NOT NULL in the schema, but just in case)

-- Step 2: Use a numbered CTE to update each template individually
-- We number all qualifying rows and assign specific exercise structures

DO $$
DECLARE
  v_rows RECORD;
  v_idx INTEGER := 0;
BEGIN

  FOR v_rows IN
    SELECT id, modality, name, category
    FROM public.workout_templates
    WHERE exercise_structure IS NULL
       OR exercise_structure = '{}'::jsonb
       OR exercise_structure = 'null'::jsonb
       OR NOT (exercise_structure ? 'series')
       OR jsonb_array_length(COALESCE(exercise_structure->'series', '[]'::jsonb)) = 0
    ORDER BY created_at ASC
  LOOP
    v_idx := v_idx + 1;

    -- ================================================================
    -- SWIMMING TEMPLATES (templates 1-4)
    -- ================================================================

    IF v_rows.modality = 'swimming' OR (v_rows.modality IS NULL AND v_idx BETWEEN 1 AND 4) THEN

      CASE v_idx % 4
        -- 1. Continuous Aerobic Swim 1500m
        WHEN 1 THEN
          UPDATE public.workout_templates
          SET
            name = 'Continuo Aerobico 1500m',
            description = 'Aq: 200m livre solto | 1x1500m Z2 | Des: 200m costas solto',
            exercise_structure = jsonb_build_object(
              'warmup', '200m nado livre solto, foco na respiracao bilateral',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 1,
                  'distance_meters', 1500,
                  'zone', 'Z2',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '200m costas solto, alongamento no bordo'
            ),
            intensity = 'z2',
            duration = 40,
            category = 'main'
          WHERE id = v_rows.id;

        -- 2. Interval Sprint Series 8x50m
        WHEN 2 THEN
          UPDATE public.workout_templates
          SET
            name = 'Tiros 8x50m Z4',
            description = 'Aq: 300m medley | 8x50m Z4 c/ 30s intervalo | Des: 200m solto',
            exercise_structure = jsonb_build_object(
              'warmup', '300m medley educativo (75m cada estilo)',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 8,
                  'distance_meters', 50,
                  'zone', 'Z4',
                  'rest_minutes', 0,
                  'rest_seconds', 30
                )
              ),
              'cooldown', '200m nado livre solto, desaquecimento'
            ),
            intensity = 'z4',
            duration = 30,
            category = 'main'
          WHERE id = v_rows.id;

        -- 3. Pyramidal Swim (varied distances)
        WHEN 3 THEN
          UPDATE public.workout_templates
          SET
            name = 'Piramidal 100-200-400-200-100',
            description = 'Aq: 400m livre | 100m Z3, 200m Z3, 400m Z2, 200m Z3, 100m Z4 | Des: 200m costas',
            exercise_structure = jsonb_build_object(
              'warmup', '400m nado livre progressivo',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 1,
                  'distance_meters', 100,
                  'zone', 'Z3',
                  'rest_minutes', 0,
                  'rest_seconds', 30
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 1,
                  'distance_meters', 200,
                  'zone', 'Z3',
                  'rest_minutes', 0,
                  'rest_seconds', 45
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 1,
                  'distance_meters', 400,
                  'zone', 'Z2',
                  'rest_minutes', 1,
                  'rest_seconds', 0
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 1,
                  'distance_meters', 200,
                  'zone', 'Z3',
                  'rest_minutes', 0,
                  'rest_seconds', 45
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 1,
                  'distance_meters', 100,
                  'zone', 'Z4',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '200m costas solto, alongamento geral'
            ),
            intensity = 'z4',
            duration = 45,
            category = 'main'
          WHERE id = v_rows.id;

        -- 4. Technique Drill Series
        WHEN 0 THEN
          UPDATE public.workout_templates
          SET
            name = 'Educativos 10x100m Z1',
            description = 'Aq: 200m livre | 10x100m Z1 educativos c/ 20s intervalo | Des: 100m solto',
            exercise_structure = jsonb_build_object(
              'warmup', '200m nado livre solto com pernada lateral',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'swimming',
                  'repetitions', 10,
                  'distance_meters', 100,
                  'zone', 'Z1',
                  'rest_minutes', 0,
                  'rest_seconds', 20
                )
              ),
              'cooldown', '100m costas solto, relaxamento'
            ),
            intensity = 'z1',
            duration = 35,
            category = 'main'
          WHERE id = v_rows.id;

      END CASE;

    -- ================================================================
    -- RUNNING TEMPLATES (templates 5-9)
    -- ================================================================

    ELSIF v_rows.modality = 'running' OR (v_rows.modality IS NULL AND v_idx BETWEEN 5 AND 9) THEN

      CASE v_idx % 5
        -- 1. Easy Long Run Z2
        WHEN 1 THEN
          UPDATE public.workout_templates
          SET
            name = 'Longao Z2 40min',
            description = 'Aq: 5min trote | 1x40min Z2 | Des: 5min caminhada',
            exercise_structure = jsonb_build_object(
              'warmup', '5 minutos de trote leve + mobilidade articular',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'running',
                  'repetitions', 1,
                  'work_value', 40,
                  'work_unit', 'minutes',
                  'zone', 'Z2',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '5 minutos caminhada + alongamento estatico'
            ),
            intensity = 'z2',
            duration = 50,
            category = 'main'
          WHERE id = v_rows.id;

        -- 2. Interval 6x3min Z4
        WHEN 2 THEN
          UPDATE public.workout_templates
          SET
            name = 'Intervalado 6x3min Z4',
            description = 'Aq: 10min trote | 6x3min Z4 c/ 2min intervalo | Des: 5min trote',
            exercise_structure = jsonb_build_object(
              'warmup', '10 minutos trote progressivo ate Z2',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'running',
                  'repetitions', 6,
                  'work_value', 3,
                  'work_unit', 'minutes',
                  'zone', 'Z4',
                  'rest_minutes', 2,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '5 minutos trote leve + alongamento'
            ),
            intensity = 'z4',
            duration = 45,
            category = 'main'
          WHERE id = v_rows.id;

        -- 3. Tempo Run Z3
        WHEN 3 THEN
          UPDATE public.workout_templates
          SET
            name = 'Tempo Run 20min Z3',
            description = 'Aq: 10min trote | 1x20min Z3 | Des: 5min caminhada',
            exercise_structure = jsonb_build_object(
              'warmup', '10 minutos trote leve + 4 aceleracoes de 20s',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'running',
                  'repetitions', 1,
                  'work_value', 20,
                  'work_unit', 'minutes',
                  'zone', 'Z3',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '5 minutos caminhada leve + alongamento'
            ),
            intensity = 'z3',
            duration = 35,
            category = 'main'
          WHERE id = v_rows.id;

        -- 4. Fartlek Mixed Zones
        WHEN 4 THEN
          UPDATE public.workout_templates
          SET
            name = 'Fartlek Z2/Z4',
            description = 'Aq: 5min trote | 4x(3min Z2 + 2min Z4) | Des: 5min trote',
            exercise_structure = jsonb_build_object(
              'warmup', '5 minutos trote leve + drills de corrida',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'running',
                  'repetitions', 4,
                  'work_value', 3,
                  'work_unit', 'minutes',
                  'zone', 'Z2',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'running',
                  'repetitions', 4,
                  'work_value', 2,
                  'work_unit', 'minutes',
                  'zone', 'Z4',
                  'rest_minutes', 1,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '5 minutos trote desacelerando + alongamento'
            ),
            intensity = 'z4',
            duration = 40,
            category = 'main'
          WHERE id = v_rows.id;

        -- 5. VO2max Tiros 8x400m
        WHEN 0 THEN
          UPDATE public.workout_templates
          SET
            name = 'Tiros 8x90s Z5',
            description = 'Aq: 10min progressivo | 8x90s Z5 c/ 90s intervalo | Des: 5min trote',
            exercise_structure = jsonb_build_object(
              'warmup', '10 minutos progressivo Z1 ate Z2 + 3 aceleracoes',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'running',
                  'repetitions', 8,
                  'work_value', 90,
                  'work_unit', 'seconds',
                  'zone', 'Z5',
                  'rest_minutes', 1,
                  'rest_seconds', 30
                )
              ),
              'cooldown', '5 minutos trote muito leve + alongamento completo'
            ),
            intensity = 'z5',
            duration = 40,
            category = 'main'
          WHERE id = v_rows.id;

      END CASE;

    -- ================================================================
    -- CYCLING TEMPLATES (templates 10-13)
    -- ================================================================

    ELSIF v_rows.modality = 'cycling' OR (v_rows.modality IS NULL AND v_idx BETWEEN 10 AND 13) THEN

      CASE v_idx % 4
        -- 1. Endurance Ride Z2
        WHEN 1 THEN
          UPDATE public.workout_templates
          SET
            name = 'Endurance 60min Z2',
            description = 'Aq: 10min leve | 1x60min Z2 | Des: 10min leve',
            exercise_structure = jsonb_build_object(
              'warmup', '10 minutos pedalada leve em cadencia alta (90+ rpm)',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'cycling',
                  'repetitions', 1,
                  'work_value', 60,
                  'work_unit', 'time',
                  'unit_detail', 'minutes',
                  'zone', 'Z2',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '10 minutos pedalada suave, cadencia livre'
            ),
            intensity = 'z2',
            duration = 80,
            category = 'main'
          WHERE id = v_rows.id;

        -- 2. Sweet Spot 3x10min Z3
        WHEN 2 THEN
          UPDATE public.workout_templates
          SET
            name = 'Sweet Spot 3x10min Z3',
            description = 'Aq: 10min progressivo | 3x10min Z3 c/ 3min intervalo | Des: 10min leve',
            exercise_structure = jsonb_build_object(
              'warmup', '10 minutos pedalada progressiva Z1 ate Z2',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'cycling',
                  'repetitions', 3,
                  'work_value', 10,
                  'work_unit', 'time',
                  'unit_detail', 'minutes',
                  'zone', 'Z3',
                  'rest_minutes', 3,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '10 minutos pedalada leve + alongamento na bike'
            ),
            intensity = 'z3',
            duration = 60,
            category = 'main'
          WHERE id = v_rows.id;

        -- 3. FTP Intervals 4x5min Z4
        WHEN 3 THEN
          UPDATE public.workout_templates
          SET
            name = 'FTP 4x5min Z4',
            description = 'Aq: 15min progressivo | 4x5min Z4 c/ 3min intervalo | Des: 10min leve',
            exercise_structure = jsonb_build_object(
              'warmup', '15 minutos progressivo ate limiar + 2 sprints de 10s',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'cycling',
                  'repetitions', 4,
                  'work_value', 5,
                  'work_unit', 'time',
                  'unit_detail', 'minutes',
                  'zone', 'Z4',
                  'rest_minutes', 3,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '10 minutos pedalada recuperacao Z1'
            ),
            intensity = 'z4',
            duration = 57,
            category = 'main'
          WHERE id = v_rows.id;

        -- 4. VO2max Cycling 6x2min Z5
        WHEN 0 THEN
          UPDATE public.workout_templates
          SET
            name = 'VO2max 6x2min Z5',
            description = 'Aq: 15min progressivo | 6x2min Z5 c/ 2min intervalo | Des: 10min leve',
            exercise_structure = jsonb_build_object(
              'warmup', '15 minutos aquecimento progressivo com sprints curtos',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'cycling',
                  'repetitions', 6,
                  'work_value', 2,
                  'work_unit', 'time',
                  'unit_detail', 'minutes',
                  'zone', 'Z5',
                  'rest_minutes', 2,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '10 minutos pedalada muito leve, desaquecimento'
            ),
            intensity = 'z5',
            duration = 49,
            category = 'main'
          WHERE id = v_rows.id;

      END CASE;

    -- ================================================================
    -- STRENGTH TEMPLATES (templates 14-18)
    -- ================================================================

    ELSIF v_rows.modality = 'strength' OR (v_rows.modality IS NULL AND v_idx BETWEEN 14 AND 18) THEN

      CASE v_idx % 5
        -- 1. Max Strength (low reps, high load)
        WHEN 1 THEN
          UPDATE public.workout_templates
          SET
            name = 'Forca Maxima 4x3rep',
            description = '4x3rep 80kg c/ 3min intervalo (agachamento/supino/terra)',
            exercise_structure = jsonb_build_object(
              'warmup', 'Mobilidade articular + 2 series aquecimento 50% carga',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 4,
                  'reps', 3,
                  'load_kg', 80,
                  'rest_minutes', 3,
                  'rest_seconds', 0
                )
              ),
              'cooldown', 'Alongamento + foam roller 5 minutos'
            ),
            intensity = 'high',
            duration = 30,
            category = 'main'
          WHERE id = v_rows.id;

        -- 2. Hypertrophy Upper Body
        WHEN 2 THEN
          UPDATE public.workout_templates
          SET
            name = 'Hipertrofia Superior 3x10rep',
            description = '3x10rep 40kg + 3x12rep 25kg c/ 90s intervalo',
            exercise_structure = jsonb_build_object(
              'warmup', 'Rotacao de ombros + band pull-aparts + serie leve',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 10,
                  'load_kg', 40,
                  'rest_minutes', 1,
                  'rest_seconds', 30
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 12,
                  'load_kg', 25,
                  'rest_minutes', 1,
                  'rest_seconds', 0
                )
              ),
              'cooldown', 'Alongamento peitoral, dorsal e deltoides'
            ),
            intensity = 'medium',
            duration = 35,
            category = 'main'
          WHERE id = v_rows.id;

        -- 3. Hypertrophy Lower Body
        WHEN 3 THEN
          UPDATE public.workout_templates
          SET
            name = 'Hipertrofia Inferior 4x8rep',
            description = '4x8rep 60kg + 3x12rep 30kg c/ 2min intervalo',
            exercise_structure = jsonb_build_object(
              'warmup', 'Agachamento livre + mobilidade de quadril 5 minutos',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 4,
                  'reps', 8,
                  'load_kg', 60,
                  'rest_minutes', 2,
                  'rest_seconds', 0
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 12,
                  'load_kg', 30,
                  'rest_minutes', 1,
                  'rest_seconds', 30
                )
              ),
              'cooldown', 'Alongamento quadriceps, isquiotibiais, gluteos'
            ),
            intensity = 'medium',
            duration = 40,
            category = 'main'
          WHERE id = v_rows.id;

        -- 4. Muscular Endurance Circuit
        WHEN 4 THEN
          UPDATE public.workout_templates
          SET
            name = 'Circuito Resistencia 4 exercicios',
            description = '3x15rep 20kg + 3x15rep 15kg + 3x20rep 10kg + 3x20rep corpo c/ 1min intervalo',
            exercise_structure = jsonb_build_object(
              'warmup', 'Polichinelos + agachamento livre + flexoes leves (3 min)',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 15,
                  'load_kg', 20,
                  'rest_minutes', 1,
                  'rest_seconds', 0
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 15,
                  'load_kg', 15,
                  'rest_minutes', 1,
                  'rest_seconds', 0
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 20,
                  'load_kg', 10,
                  'rest_minutes', 0,
                  'rest_seconds', 45
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 20,
                  'load_kg', 0,
                  'rest_minutes', 0,
                  'rest_seconds', 45
                )
              ),
              'cooldown', 'Alongamento geral + respiracao 5 minutos'
            ),
            intensity = 'medium',
            duration = 45,
            category = 'main'
          WHERE id = v_rows.id;

        -- 5. Core & Stability
        WHEN 0 THEN
          UPDATE public.workout_templates
          SET
            name = 'Core e Estabilidade 5x12rep',
            description = '5 exercicios core: 3x12rep 15kg + 3x15rep corpo + 3x30s isometria',
            exercise_structure = jsonb_build_object(
              'warmup', 'Prancha frontal 30s + bird dog 10 cada lado',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 12,
                  'load_kg', 15,
                  'rest_minutes', 1,
                  'rest_seconds', 0
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 15,
                  'load_kg', 0,
                  'rest_minutes', 0,
                  'rest_seconds', 45
                ),
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'strength',
                  'repetitions', 3,
                  'reps', 10,
                  'load_kg', 10,
                  'rest_minutes', 0,
                  'rest_seconds', 45
                )
              ),
              'cooldown', 'Alongamento cadeia posterior + respiracao diafragmatica'
            ),
            intensity = 'low',
            duration = 30,
            category = 'main'
          WHERE id = v_rows.id;

      END CASE;

    -- ================================================================
    -- WALKING TEMPLATES (templates 19-20)
    -- ================================================================

    ELSIF v_rows.modality = 'walking' OR (v_rows.modality IS NULL AND v_idx >= 19) THEN

      CASE v_idx % 2
        -- 1. Power Walk Z2
        WHEN 1 THEN
          UPDATE public.workout_templates
          SET
            name = 'Caminhada Forte 30min Z2',
            description = 'Aq: 5min caminhada leve | 1x30min Z2 | Des: 5min caminhada leve',
            exercise_structure = jsonb_build_object(
              'warmup', '5 minutos caminhada leve + mobilidade de tornozelo',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'walking',
                  'repetitions', 1,
                  'work_value', 30,
                  'work_unit', 'minutes',
                  'zone', 'Z2',
                  'rest_minutes', 0,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '5 minutos caminhada lenta + alongamento'
            ),
            intensity = 'z2',
            duration = 40,
            category = 'main'
          WHERE id = v_rows.id;

        -- 2. Interval Walk Z1/Z3
        WHEN 0 THEN
          UPDATE public.workout_templates
          SET
            name = 'Caminhada Intervalada Z1/Z3',
            description = 'Aq: 5min leve | 6x(3min Z3 + 2min Z1) | Des: 5min leve',
            exercise_structure = jsonb_build_object(
              'warmup', '5 minutos caminhada leve com movimentos articulares',
              'series', jsonb_build_array(
                jsonb_build_object(
                  'id', gen_random_uuid()::text,
                  'type', 'walking',
                  'repetitions', 6,
                  'work_value', 3,
                  'work_unit', 'minutes',
                  'zone', 'Z3',
                  'rest_minutes', 2,
                  'rest_seconds', 0
                )
              ),
              'cooldown', '5 minutos caminhada muito leve + alongamento geral'
            ),
            intensity = 'z3',
            duration = 40,
            category = 'main'
          WHERE id = v_rows.id;

      END CASE;

    END IF;

  END LOOP;

  RAISE NOTICE 'Backfilled % workout_templates with V2 exercise_structure', v_idx;

END $$;
