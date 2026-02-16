-- Migration: 20260216000002_interviewer_seed_questions.sql
-- Description: Seed ~50 curated interview questions in Portuguese (PT-BR) across 6 categories.
--              Each question includes type-specific config, target modules, and deterministic
--              memory_mapping for routing answers to user_memory.

-- ============================================================================
-- CATEGORIA: biografia (perguntas 1-8) — Perfil pessoal global
-- ============================================================================

INSERT INTO interviewer_questions (question_text, question_type, category, config, target_modules, memory_mapping, difficulty_level, is_curated, sort_order) VALUES

-- 1
('Qual é a sua data de nascimento?', 'date', 'biografia',
 '{}'::jsonb,
 '{}',
 '{"category": "profile", "key": "birth_date", "module": null}'::jsonb,
 1, true, 1),

-- 2
('Qual é o seu nível de escolaridade?', 'single_choice', 'biografia',
 '{"options": ["Fundamental", "Médio", "Superior", "Pós-graduação", "Mestrado", "Doutorado"]}'::jsonb,
 '{}',
 '{"category": "profile", "key": "education_level", "module": null}'::jsonb,
 1, true, 2),

-- 3
('Onde você nasceu?', 'free_text', 'biografia',
 '{}'::jsonb,
 '{}',
 '{"category": "profile", "key": "birthplace", "module": null}'::jsonb,
 1, true, 3),

-- 4
('Qual é a sua profissão atual?', 'free_text', 'biografia',
 '{}'::jsonb,
 '{}',
 '{"category": "profile", "key": "profession", "module": null}'::jsonb,
 1, true, 4),

-- 5
('Descreva os marcos mais importantes da sua vida', 'long_text', 'biografia',
 '{}'::jsonb,
 '{}',
 '{"category": "profile", "key": "life_milestones", "module": null}'::jsonb,
 2, true, 5),

-- 6
('Qual é o seu estado civil?', 'single_choice', 'biografia',
 '{"options": ["Solteiro(a)", "Namorando", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"]}'::jsonb,
 '{}',
 '{"category": "profile", "key": "marital_status", "module": null}'::jsonb,
 1, true, 6),

-- 7
('Você tem filhos? Quantos?', 'single_choice', 'biografia',
 '{"options": ["Não", "1", "2", "3", "4+"]}'::jsonb,
 '{}',
 '{"category": "profile", "key": "children", "module": null}'::jsonb,
 1, true, 7),

-- 8
('Quais idiomas você fala?', 'multi_choice', 'biografia',
 '{"options": ["Português", "Inglês", "Espanhol", "Francês", "Alemão", "Italiano", "Mandarim", "Japonês", "Outro"]}'::jsonb,
 '{}',
 '{"category": "profile", "key": "languages", "module": null}'::jsonb,
 1, true, 8);

-- ============================================================================
-- CATEGORIA: anamnese (perguntas 9-16) — Saúde e bem-estar → Journey
-- ============================================================================

INSERT INTO interviewer_questions (question_text, question_type, category, config, target_modules, memory_mapping, difficulty_level, is_curated, sort_order) VALUES

-- 9
('Como está seu nível de energia hoje?', 'scale', 'anamnese',
 '{"min": 1, "max": 10, "min_label": "Exausto", "max_label": "Energizado"}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "energy_level", "module": "journey"}'::jsonb,
 1, true, 1),

-- 10
('Com que frequência você pratica exercícios?', 'single_choice', 'anamnese',
 '{"options": ["Nunca", "1-2x por semana", "3-4x por semana", "5+x por semana", "Diariamente"]}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "exercise_frequency", "module": "journey"}'::jsonb,
 1, true, 2),

-- 11
('Você tem alguma condição de saúde?', 'multi_choice', 'anamnese',
 '{"options": ["Nenhuma", "Ansiedade", "Depressão", "Insônia", "Dor crônica", "Hipertensão", "Diabetes", "Outra"]}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "health_conditions", "module": "journey"}'::jsonb,
 2, true, 3),

-- 12
('Como você avalia a qualidade do seu sono?', 'scale', 'anamnese',
 '{"min": 1, "max": 10, "min_label": "Péssimo", "max_label": "Excelente"}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "sleep_quality", "module": "journey"}'::jsonb,
 1, true, 4),

-- 13
('Qual é o seu nível de estresse atual?', 'scale', 'anamnese',
 '{"min": 1, "max": 10, "min_label": "Tranquilo", "max_label": "Muito estressado"}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "stress_level", "module": "journey"}'::jsonb,
 1, true, 5),

