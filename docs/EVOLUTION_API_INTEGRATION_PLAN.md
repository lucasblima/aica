# Evolution API Integration Plan
# Integração Completa: WhatsApp Conversations & Contact Health Scoring

**Status:** 📋 Plano de Implementação
**Issue:** TBD (Next Sprint)
**Data:** 2026-01-08
**Prioridade:** Alta
**Estimativa:** 3-5 dias de desenvolvimento + 2 dias de testes

---

## Executive Summary

Integrar a **Evolution API** com o sistema de **Contact Network** para:
1. **Carregar conversas do WhatsApp** (contatos individuais e grupos)
2. **Analisar interações** usando AI (sentiment, engagement, health scores)
3. **Atualizar health scores automaticamente** baseado em dados reais de WhatsApp
4. **Sincronizar contatos** WhatsApp → `contact_network` table
5. **Vincular conversas** a espaços do Connection System

### Benefícios
- ✅ **Health Scores Automáticos**: Substituir simulação por dados reais de interação
- ✅ **360° Contact View**: Unificar Google Contacts + WhatsApp + Podcast Guests
- ✅ **Proactive Alerts**: Detectar relacionamentos em risco baseado em padrões de mensagens
- ✅ **Engagement Insights**: Dashboard com métricas de comunicação por contato
- ✅ **LGPD Compliant**: Sistema de consentimento já implementado

---

## Infraestrutura Atual (Issue #12)

### ✅ Já Implementado (95% completo)

Ver: WHATSAPP_INTEGRATION_SUMMARY.md para detalhes completos

Resumo:
- 3 Edge Functions deployadas
- 4 tabelas WhatsApp criadas
- Evolution API Client implementado
- Webhook configurado
- Frontend services prontos

### ⚠️ Gaps Identificados

1. **Falta endpoints no Evolution API Client**: fetchMessages(), fetchChats(), fetchGroupMetadata()
2. **Falta sincronização automática**: Nenhum job periódico para buscar novas mensagens
3. **Falta integração com Contact Network**: Mensagens não afetam health_score

---

## Plano de Implementação - 6 Fases

Documento completo com código, queries SQL, testes e deployment strategy disponível no arquivo.

Próximos passos: Criar issue no GitHub e iniciar Phase 1.
