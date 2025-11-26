-- ============================================
-- SEED DATA - Versão Simplificada
-- PASSO 1: Execute este bloco PRIMEIRO para obter seu user_id
-- ============================================

-- Execute e copie o resultado (seu UUID)
SELECT auth.uid() AS my_user_id;

-- ============================================
-- PASSO 2: Cole o UUID acima substituindo em TODAS as ocorrências
-- de '43901ac8-939f-4710-9930-979aac567d75' abaixo
-- ============================================

-- Exemplo: se o resultado for: 12345678-1234-1234-1234-123456789012
-- Substitua: '43901ac8-939f-4710-9930-979aac567d75' -> '12345678-1234-1234-1234-123456789012'

-- ============================================
-- Workspaces & Associações
-- ============================================

INSERT INTO workspaces (id, slug, name) VALUES
('11111111-1111-1111-1111-111111111111', 'my-life-os', 'Meu Life OS')
ON CONFLICT (id) DO NOTHING;

INSERT INTO associations (id, workspace_id, name, description, type, owner_user_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Porto Maravilha', 'Associação Porto Maravilha', 'association', '43901ac8-939f-4710-9930-979aac567d75'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Vida Pessoal', 'Vida Pessoal', 'personal', '43901ac8-939f-4710-9930-979aac567d75')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Membership
-- ============================================

INSERT INTO association_members (association_id, user_id, role) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '43901ac8-939f-4710-9930-979aac567d75', 'admin'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '43901ac8-939f-4710-9930-979aac567d75', 'admin')
ON CONFLICT DO NOTHING;

-- ============================================
-- Estados
-- ============================================

INSERT INTO states (id, association_id, entity_type, name, color, sequence) VALUES
('s1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'work_item', 'A Fazer', '#EF4444', 1),
('s2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'work_item', 'Em Progresso', '#FBBF24', 2),
('s3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'work_item', 'Concluído', '#10B981', 3),
('s4444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'module', 'Em Andamento', '#3B82F6', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Módulos
-- ============================================

INSERT INTO modules (id, association_id, name, description, state_id, progress_percentage) VALUES
('m1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Finanças', 'Orçamento pessoal', 's4444444-4444-4444-4444-444444444444', 75),
('m2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Saúde & Bem-estar', 'Exercícios', 's4444444-4444-4444-4444-444444444444', 40),
('m3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Inglês Comunitário', 'Curso online', 's4444444-4444-4444-4444-444444444444', 85),
('m4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Festival Favela Ecos', 'Festival cultural', 's4444444-4444-4444-4444-444444444444', 60)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Tarefas
-- ============================================

INSERT INTO work_items (id, association_id, title, description, priority, state_id, due_date, module_id, created_by) VALUES
-- Caso 1: Crise Emocional
('w1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Finalizar Relatório Urgente', 'Relatório da associação', 'urgent', 's2222222-2222-2222-2222-222222222222', CURRENT_DATE + 1, NULL, '43901ac8-939f-4710-9930-979aac567d75'),
-- Caso 2: Finanças  
('w2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Registrar despesa carro', 'R$ 500 oficina', 'high', 's1111111-1111-1111-1111-111111111111', CURRENT_DATE, 'm1111111-1111-1111-1111-111111111111', '43901ac8-939f-4710-9930-979aac567d75'),
-- Caso 3: Pomodoro
('w3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Revisar Contrato', '2 pomodoros', 'medium', 's2222222-2222-2222-2222-222222222222', CURRENT_DATE, NULL, '43901ac8-939f-4710-9930-979aac567d75'),
('w4444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Estudar Inglês', '2 pomodoros', 'medium', 's2222222-2222-2222-2222-222222222222', CURRENT_DATE, 'm3333333-3333-3333-3333-333333333333', '43901ac8-939f-4710-9930-979aac567d75'),
-- Caso 4: Festival
('w5555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vistoria Galpão', 'Com Gisele', 'urgent', 's1111111-1111-1111-1111-111111111111', CURRENT_DATE - 1, 'm4444444-4444-4444-4444-444444444444', '43901ac8-939f-4710-9930-979aac567d75'),
-- Tarefas completadas (histórico)
('w6666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Fazer Mega 10k', 'Corrida', 'medium', 's3333333-3333-3333-3333-333333333333', CURRENT_DATE - 3, NULL, '43901ac8-939f-4710-9930-979aac567d75'),
('w7777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pagar luz', 'Conta', 'high', 's3333333-3333-3333-3333-333333333333', CURRENT_DATE - 7, NULL, '43901ac8-939f-4710-9930-979aac567d75')
ON CONFLICT (id) DO NOTHING;

-- Marcar as completadas
UPDATE work_items 
SET completed_at = due_date, actual_hours = 2
WHERE id IN ('w6666666-6666-6666-6666-666666666666', 'w7777777-7777-7777-7777-777777777777');

-- ============================================
-- Gamificação & Contexto
-- ============================================

INSERT INTO memories (content, metadata) VALUES
('Ansiedade por prazo de relatório', '{"sentiment": "negative", "emotion": "anxiety"}'::jsonb);

INSERT INTO daily_reports (user_id, report_date, report_type, report_content) VALUES
('43901ac8-939f-4710-9930-979aac567d75', CURRENT_DATE, 'daily_summary', 'Pico de ansiedade às 14h');

INSERT INTO contact_network (user_id, contact_hash, contact_label, relationship_type) VALUES
('43901ac8-939f-4710-9930-979aac567d75', 'gisele_porto', 'Gisele (Porto Maravilha)', 'work');

-- ============================================
-- Profile & Stats
-- ============================================

INSERT INTO profiles (id, birthdate, country) VALUES
('43901ac8-939f-4710-9930-979aac567d75', '1990-01-15', 'BR')  -- SUBSTITUA A DATA
ON CONFLICT (id) DO UPDATE SET birthdate = '1990-01-15';

INSERT INTO user_stats (user_id, total_tasks, level) VALUES
('43901ac8-939f-4710-9930-979aac567d75', 7, 'Beginner')
ON CONFLICT (user_id) DO UPDATE SET total_tasks = 7;

-- ============================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Dados criados! Atualize a página do frontend.';
END $$;