-- 14
('Você pratica alguma atividade de mindfulness?', 'single_choice', 'anamnese',
 '{"options": ["Não", "Meditação", "Yoga", "Respiração", "Outra"]}'::jsonb,
 '{journey}',
 '{"category": "preference", "key": "mindfulness_practice", "module": "journey"}'::jsonb,
 1, true, 6),

-- 15
('Como está sua alimentação?', 'scale', 'anamnese',
 '{"min": 1, "max": 10, "min_label": "Muito ruim", "max_label": "Excelente"}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "nutrition_quality", "module": "journey"}'::jsonb,
 1, true, 7),

-- 16
('Quantas horas de sono você dorme por noite em média?', 'single_choice', 'anamnese',
 '{"options": ["Menos de 5h", "5-6h", "6-7h", "7-8h", "Mais de 8h"]}'::jsonb,
 '{journey}',
 '{"category": "fact", "key": "sleep_hours", "module": "journey"}'::jsonb,
 1, true, 8);

-- ============================================================================
-- CATEGORIA: censo (perguntas 17-24) — Dados socioeconômicos → Finance
-- ============================================================================

INSERT INTO interviewer_questions (question_text, question_type, category, config, target_modules, memory_mapping, difficulty_level, is_curated, sort_order) VALUES

-- 17
('Qual é a sua faixa de renda mensal?', 'single_choice', 'censo',
 '{"options": ["Até R$2.000", "R$2.000 - R$5.000", "R$5.000 - R$10.000", "R$10.000 - R$20.000", "Acima de R$20.000"]}'::jsonb,
 '{finance}',
 '{"category": "profile", "key": "income_range", "module": "finance"}'::jsonb,
 2, true, 1),

-- 18
('Em qual cidade e estado você mora?', 'free_text', 'censo',
 '{}'::jsonb,
 '{}',
 '{"category": "profile", "key": "location", "module": null}'::jsonb,
 1, true, 2),

-- 19
('Qual é o tipo da sua moradia?', 'single_choice', 'censo',
 '{"options": ["Própria", "Alugada", "Financiada", "Compartilhada", "Outro"]}'::jsonb,
 '{finance}',
 '{"category": "profile", "key": "housing_type", "module": "finance"}'::jsonb,
 1, true, 3),

-- 20
('Quantas pessoas moram com você?', 'single_choice', 'censo',
 '{"options": ["Moro sozinho(a)", "2", "3", "4", "5+"]}'::jsonb,
 '{}',
 '{"category": "profile", "key": "household_size", "module": null}'::jsonb,
 1, true, 4),

-- 21
('Qual é o seu setor de atuação?', 'single_choice', 'censo',
 '{"options": ["Tecnologia", "Saúde", "Educação", "Engenharia", "Administração", "Arte e Cultura", "Outro"]}'::jsonb,
 '{}',
 '{"category": "profile", "key": "work_sector", "module": null}'::jsonb,
 1, true, 5),

-- 22
('Você tem investimentos?', 'single_choice', 'censo',
 '{"options": ["Não", "Poupança", "Renda fixa", "Ações", "Cripto", "Imóveis", "Diversos"]}'::jsonb,
 '{finance}',
 '{"category": "fact", "key": "investment_type", "module": "finance"}'::jsonb,
 2, true, 6),

-- 23
('Qual é o seu principal gasto mensal?', 'single_choice', 'censo',
 '{"options": ["Moradia", "Alimentação", "Transporte", "Educação", "Lazer", "Saúde"]}'::jsonb,
 '{finance}',
 '{"category": "fact", "key": "main_expense", "module": "finance"}'::jsonb,
 1, true, 7),

-- 24
('Você tem reserva de emergência?', 'single_choice', 'censo',
 '{"options": ["Não", "Menos de 3 meses", "3-6 meses", "6-12 meses", "Mais de 12 meses"]}'::jsonb,
 '{finance}',
 '{"category": "fact", "key": "emergency_fund", "module": "finance"}'::jsonb,
 2, true, 8);

-- ============================================================================
-- CATEGORIA: preferencias (perguntas 25-32) — Preferências globais
-- ============================================================================

INSERT INTO interviewer_questions (question_text, question_type, category, config, target_modules, memory_mapping, difficulty_level, is_curated, sort_order) VALUES

-- 25
('Qual é o seu estilo de comunicação preferido?', 'single_choice', 'preferencias',
 '{"options": ["Direto e objetivo", "Detalhado e explicativo", "Casual e descontraído", "Formal e estruturado"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "communication_style", "module": null}'::jsonb,
 1, true, 1),

