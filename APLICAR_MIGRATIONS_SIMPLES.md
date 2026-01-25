# 🚀 Aplicar Migrations - Guia Ultra Simplificado

**Todos os arquivos estão na raiz do projeto:** `C:\Users\lucas\repos\Aica_frontend\Aica_frontend`

---

## 📋 6 Arquivos Prontos para Copiar

Todos os arquivos SQL estão **na raiz do projeto** com nomes numerados:

```
MIGRATION_0_DOCUMENT_PROCESSING.sql          (25KB - PRÉ-REQUISITO)
MIGRATION_1_WHATSAPP_DOCUMENT_TRACKING.sql   (16KB)
MIGRATION_2_STREAK_TRENDS.sql                (5.6KB)
MIGRATION_3_CONSCIOUSNESS_POINTS.sql         (7.9KB)
MIGRATION_4_RECIPE_BADGES.sql                (7.5KB - CORRIGIDO)
MIGRATION_5_UNIFIED_EFFICIENCY.sql           (7.9KB - CORRIGIDO)
```

---

## ✅ Como Aplicar (3 passos)

### 1. Abrir SQL Editor
https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new

### 2. Para cada arquivo (na ordem 0 → 5):

**Opção A: Via Terminal (Git Bash)**
```bash
cat MIGRATION_0_DOCUMENT_PROCESSING.sql
```

**Opção B: Via PowerShell**
```powershell
Get-Content MIGRATION_0_DOCUMENT_PROCESSING.sql
```

**Opção C: Via VSCode**
```bash
code MIGRATION_0_DOCUMENT_PROCESSING.sql
```
→ Copie todo conteúdo (Ctrl+A, Ctrl+C)

### 3. Cole no SQL Editor e Execute
- Cole no SQL Editor (Ctrl+V)
- Clique em **Run** (ou Ctrl+Enter)
- Aguarde "Success. No rows returned"
- **Repita para os 6 arquivos na ordem**

---

## 📝 Ordem de Aplicação

```
1️⃣ MIGRATION_0_DOCUMENT_PROCESSING.sql
   ⏱️ ~15 segundos

2️⃣ MIGRATION_1_WHATSAPP_DOCUMENT_TRACKING.sql
   ⏱️ ~10 segundos

3️⃣ MIGRATION_2_STREAK_TRENDS.sql
   ⏱️ ~5 segundos

4️⃣ MIGRATION_3_CONSCIOUSNESS_POINTS.sql
   ⏱️ ~8 segundos

5️⃣ MIGRATION_4_RECIPE_BADGES.sql (CORRIGIDO)
   ⏱️ ~10 segundos

6️⃣ MIGRATION_5_UNIFIED_EFFICIENCY.sql (CORRIGIDO)
   ⏱️ ~8 segundos
```

**Tempo total:** 10-15 minutos

---

## ✅ Validação

Após aplicar todas as 6 migrations, execute este SQL:

```sql
SELECT version, '✅ APLICADA' AS status
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260112000001',
  '20260122000003',
  '20260123',
  '20260124',
  '20260125',
  '20260126'
)
ORDER BY version;
```

**Esperado:** 6 linhas com ✅ APLICADA

---

## 🔗 Link Direto

**SQL Editor:** https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new

---

## ⚠️ Notas

- **Todos os 6 arquivos estão na RAIZ do projeto** (mesmo diretório deste README)
- **Não precisa navegar para `supabase/migrations/`**
- **Arquivos 4 e 5 já estão CORRIGIDOS** (full_name, u.email)
- **Aplique NA ORDEM** (0 → 5) para evitar erros de dependência

---

**Pronto para aplicar!** 🎉
