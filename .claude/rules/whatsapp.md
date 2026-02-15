---
globs: src/modules/connections/**,supabase/functions/webhook*,supabase/functions/ingest*,supabase/functions/build-con*,supabase/functions/route-ent*,supabase/functions/extract-int*
---
# WhatsApp Pipeline

## Evolution API — REMOVED

**CRITICAL**: Evolution API completely removed — violates WhatsApp ToS, risk of account ban.

## Current Flow

User exports WhatsApp chat (.txt) → email to `import@import.aica.guru` OR web upload → `ingest-whatsapp-export` → `extract-intent` → dossier/threads/entities

## Privacy Rules

- Raw text NEVER stored, only `intent_summary` (100 chars max)
- All Gemini calls use ONLY `intent_summary` fields, never raw text
- Tables: `whatsapp_messages`, `contact_network`, `whatsapp_file_imports`, `email_import_log`

## Conversation Intelligence (4 Phases)

### Phase 1 — Contact Dossier
- Edge Function: `build-contact-dossier` (batch up to 20 or single on-demand)
- RPCs: `get_contacts_needing_dossier_update`, `get_contact_intent_summaries`, `update_contact_dossier`, `get_contact_dossier`
- Frontend: `useContactDossier` hook, `ContactDossierCard` component

### Phase 2 — Conversation Threading
- Edge Function: `build-conversation-threads`
- 30-min gap session grouping
- Table: `conversation_threads` (summary, topic, decisions[], action_items[], sentiment_arc)
- Frontend: `useConversationThreads` hook, `ConversationTimeline`

### Phase 3 — Entity Extraction
- Edge Function: `route-entities-to-modules`
- Table: `whatsapp_extracted_entities` (entity_type, routing_status, routed_to_module)
- Frontend: `useExtractedEntities` hook, `EntityInbox` component (accept/reject)

### Phase 4 — Group Intelligence
- Table: `whatsapp_group_participants` (per-participant activity, inferred_role)
- Frontend: `GroupAnalyticsCard` component

## Integration Point

`ConnectionsWhatsAppTab.tsx` — Contacts tab shows dossier + group analytics + timeline; Overview tab shows EntityInbox.

## Troubleshooting

### Webhook not updating status
- Evolution API does NOT send HMAC signatures (confirmed)
- Event names normalized: `CONNECTION_UPDATE` → `connection.update`

### Real-time lag
- Check Supabase Dashboard → Database → Replication
- Enable replication for `whatsapp_sessions` table
- Verify `useWhatsAppSessionSubscription()` hook active