-- 26
('Como você aprende melhor?', 'single_choice', 'preferencias',
 '{"options": ["Lendo", "Ouvindo", "Praticando", "Visual"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "learning_style", "module": null}'::jsonb,
 1, true, 2),

-- 27
('Você é mais matutino ou noturno?', 'single_choice', 'preferencias',
 '{"options": ["Madrugador", "Matutino", "Vespertino", "Noturno"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "chronotype", "module": null}'::jsonb,
 1, true, 3),

-- 28
('Quais tipos de conteúdo você mais consome?', 'multi_choice', 'preferencias',
 '{"options": ["Podcasts", "Livros", "Vídeos", "Artigos", "Redes sociais", "Cursos", "Newsletters"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "content_consumption", "module": null}'::jsonb,
 1, true, 4),

-- 29
('Como você prefere organizar suas tarefas?', 'single_choice', 'preferencias',
 '{"options": ["Listas", "Calendário", "Kanban", "Mental", "App de notas"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "task_organization", "module": null}'::jsonb,
 1, true, 5),

-- 30
('Qual é o seu nível de conforto com tecnologia?', 'scale', 'preferencias',
 '{"min": 1, "max": 10, "min_label": "Básico", "max_label": "Expert"}'::jsonb,
 '{}',
 '{"category": "preference", "key": "tech_comfort", "module": null}'::jsonb,
 1, true, 6),

-- 31
('Você prefere trabalhar sozinho ou em equipe?', 'single_choice', 'preferencias',
 '{"options": ["Sozinho(a)", "Pequenos grupos", "Grandes equipes", "Depende da tarefa"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "work_style", "module": null}'::jsonb,
 1, true, 7),

-- 32
('Qual é a sua forma preferida de relaxar?', 'multi_choice', 'preferencias',
 '{"options": ["Exercício", "Música", "Leitura", "Natureza", "Jogos", "Cozinhar", "Socializar", "Meditação"]}'::jsonb,
 '{}',
 '{"category": "preference", "key": "relaxation", "module": null}'::jsonb,
 1, true, 8);

-- ============================================================================
-- CATEGORIA: conexoes (perguntas 33-40) — Relacionamentos → Connections
-- ============================================================================

INSERT INTO interviewer_questions (question_text, question_type, category, config, target_modules, memory_mapping, difficulty_level, is_curated, sort_order) VALUES

-- 33
('Quais são seus principais círculos sociais?', 'multi_choice', 'conexoes',
 '{"options": ["Família", "Amigos próximos", "Colegas de trabalho", "Comunidade religiosa", "Grupo de esportes", "Grupo online", "Vizinhança"]}'::jsonb,
 '{connections}',
 '{"category": "fact", "key": "social_circles", "module": "connections"}'::jsonb,
 1, true, 1),

-- 34
('Ordene suas prioridades em relacionamentos', 'ranked_list', 'conexoes',
 '{"items": ["Confiança", "Diversão", "Crescimento mútuo", "Apoio emocional", "Interesses em comum", "Respeito"]}'::jsonb,
 '{connections}',
 '{"category": "preference", "key": "relationship_priorities", "module": "connections"}'::jsonb,
 2, true, 2),

-- 35
('Com que frequência você se conecta com amigos?', 'single_choice', 'conexoes',
 '{"options": ["Diariamente", "Semanalmente", "Quinzenalmente", "Mensalmente", "Raramente"]}'::jsonb,
 '{connections}',
 '{"category": "fact", "key": "friend_contact_frequency", "module": "connections"}'::jsonb,
 1, true, 3),

-- 36
('Quantas pessoas você considera realmente próximas?', 'single_choice', 'conexoes',
 '{"options": ["1-2", "3-5", "6-10", "11-20", "20+"]}'::jsonb,
 '{connections}',
 '{"category": "fact", "key": "close_connections_count", "module": "connections"}'::jsonb,
 1, true, 4),

-- 37
('Como você prefere manter contato?', 'multi_choice', 'conexoes',
 '{"options": ["WhatsApp", "Ligação", "Pessoalmente", "Redes sociais", "Email", "Vídeo chamada"]}'::jsonb,
 '{connections}',
 '{"category": "preference", "key": "contact_method", "module": "connections"}'::jsonb,
 1, true, 5),

