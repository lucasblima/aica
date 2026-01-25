# 📋 Como Copiar as Migrations - Guia Simplificado

**Diretório atual:** `C:\Users\lucas\repos\Aica_frontend\Aica_frontend`

---

## 🚀 Método 1: Copiar via Terminal (Windows)

### Migration 0: PRÉ-REQUISITO
```bash
cat C:/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20260112000001_create_document_processing.sql
```

### Migration 1: WhatsApp Document Tracking
```bash
cat C:/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20260122000003_whatsapp_document_tracking.sql
```

### Migration 2: Streak Trends
```bash
cat C:/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20260123_streak_trends.sql
```

### Migration 3: Consciousness Points
```bash
cat C:/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20260124_consciousness_points.sql
```

### Migration 4: RECIPE Badges (CORRIGIDA)
```bash
cat C:/Users/lucas/repos/Aica_frontend/Aica_frontend/MIGRATION_RECIPE_BADGES_FINAL.sql
```

### Migration 5: Unified Efficiency (CORRIGIDA)
```bash
cat C:/Users/lucas/repos/Aica_frontend/Aica_frontend/MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql
```

---

## 🚀 Método 2: Copiar via PowerShell

### Migration 0: PRÉ-REQUISITO
```powershell
Get-Content "C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20260112000001_create_document_processing.sql"
```

### Migration 1: WhatsApp Document Tracking
```powershell
Get-Content "C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20260122000003_whatsapp_document_tracking.sql"
```

### Migration 2: Streak Trends
```powershell
Get-Content "C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20260123_streak_trends.sql"
```

### Migration 3: Consciousness Points
```powershell
Get-Content "C:\Users\lucas\repos\Aica_frontend\Aica_frontend\supabase\migrations\20260124_consciousness_points.sql"
```

### Migration 4: RECIPE Badges (CORRIGIDA)
```powershell
Get-Content "C:\Users\lucas\repos\Aica_frontend\Aica_frontend\MIGRATION_RECIPE_BADGES_FINAL.sql"
```

### Migration 5: Unified Efficiency (CORRIGIDA)
```powershell
Get-Content "C:\Users\lucas\repos\Aica_frontend\Aica_frontend\MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql"
```

---

## 🚀 Método 3: Abrir Arquivos Diretamente no VSCode

### Migration 0: PRÉ-REQUISITO
```bash
code supabase/migrations/20260112000001_create_document_processing.sql
```

### Migration 1: WhatsApp Document Tracking
```bash
code supabase/migrations/20260122000003_whatsapp_document_tracking.sql
```

### Migration 2: Streak Trends
```bash
code supabase/migrations/20260123_streak_trends.sql
```

### Migration 3: Consciousness Points
```bash
code supabase/migrations/20260124_consciousness_points.sql
```

### Migration 4: RECIPE Badges (CORRIGIDA)
```bash
code MIGRATION_RECIPE_BADGES_FINAL.sql
```

### Migration 5: Unified Efficiency (CORRIGIDA)
```bash
code MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql
```

---

## 🚀 Método 4: Caminhos Relativos (Se estiver na raiz do projeto)

```bash
# Certifique-se de estar em: C:\Users\lucas\repos\Aica_frontend\Aica_frontend

# Migration 0
cat supabase/migrations/20260112000001_create_document_processing.sql

# Migration 1
cat supabase/migrations/20260122000003_whatsapp_document_tracking.sql

# Migration 2
cat supabase/migrations/20260123_streak_trends.sql

# Migration 3
cat supabase/migrations/20260124_consciousness_points.sql

# Migration 4 (CORRIGIDA)
cat MIGRATION_RECIPE_BADGES_FINAL.sql

# Migration 5 (CORRIGIDA)
cat MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql
```

---

## ✅ Verificação dos Arquivos

Execute este comando para verificar que todos os arquivos existem:

```bash
ls -lh supabase/migrations/20260112000001_create_document_processing.sql
ls -lh supabase/migrations/20260122000003_whatsapp_document_tracking.sql
ls -lh supabase/migrations/20260123_streak_trends.sql
ls -lh supabase/migrations/20260124_consciousness_points.sql
ls -lh MIGRATION_RECIPE_BADGES_FINAL.sql
ls -lh MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql
```

**Resultado esperado:**
```
-rw-r--r-- 1 lucas 197609  25K Jan 17 14:11 supabase/migrations/20260112000001_create_document_processing.sql
-rw-r--r-- 1 lucas 197609  16K Jan 25 13:23 supabase/migrations/20260122000003_whatsapp_document_tracking.sql
-rw-r--r-- 1 lucas 197609 5.6K Jan 25 13:23 supabase/migrations/20260123_streak_trends.sql
-rw-r--r-- 1 lucas 197609 8.1K Jan 25 13:23 supabase/migrations/20260124_consciousness_points.sql
-rw-r--r-- 1 lucas 197609 8.8K Jan 25 XX:XX MIGRATION_RECIPE_BADGES_FINAL.sql
-rw-r--r-- 1 lucas 197609 8.3K Jan 25 XX:XX MIGRATION_UNIFIED_EFFICIENCY_FINAL.sql
```

---

## 📝 Passo a Passo DEFINITIVO

1. **Abra o terminal** (Git Bash, PowerShell ou cmd)
2. **Navegue até a raiz do projeto:**
   ```bash
   cd C:/Users/lucas/repos/Aica_frontend/Aica_frontend
   ```
3. **Verifique que está no lugar certo:**
   ```bash
   pwd  # Deve retornar: /c/Users/lucas/repos/Aica_frontend/Aica_frontend
   ```
4. **Execute os comandos `cat` acima** (Método 1 ou 4)
5. **Copie o output completo** de cada comando
6. **Cole no SQL Editor do Supabase**
7. **Execute (Ctrl+Enter)**
8. **Repita para as 6 migrations na ordem**

---

## 🔗 SQL Editor Supabase

https://supabase.com/dashboard/project/uzywajqzbdbrfammshdg/sql/new

---

## ⚠️ Se o arquivo ainda "não existir"

Tente um dos métodos abaixo:

### Opção A: Ver conteúdo direto no terminal
```bash
head -20 supabase/migrations/20260122000003_whatsapp_document_tracking.sql
```

### Opção B: Procurar o arquivo
```bash
find . -name "20260122000003_whatsapp_document_tracking.sql"
```

### Opção C: Listar todos os arquivos da pasta
```bash
ls -la supabase/migrations/ | grep 202601
```

### Opção D: Usar caminho absoluto completo
```bash
cat /c/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations/20260122000003_whatsapp_document_tracking.sql
```

---

**Todos os arquivos existem e estão prontos para uso!**
