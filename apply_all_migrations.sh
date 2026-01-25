#!/bin/bash

# ============================================================================
# Script para gerar comandos de cópia das migrations
# Uso: Execute este script e copie o output de cada migration para o SQL Editor
# ============================================================================

echo "=========================================================================="
echo "MIGRATION 1: WhatsApp Document Tracking"
echo "=========================================================================="
echo ""
echo "Copie o conteúdo abaixo e cole no SQL Editor:"
echo ""
cat supabase/migrations/20260122000003_whatsapp_document_tracking.sql
echo ""
echo ""
echo "Pressione Enter para ver a próxima migration..."
read

echo "=========================================================================="
echo "MIGRATION 2: Streak Trends"
echo "=========================================================================="
echo ""
cat supabase/migrations/20260123_streak_trends.sql
echo ""
echo ""
echo "Pressione Enter para ver a próxima migration..."
read

echo "=========================================================================="
echo "MIGRATION 3: Consciousness Points"
echo "=========================================================================="
echo ""
cat supabase/migrations/20260124_consciousness_points.sql
echo ""
echo ""
echo "Pressione Enter para ver a próxima migration..."
read

echo "=========================================================================="
echo "MIGRATION 4: RECIPE Badges"
echo "=========================================================================="
echo ""
cat supabase/migrations/20260125_recipe_badges.sql
echo ""
echo ""
echo "Pressione Enter para ver a próxima migration..."
read

echo "=========================================================================="
echo "MIGRATION 5: Unified Efficiency"
echo "=========================================================================="
echo ""
cat supabase/migrations/20260126_unified_efficiency.sql
echo ""
echo ""

echo "=========================================================================="
echo "TODAS AS MIGRATIONS EXIBIDAS!"
echo "=========================================================================="
echo ""
echo "Próximo passo: Execute o script de validação (migration_status_check.sql)"
