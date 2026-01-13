---
name: supabase-database
description: Gerenciamento do banco Supabase (migrations, queries, CLI). Use quando trabalhar com schema, dados ou Edge Functions.
---

# Supabase Database Skill

Skill para gerenciamento do banco de dados Supabase, incluindo migrations, queries SQL, Edge Functions e CLI.

---

## Credenciais

**IMPORTANTE:** As credenciais estão em `.claude/supabase.local` (arquivo local, não commitado).

```bash
# Ver credenciais
cat .claude/supabase.local
```

---

## Quick Reference

### Projeto Staging (Ativo)

| Config | Valor |
|--------|-------|
| Project Ref | `uzywajqzbdbrfammshdg` |
| URL | https://uzywajqzbdbrfammshdg.supabase.co |
| Region | sa-east-1 (São Paulo) |
| Dashboard | https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg |

---

## CLI Setup

### Login

```bash
# Login com token (credenciais em .claude/supabase.local)
supabase login --token <ACCESS_TOKEN>

# Verificar login
supabase projects list
```

### Link Projeto

```bash
# Linkar ao projeto staging
supabase link --project-ref uzywajqzbdbrfammshdg

# Verificar link
supabase status
```

---

## Migrations

### Criar Migration

```bash
# Criar nova migration
supabase migration new nome_da_migration

# Exemplo
supabase migration new add_whatsapp_sessions_table
```

### Aplicar Migrations

```bash
# Ver diff (o que vai mudar)
supabase db diff

# Aplicar no projeto remoto
supabase db push

# Reset local (CUIDADO - apaga dados)
supabase db reset
```

### Listar Migrations

```bash
# Ver migrations aplicadas
supabase migration list

# Ver status
supabase db remote status
```

---

## Queries SQL

### Via CLI

```bash
# Query simples
supabase db execute "SELECT count(*) FROM users;"

# Query com output formatado
supabase db execute "SELECT * FROM profiles LIMIT 5;" --csv

# Múltiplas queries
supabase db execute "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public';
"
```

### Queries Úteis

```sql
-- Listar todas as tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver estrutura de uma tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Ver RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Ver índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public';

-- Contagem de registros por tabela
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

## Edge Functions

### Desenvolvimento Local

```bash
# Servir funções localmente
supabase functions serve

# Servir função específica
supabase functions serve nome-da-funcao

# Com variáveis de ambiente
supabase functions serve --env-file .env.local
```

### Deploy

```bash
# Deploy de uma função
supabase functions deploy nome-da-funcao

# Deploy de todas as funções
supabase functions deploy

# Com JWT verification desabilitado (para testes)
supabase functions deploy nome-da-funcao --no-verify-jwt
```

### Listar e Logs

```bash
# Listar funções
supabase functions list

# Ver logs
supabase logs --type edge-functions

# Logs de função específica
supabase logs --type edge-functions --func nome-da-funcao
```

### Invocar Função

```bash
# Invocar localmente
curl -i --location --request POST 'http://localhost:54321/functions/v1/nome-da-funcao' \
  --header 'Authorization: Bearer <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"key": "value"}'

# Invocar em produção
curl -i --location --request POST 'https://uzywajqzbdbrfammshdg.supabase.co/functions/v1/nome-da-funcao' \
  --header 'Authorization: Bearer <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"key": "value"}'
```

---

## Tabelas do Projeto (Staging)

```
├── association_members    # Membros de associações
├── associations           # Organizações/Associações
├── contact_network        # Rede de contatos (WhatsApp)
├── daily_reports          # Relatórios diários
├── grant_briefings        # Briefings de editais
├── grant_documents        # Documentos de editais
├── grant_opportunities    # Oportunidades de editais
├── grant_projects         # Projetos de captação
├── grant_responses        # Respostas a editais
├── life_events            # Eventos de vida (timeline)
├── podcast_episodes       # Episódios de podcast
├── podcast_shows          # Programas de podcast
├── profiles               # Perfis de usuário
├── user_achievements      # Conquistas (gamification)
├── user_stats             # Estatísticas do usuário
├── users                  # Usuários (auth)
└── whatsapp_sessions      # Sessões WhatsApp (multi-instance)
```

---

## RLS (Row Level Security)

### Verificar RLS

```sql
-- Ver se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Ver policies de uma tabela
SELECT * FROM pg_policies
WHERE tablename = 'sua_tabela';
```

### Criar Policy

```sql
-- Policy básica: usuário vê apenas seus dados
CREATE POLICY "Users can view own data"
ON public.sua_tabela
FOR SELECT
USING (auth.uid() = user_id);

-- Policy para INSERT
CREATE POLICY "Users can insert own data"
ON public.sua_tabela
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy para UPDATE
CREATE POLICY "Users can update own data"
ON public.sua_tabela
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy para DELETE
CREATE POLICY "Users can delete own data"
ON public.sua_tabela
FOR DELETE
USING (auth.uid() = user_id);
```

### SECURITY DEFINER Functions

```sql
-- Função que bypassa RLS (para operações admin)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM profiles;
END;
$$;
```

---

## Backup e Restore

### Backup Manual

```bash
# Dump do schema
pg_dump -h aws-0-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.uzywajqzbdbrfammshdg \
  -d postgres \
  --schema-only > schema_backup.sql

# Dump completo (com dados)
pg_dump -h aws-0-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.uzywajqzbdbrfammshdg \
  -d postgres > full_backup.sql
```

### Restore

```bash
# Restore de schema
psql -h aws-0-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.uzywajqzbdbrfammshdg \
  -d postgres < schema_backup.sql
```

---

## Troubleshooting

### Erro de Conexão

```markdown
## "connection refused"
- Verificar IP está na whitelist
- Verificar credenciais corretas
- Usar pooler URL (porta 6543)

## "permission denied"
- Verificar RLS policies
- Verificar usuário tem permissão
- Testar com service role key

## "relation does not exist"
- Verificar schema está correto (public)
- Verificar migration foi aplicada
- Rodar: supabase db push
```

### Verificar Conectividade

```bash
# Testar conexão
psql "postgresql://postgres.uzywajqzbdbrfammshdg:<PASSWORD>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" -c "SELECT 1;"
```

---

## Links Úteis

- [Dashboard Staging](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg)
- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [SQL Editor](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql)
- [Edge Functions](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/functions)
- [Auth Users](https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/auth/users)