-- 38
('Você se considera introvertido ou extrovertido?', 'scale', 'conexoes',
 '{"min": 1, "max": 10, "min_label": "Introvertido", "max_label": "Extrovertido"}'::jsonb,
 '{connections}',
 '{"category": "profile", "key": "introversion_extroversion", "module": "connections"}'::jsonb,
 1, true, 6),

-- 39
('Qual tipo de evento social você mais gosta?', 'single_choice', 'conexoes',
 '{"options": ["Jantar íntimo", "Festa grande", "Atividade ao ar livre", "Evento cultural", "Esportivo", "Prefiro não socializar"]}'::jsonb,
 '{connections}',
 '{"category": "preference", "key": "social_events", "module": "connections"}'::jsonb,
 1, true, 7),

-- 40
('Você tem mentores ou referências profissionais?', 'single_choice', 'conexoes',
 '{"options": ["Não", "1", "2-3", "4+"]}'::jsonb,
 '{connections}',
 '{"category": "fact", "key": "mentors_count", "module": "connections"}'::jsonb,
 1, true, 8);

-- ============================================================================
-- CATEGORIA: objetivos (perguntas 41-50) — Metas e sonhos → Atlas + Journey
-- ============================================================================

INSERT INTO interviewer_questions (question_text, question_type, category, config, target_modules, memory_mapping, difficulty_level, is_curated, sort_order) VALUES

-- 41
('Ordene suas prioridades de vida', 'ranked_list', 'objetivos',
 '{"items": ["Saúde", "Carreira", "Família", "Finanças", "Crescimento pessoal", "Relacionamentos", "Lazer", "Espiritualidade"]}'::jsonb,
 '{atlas,journey}',
 '{"category": "preference", "key": "life_priorities", "module": null}'::jsonb,
 2, true, 1),

-- 42
('Quais são suas metas para os próximos 3 meses?', 'long_text', 'objetivos',
 '{}'::jsonb,
 '{atlas,journey}',
 '{"category": "fact", "key": "short_term_goals", "module": null}'::jsonb,
 2, true, 2),

-- 43
('Qual é o seu maior sonho?', 'long_text', 'objetivos',
 '{}'::jsonb,
 '{atlas,journey}',
 '{"category": "fact", "key": "biggest_dream", "module": null}'::jsonb,
 2, true, 3),

-- 44
('Quais habilidades você quer desenvolver?', 'multi_choice', 'objetivos',
 '{"options": ["Liderança", "Comunicação", "Programação", "Idiomas", "Gestão financeira", "Criatividade", "Saúde física", "Inteligência emocional"]}'::jsonb,
 '{atlas,journey}',
 '{"category": "preference", "key": "skills_to_develop", "module": null}'::jsonb,
 1, true, 4),

-- 45
('O que te impede de alcançar seus objetivos?', 'multi_choice', 'objetivos',
 '{"options": ["Tempo", "Dinheiro", "Motivação", "Conhecimento", "Medo", "Saúde", "Apoio social"]}'::jsonb,
 '{atlas,journey}',
 '{"category": "fact", "key": "obstacles", "module": null}'::jsonb,
 2, true, 5),

-- 46
('Onde você se vê em 5 anos?', 'long_text', 'objetivos',
 '{}'::jsonb,
 '{atlas,journey}',
 '{"category": "fact", "key": "five_year_vision", "module": null}'::jsonb,
 3, true, 6),

-- 47
('Qual área da sua vida precisa de mais atenção agora?', 'single_choice', 'objetivos',
 '{"options": ["Saúde", "Carreira", "Relacionamentos", "Finanças", "Desenvolvimento pessoal", "Lazer"]}'::jsonb,
 '{atlas,journey}',
 '{"category": "fact", "key": "area_needing_attention", "module": null}'::jsonb,
 1, true, 7),

-- 48
('Você tem algum projeto pessoal em andamento?', 'free_text', 'objetivos',
 '{}'::jsonb,
 '{atlas}',
 '{"category": "fact", "key": "personal_projects", "module": "atlas"}'::jsonb,
 1, true, 8),

-- 49
('Como você mede sucesso na sua vida?', 'long_text', 'objetivos',
 '{}'::jsonb,
 '{atlas,journey}',
 '{"category": "insight", "key": "success_definition", "module": null}'::jsonb,
 3, true, 9),

-- 50
('Qual mudança você gostaria de fazer esta semana?', 'free_text', 'objetivos',
 '{}'::jsonb,
 '{atlas,journey}',
 '{"category": "fact", "key": "weekly_change_goal", "module": null}'::jsonb,
 1, true, 10);
