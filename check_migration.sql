-- Verificar se a tabela task_categories existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'task_categories'
) AS task_categories_exists;

-- Verificar se a coluna category_id existe em work_items
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'work_items' 
    AND column_name = 'category_id'
) AS category_id_exists;
